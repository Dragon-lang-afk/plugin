#!/usr/bin/env node

/**
 * Packaging script for Spam Filter Manager Plesk extension
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

class PleskExtensionPackager {
  constructor() {
    this.extensionName = 'spam-filter-manager';
    this.extensionVersion = '1.0.0';
    this.buildDir = 'dist';
    this.packageDir = 'packages';
    this.sourceDir = process.cwd();
  }

  log(message) {
    console.log(`[PACKAGE] ${message}`);
  }

  error(message) {
    this.log(`ERROR: ${message}`);
    process.exit(1);
  }

  async cleanBuildDirectory() {
    this.log('Cleaning build directory...');

    try {
      if (fs.existsSync(this.buildDir)) {
        fs.rmSync(this.buildDir, { recursive: true, force: true });
      }
      fs.mkdirSync(this.buildDir, { recursive: true });
      this.log('✓ Build directory cleaned');
    } catch (error) {
      this.error(`Failed to clean build directory: ${error.message}`);
    }
  }

  async copySourceFiles() {
    this.log('Copying source files...');

    const filesToCopy = [
      'meta.xml',
      'package.json',
      'backend',
      'frontend',
      'scripts',
      'tests',
      'webpack.config.js',
      'env.example',
      'README.md',
      'LICENSE'
    ];

    for (const file of filesToCopy) {
      const sourcePath = path.join(this.sourceDir, file);
      const destPath = path.join(this.buildDir, file);

      try {
        if (fs.existsSync(sourcePath)) {
          if (fs.statSync(sourcePath).isDirectory()) {
            execSync(`cp -r "${sourcePath}" "${destPath}"`);
          } else {
            fs.copyFileSync(sourcePath, destPath);
          }
          this.log(`✓ Copied ${file}`);
        } else {
          this.log(`⚠ Skipped ${file} (not found)`);
        }
      } catch (error) {
        this.log(`⚠ Warning: Could not copy ${file}: ${error.message}`);
      }
    }
  }

  async buildFrontend() {
    this.log('Building frontend assets...');

    try {
      // Install dependencies if needed
      if (!fs.existsSync('node_modules')) {
        this.log('Installing dependencies...');
        execSync('npm install', { stdio: 'inherit' });
      }

      // Build frontend
      execSync('npm run build', { stdio: 'inherit' });
      this.log('✓ Frontend built successfully');
    } catch (error) {
      this.log(`⚠ Warning: Frontend build failed: ${error.message}`);
      this.log('Continuing with source files...');
    }
  }

  async createInstallationScript() {
    this.log('Creating installation script...');

    const installScript = `#!/bin/bash
# Spam Filter Manager - Installation Script
# Version: ${this.extensionVersion}

set -e

echo "Installing Spam Filter Manager ${this.extensionVersion}..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 14+ first."
    exit 1
fi

# Check if Plesk is installed
if ! command -v plesk &> /dev/null; then
    echo "Plesk is not installed. This extension requires Plesk."
    exit 1
fi

# Run the Node.js installer
node scripts/install.js

echo "Installation completed successfully!"
echo "Please configure the extension in /usr/local/psa/var/modules/${this.extensionName}/.env"
`;

    try {
      fs.writeFileSync(path.join(this.buildDir, 'install.sh'), installScript);
      execSync(`chmod +x ${path.join(this.buildDir, 'install.sh')}`);
      this.log('✓ Installation script created');
    } catch (error) {
      this.error(`Failed to create installation script: ${error.message}`);
    }
  }

  async createUninstallationScript() {
    this.log('Creating uninstallation script...');

    const uninstallScript = `#!/bin/bash
# Spam Filter Manager - Uninstallation Script
# Version: ${this.extensionVersion}

set -e

echo "Uninstalling Spam Filter Manager ${this.extensionVersion}..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root"
    exit 1
fi

# Run the Node.js uninstaller
node scripts/uninstall.js

echo "Uninstallation completed successfully!"
`;

    try {
      fs.writeFileSync(path.join(this.buildDir, 'uninstall.sh'), uninstallScript);
      execSync(`chmod +x ${path.join(this.buildDir, 'uninstall.sh')}`);
      this.log('✓ Uninstallation script created');
    } catch (error) {
      this.error(`Failed to create uninstallation script: ${error.message}`);
    }
  }

  async createPackageInfo() {
    this.log('Creating package information...');

    const packageInfo = {
      name: this.extensionName,
      version: this.extensionVersion,
      description: 'Plesk extension for managing SpamAssassin whitelist/blacklist',
      author: 'Custom Development',
      license: 'MIT',
      pleskVersion: '18.0.0+',
      nodeVersion: '14.0.0+',
      dependencies: {
        node: '14.0.0+',
        plesk: '18.0.0+',
        spamassassin: '3.4.0+'
      },
      files: [
        'meta.xml',
        'package.json',
        'backend/',
        'frontend/',
        'scripts/',
        'tests/',
        'install.sh',
        'uninstall.sh',
        'README.md',
        'LICENSE'
      ],
      installation: {
        requirements: [
          'Plesk 18.0.0 or higher',
          'Node.js 14.0.0 or higher',
          'SpamAssassin 3.4.0 or higher',
          'Root access for installation'
        ],
        steps: [
          'Extract the package',
          'Run ./install.sh as root',
          'Configure the extension',
          'Restart the service'
        ]
      },
      support: {
        documentation: 'README.md',
        issues: 'https://github.com/your-repo/spam-filter-manager/issues',
        email: 'support@example.com'
      }
    };

    try {
      fs.writeFileSync(
        path.join(this.buildDir, 'package-info.json'),
        JSON.stringify(packageInfo, null, 2)
      );
      this.log('✓ Package information created');
    } catch (error) {
      this.error(`Failed to create package information: ${error.message}`);
    }
  }

  async createZipPackage() {
    this.log('Creating ZIP package...');

    try {
      if (!fs.existsSync(this.packageDir)) {
        fs.mkdirSync(this.packageDir, { recursive: true });
      }

      const zipPath = path.join(this.packageDir, `${this.extensionName}-${this.extensionVersion}.zip`);
      
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      return new Promise((resolve, reject) => {
        output.on('close', () => {
          this.log(`✓ ZIP package created: ${zipPath}`);
          this.log(`  Size: ${archive.pointer()} bytes`);
          resolve();
        });

        archive.on('error', (err) => {
          reject(err);
        });

        archive.pipe(output);
        archive.directory(this.buildDir, false);
        archive.finalize();
      });
    } catch (error) {
      this.error(`Failed to create ZIP package: ${error.message}`);
    }
  }

  async createTarPackage() {
    this.log('Creating TAR package...');

    try {
      const tarPath = path.join(this.packageDir, `${this.extensionName}-${this.extensionVersion}.tar.gz`);
      
      execSync(`tar -czf "${tarPath}" -C "${this.buildDir}" .`);
      
      const stats = fs.statSync(tarPath);
      this.log(`✓ TAR package created: ${tarPath}`);
      this.log(`  Size: ${stats.size} bytes`);
    } catch (error) {
      this.error(`Failed to create TAR package: ${error.message}`);
    }
  }

  async runTests() {
    this.log('Running tests...');

    try {
      execSync('npm test', { stdio: 'inherit' });
      this.log('✓ Tests passed');
    } catch (error) {
      this.log(`⚠ Warning: Some tests failed: ${error.message}`);
      this.log('Package will still be created, but please fix test issues');
    }
  }

  async createChecksums() {
    this.log('Creating checksums...');

    try {
      const checksumFile = path.join(this.packageDir, 'checksums.txt');
      let checksums = `# Spam Filter Manager ${this.extensionVersion} - Checksums\n`;
      checksums += `# Generated on ${new Date().toISOString()}\n\n`;

      const files = fs.readdirSync(this.packageDir);
      for (const file of files) {
        if (file.endsWith('.zip') || file.endsWith('.tar.gz')) {
          const filePath = path.join(this.packageDir, file);
          const hash = execSync(`sha256sum "${filePath}"`, { encoding: 'utf8' }).trim();
          checksums += `${hash}\n`;
        }
      }

      fs.writeFileSync(checksumFile, checksums);
      this.log('✓ Checksums created');
    } catch (error) {
      this.log(`⚠ Warning: Could not create checksums: ${error.message}`);
    }
  }

  async displayPackageInfo() {
    this.log('\n' + '='.repeat(60));
    this.log('PACKAGING COMPLETED!');
    this.log('='.repeat(60));
    this.log('');
    this.log('Packages created:');
    
    if (fs.existsSync(this.packageDir)) {
      const files = fs.readdirSync(this.packageDir);
      for (const file of files) {
        if (file.endsWith('.zip') || file.endsWith('.tar.gz')) {
          const filePath = path.join(this.packageDir, file);
          const stats = fs.statSync(filePath);
          this.log(`  - ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        }
      }
    }
    
    this.log('');
    this.log('Installation:');
    this.log('  1. Extract the package');
    this.log('  2. Run ./install.sh as root');
    this.log('  3. Configure the extension');
    this.log('');
    this.log('Package directory: ' + path.resolve(this.packageDir));
    this.log('='.repeat(60));
  }

  async package() {
    try {
      this.log('Starting packaging process...');
      this.log(`Creating package for ${this.extensionName} v${this.extensionVersion}`);
      this.log('');

      await this.cleanBuildDirectory();
      await this.copySourceFiles();
      await this.buildFrontend();
      await this.createInstallationScript();
      await this.createUninstallationScript();
      await this.createPackageInfo();
      await this.runTests();
      await this.createZipPackage();
      await this.createTarPackage();
      await this.createChecksums();
      await this.displayPackageInfo();

    } catch (error) {
      this.error(`Packaging failed: ${error.message}`);
    }
  }
}

// Run packaging if this script is executed directly
if (require.main === module) {
  const packager = new PleskExtensionPackager();
  packager.package().catch(error => {
    console.error('Packaging failed:', error);
    process.exit(1);
  });
}

module.exports = PleskExtensionPackager;
