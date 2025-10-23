#!/usr/bin/env node

/**
 * Uninstallation script for Spam Filter Manager Plesk extension
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PleskExtensionUninstaller {
  constructor() {
    this.extensionName = 'spam-filter-manager';
    this.pleskExtensionsDir = '/usr/local/psa/var/modules';
    this.extensionDir = path.join(this.pleskExtensionsDir, this.extensionName);
    this.logFile = '/var/log/spam-filter-manager-uninstall.log';
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    
    try {
      fs.appendFileSync(this.logFile, logMessage);
    } catch (error) {
      console.warn(`Warning: Could not write to log file: ${error.message}`);
    }
  }

  error(message) {
    this.log(`ERROR: ${message}`);
    process.exit(1);
  }

  async checkPrerequisites() {
    this.log('Checking prerequisites...');

    // Check if running as root
    if (process.getuid() !== 0) {
      this.error('This script must be run as root');
    }

    // Check if extension is installed
    if (!fs.existsSync(this.extensionDir)) {
      this.log('Extension is not installed or already removed');
      return false;
    }

    this.log('✓ Extension found');
    return true;
  }

  async stopService() {
    this.log('Stopping service...');

    try {
      execSync('systemctl stop spam-filter-manager.service', { stdio: 'pipe' });
      this.log('✓ Service stopped');
    } catch (error) {
      this.log(`⚠ Warning: Could not stop service: ${error.message}`);
    }
  }

  async disableService() {
    this.log('Disabling service...');

    try {
      execSync('systemctl disable spam-filter-manager.service', { stdio: 'pipe' });
      this.log('✓ Service disabled');
    } catch (error) {
      this.log(`⚠ Warning: Could not disable service: ${error.message}`);
    }
  }

  async removeSystemdService() {
    this.log('Removing systemd service...');

    try {
      if (fs.existsSync('/etc/systemd/system/spam-filter-manager.service')) {
        fs.unlinkSync('/etc/systemd/system/spam-filter-manager.service');
        execSync('systemctl daemon-reload');
        this.log('✓ Systemd service removed');
      } else {
        this.log('✓ Systemd service not found (already removed)');
      }
    } catch (error) {
      this.log(`⚠ Warning: Could not remove systemd service: ${error.message}`);
    }
  }

  async unregisterFromPlesk() {
    this.log('Unregistering extension from Plesk...');

    try {
      // Try to unregister extension
      execSync(`plesk bin extension --disable ${this.extensionName}`, { stdio: 'pipe' });
      execSync(`plesk bin extension --uninstall ${this.extensionName}`, { stdio: 'pipe' });
      this.log('✓ Extension unregistered from Plesk');
    } catch (error) {
      this.log(`⚠ Warning: Could not unregister from Plesk: ${error.message}`);
      this.log('You may need to unregister the extension manually from Plesk panel');
    }
  }

  async backupData() {
    this.log('Creating backup of extension data...');

    try {
      const backupDir = `/var/backups/spam-filter-manager-${Date.now()}`;
      fs.mkdirSync(backupDir, { recursive: true });

      // Backup configuration
      if (fs.existsSync(path.join(this.extensionDir, '.env'))) {
        fs.copyFileSync(
          path.join(this.extensionDir, '.env'),
          path.join(backupDir, 'env.backup')
        );
      }

      // Backup logs
      if (fs.existsSync('/var/log/spam-filter-manager')) {
        execSync(`cp -r /var/log/spam-filter-manager ${backupDir}/logs`);
      }

      this.log(`✓ Backup created at: ${backupDir}`);
    } catch (error) {
      this.log(`⚠ Warning: Could not create backup: ${error.message}`);
    }
  }

  async removeExtensionFiles() {
    this.log('Removing extension files...');

    try {
      if (fs.existsSync(this.extensionDir)) {
        execSync(`rm -rf "${this.extensionDir}"`);
        this.log('✓ Extension files removed');
      } else {
        this.log('✓ Extension files not found (already removed)');
      }
    } catch (error) {
      this.error(`Failed to remove extension files: ${error.message}`);
    }
  }

  async removeLogs() {
    this.log('Removing log files...');

    try {
      if (fs.existsSync('/var/log/spam-filter-manager')) {
        execSync('rm -rf /var/log/spam-filter-manager');
        this.log('✓ Log files removed');
      } else {
        this.log('✓ Log files not found (already removed)');
      }
    } catch (error) {
      this.log(`⚠ Warning: Could not remove log files: ${error.message}`);
    }
  }

  async cleanupCronJobs() {
    this.log('Cleaning up cron jobs...');

    try {
      // Remove any cron jobs related to the extension
      execSync('crontab -l | grep -v spam-filter-manager | crontab -', { stdio: 'pipe' });
      this.log('✓ Cron jobs cleaned up');
    } catch (error) {
      this.log(`⚠ Warning: Could not clean up cron jobs: ${error.message}`);
    }
  }

  async displayPostUninstallInstructions() {
    this.log('\n' + '='.repeat(60));
    this.log('UNINSTALLATION COMPLETED!');
    this.log('='.repeat(60));
    this.log('');
    this.log('The Spam Filter Manager extension has been removed.');
    this.log('');
    this.log('What was removed:');
    this.log(`- Extension files: ${this.extensionDir}`);
    this.log('- Systemd service: spam-filter-manager.service');
    this.log('- Log files: /var/log/spam-filter-manager');
    this.log('- Plesk extension registration');
    this.log('');
    this.log('What was preserved:');
    this.log('- SpamAssassin configuration (unchanged)');
    this.log('- Mail server configuration (unchanged)');
    this.log('- Backup created in /var/backups/ (if available)');
    this.log('');
    this.log('If you want to completely remove all traces:');
    this.log('1. Remove backup directory: rm -rf /var/backups/spam-filter-manager-*');
    this.log('2. Check for any remaining references in Plesk configuration');
    this.log('3. Restart Plesk services if needed');
    this.log('');
    this.log('Uninstallation log: ' + this.logFile);
    this.log('='.repeat(60));
  }

  async uninstall() {
    try {
      this.log('Starting Spam Filter Manager uninstallation...');
      this.log('');

      const isInstalled = await this.checkPrerequisites();
      if (!isInstalled) {
        this.log('Extension is not installed. Nothing to uninstall.');
        return;
      }

      await this.stopService();
      await this.disableService();
      await this.removeSystemdService();
      await this.unregisterFromPlesk();
      await this.backupData();
      await this.removeExtensionFiles();
      await this.removeLogs();
      await this.cleanupCronJobs();
      await this.displayPostUninstallInstructions();

    } catch (error) {
      this.error(`Uninstallation failed: ${error.message}`);
    }
  }
}

// Run uninstallation if this script is executed directly
if (require.main === module) {
  const uninstaller = new PleskExtensionUninstaller();
  uninstaller.uninstall().catch(error => {
    console.error('Uninstallation failed:', error);
    process.exit(1);
  });
}

module.exports = PleskExtensionUninstaller;
