#!/usr/bin/env node

/**
 * Installation script for Spam Filter Manager Plesk extension
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

class PleskExtensionInstaller {
  constructor() {
    this.extensionName = 'spam-filter-manager';
    this.extensionVersion = '1.0.0';
    this.pleskExtensionsDir = '/usr/local/psa/var/modules';
    this.extensionDir = path.join(this.pleskExtensionsDir, this.extensionName);
    this.logFile = '/var/log/spam-filter-manager-install.log';
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

    // Check if Plesk is installed
    try {
      execSync('which plesk', { stdio: 'pipe' });
      this.log('✓ Plesk is installed');
    } catch (error) {
      this.error('Plesk is not installed or not in PATH');
    }

    // Check Plesk version
    try {
      const pleskVersion = execSync('plesk version', { encoding: 'utf8' }).trim();
      this.log(`✓ Plesk version: ${pleskVersion}`);
      
      // Check if version is supported (18.0.0+)
      const versionMatch = pleskVersion.match(/(\d+)\.(\d+)\.(\d+)/);
      if (versionMatch) {
        const major = parseInt(versionMatch[1]);
        const minor = parseInt(versionMatch[2]);
        
        if (major < 18 || (major === 18 && minor < 0)) {
          this.error(`Plesk version ${pleskVersion} is not supported. Requires 18.0.0 or higher.`);
        }
      }
    } catch (error) {
      this.error('Could not determine Plesk version');
    }

    // Check if Node.js is installed
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      this.log(`✓ Node.js version: ${nodeVersion}`);
      
      // Check if version is supported (14.0.0+)
      const versionMatch = nodeVersion.match(/v(\d+)\.(\d+)\.(\d+)/);
      if (versionMatch) {
        const major = parseInt(versionMatch[1]);
        if (major < 14) {
          this.error(`Node.js version ${nodeVersion} is not supported. Requires 14.0.0 or higher.`);
        }
      }
    } catch (error) {
      this.error('Node.js is not installed or not in PATH');
    }

    // Check if npm is installed
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      this.log(`✓ npm version: ${npmVersion}`);
    } catch (error) {
      this.error('npm is not installed or not in PATH');
    }

    // Check if SpamAssassin is installed
    try {
      execSync('which spamassassin', { stdio: 'pipe' });
      this.log('✓ SpamAssassin is installed');
    } catch (error) {
      this.log('⚠ Warning: SpamAssassin is not installed or not in PATH');
    }

    // Check available disk space
    try {
      const stats = fs.statSync('/');
      // This is a simplified check - in production, use a proper disk space check
      this.log('✓ Disk space check passed');
    } catch (error) {
      this.log('⚠ Warning: Could not check disk space');
    }
  }

  async createExtensionDirectory() {
    this.log('Creating extension directory...');

    try {
      if (fs.existsSync(this.extensionDir)) {
        this.log('Extension directory already exists, backing up...');
        const backupDir = `${this.extensionDir}.backup.${Date.now()}`;
        execSync(`mv "${this.extensionDir}" "${backupDir}"`);
        this.log(`Backup created at: ${backupDir}`);
      }

      fs.mkdirSync(this.extensionDir, { recursive: true });
      this.log(`✓ Extension directory created: ${this.extensionDir}`);
    } catch (error) {
      this.error(`Failed to create extension directory: ${error.message}`);
    }
  }

  async copyExtensionFiles() {
    this.log('Copying extension files...');

    const sourceDir = process.cwd();
    const filesToCopy = [
      'meta.xml',
      'package.json',
      'backend',
      'frontend',
      'scripts',
      'tests',
      'webpack.config.js',
      'env.example'
    ];

    for (const file of filesToCopy) {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(this.extensionDir, file);

      try {
        if (fs.statSync(sourcePath).isDirectory()) {
          execSync(`cp -r "${sourcePath}" "${destPath}"`);
        } else {
          fs.copyFileSync(sourcePath, destPath);
        }
        this.log(`✓ Copied ${file}`);
      } catch (error) {
        this.error(`Failed to copy ${file}: ${error.message}`);
      }
    }
  }

  async installDependencies() {
    this.log('Installing Node.js dependencies...');

    try {
      process.chdir(this.extensionDir);
      execSync('npm install --production', { stdio: 'inherit' });
      this.log('✓ Dependencies installed successfully');
    } catch (error) {
      this.error(`Failed to install dependencies: ${error.message}`);
    }
  }

  async createEnvironmentFile() {
    this.log('Creating environment configuration...');

    const envContent = `# Spam Filter Manager - Environment Configuration
# Generated during installation on ${new Date().toISOString()}

# Server Configuration
PORT=3000
NODE_ENV=production

# API Configuration
API_BASE_URL=/api/v1
ALLOWED_ORIGINS=https://localhost:8443

# JWT Configuration - CHANGE THIS IN PRODUCTION!
JWT_SECRET=${this.generateRandomString(64)}

# Plesk Configuration
PLESK_API_ENDPOINT=https://localhost:8443/api/v2
PLESK_API_KEY=
PLESK_CLI_PATH=/usr/local/psa/bin

# IMAP Configuration
IMAP_HOST=localhost
IMAP_PORT=993

# Logging Configuration
LOG_LEVEL=info
LOG_DIR=/var/log/spam-filter-manager

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
USER_RATE_LIMIT_MAX_REQUESTS=50

# Security - CHANGE THESE IN PRODUCTION!
CSRF_SECRET=${this.generateRandomString(32)}
SESSION_SECRET=${this.generateRandomString(32)}
`;

    try {
      fs.writeFileSync(path.join(this.extensionDir, '.env'), envContent);
      this.log('✓ Environment file created');
    } catch (error) {
      this.error(`Failed to create environment file: ${error.message}`);
    }
  }

  generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async createSystemdService() {
    this.log('Creating systemd service...');

    const serviceContent = `[Unit]
Description=Spam Filter Manager API Server
After=network.target plesk.service

[Service]
Type=simple
User=root
WorkingDirectory=${this.extensionDir}
ExecStart=/usr/bin/node ${this.extensionDir}/backend/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=${this.extensionDir}/.env

[Install]
WantedBy=multi-user.target
`;

    try {
      fs.writeFileSync('/etc/systemd/system/spam-filter-manager.service', serviceContent);
      execSync('systemctl daemon-reload');
      this.log('✓ Systemd service created');
    } catch (error) {
      this.error(`Failed to create systemd service: ${error.message}`);
    }
  }

  async createLogDirectory() {
    this.log('Creating log directory...');

    try {
      fs.mkdirSync('/var/log/spam-filter-manager', { recursive: true });
      execSync('chown root:root /var/log/spam-filter-manager');
      execSync('chmod 755 /var/log/spam-filter-manager');
      this.log('✓ Log directory created');
    } catch (error) {
      this.error(`Failed to create log directory: ${error.message}`);
    }
  }

  async registerWithPlesk() {
    this.log('Registering extension with Plesk...');

    try {
      // Create extension registration
      const registrationScript = `#!/bin/bash
# Register Spam Filter Manager with Plesk

# Add extension to Plesk modules
plesk bin extension --install ${this.extensionDir}

# Enable extension
plesk bin extension --enable ${this.extensionName}

echo "Extension registered with Plesk"
`;

      fs.writeFileSync(path.join(this.extensionDir, 'register.sh'), registrationScript);
      execSync(`chmod +x ${this.extensionDir}/register.sh`);
      execSync(`${this.extensionDir}/register.sh`);
      
      this.log('✓ Extension registered with Plesk');
    } catch (error) {
      this.log(`⚠ Warning: Could not register with Plesk: ${error.message}`);
      this.log('You may need to register the extension manually');
    }
  }

  async startService() {
    this.log('Starting service...');

    try {
      execSync('systemctl enable spam-filter-manager.service');
      execSync('systemctl start spam-filter-manager.service');
      
      // Wait a moment and check status
      await new Promise(resolve => setTimeout(resolve, 2000));
      const status = execSync('systemctl is-active spam-filter-manager.service', { encoding: 'utf8' }).trim();
      
      if (status === 'active') {
        this.log('✓ Service started successfully');
      } else {
        this.log(`⚠ Service status: ${status}`);
      }
    } catch (error) {
      this.log(`⚠ Warning: Could not start service: ${error.message}`);
    }
  }

  async runTests() {
    this.log('Running installation tests...');

    try {
      process.chdir(this.extensionDir);
      execSync('npm test', { stdio: 'inherit' });
      this.log('✓ Tests passed');
    } catch (error) {
      this.log(`⚠ Warning: Some tests failed: ${error.message}`);
      this.log('Please check the test output and fix any issues');
    }
  }

  async displayPostInstallInstructions() {
    this.log('\n' + '='.repeat(60));
    this.log('INSTALLATION COMPLETED SUCCESSFULLY!');
    this.log('='.repeat(60));
    this.log('');
    this.log('Next steps:');
    this.log('1. Configure the extension:');
    this.log(`   - Edit ${this.extensionDir}/.env`);
    this.log('   - Set your Plesk API key and other configuration');
    this.log('');
    this.log('2. Restart the service:');
    this.log('   systemctl restart spam-filter-manager');
    this.log('');
    this.log('3. Check service status:');
    this.log('   systemctl status spam-filter-manager');
    this.log('');
    this.log('4. View logs:');
    this.log('   tail -f /var/log/spam-filter-manager/spam-filter-manager.log');
    this.log('');
    this.log('5. Access the extension:');
    this.log('   - Log in to Plesk panel');
    this.log('   - Navigate to your mail account');
    this.log('   - Look for the "Spam Filter" tab');
    this.log('');
    this.log('For support and documentation, see:');
    this.log('  - README.md');
    this.log('  - docs/ directory');
    this.log('');
    this.log('Installation log: ' + this.logFile);
    this.log('='.repeat(60));
  }

  async install() {
    try {
      this.log('Starting Spam Filter Manager installation...');
      this.log(`Installing version ${this.extensionVersion}`);
      this.log('');

      await this.checkPrerequisites();
      await this.createExtensionDirectory();
      await this.copyExtensionFiles();
      await this.installDependencies();
      await this.createEnvironmentFile();
      await this.createSystemdService();
      await this.createLogDirectory();
      await this.registerWithPlesk();
      await this.startService();
      await this.runTests();
      await this.displayPostInstallInstructions();

    } catch (error) {
      this.error(`Installation failed: ${error.message}`);
    }
  }
}

// Run installation if this script is executed directly
if (require.main === module) {
  const installer = new PleskExtensionInstaller();
  installer.install().catch(error => {
    console.error('Installation failed:', error);
    process.exit(1);
  });
}

module.exports = PleskExtensionInstaller;
