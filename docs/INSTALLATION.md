# Installation Guide - Spam Filter Manager

This guide provides detailed installation instructions for the Spam Filter Manager Plesk extension.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
- [Post-Installation Configuration](#post-installation-configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Uninstallation](#uninstallation)

## Prerequisites

### System Requirements

- **Operating System**: Linux (CentOS 7+, Ubuntu 18.04+, Debian 9+)
- **Plesk**: Version 18.0.0 or higher
- **Node.js**: Version 14.0.0 or higher
- **SpamAssassin**: Version 3.4.0 or higher
- **Memory**: Minimum 512MB RAM
- **Disk Space**: Minimum 100MB free space
- **Permissions**: Root access required for installation

### Verify Prerequisites

Before installation, verify that your system meets all requirements:

```bash
# Check Plesk version
plesk version

# Check Node.js version
node --version

# Check SpamAssassin version
spamassassin --version

# Check available disk space
df -h

# Check available memory
free -h
```

## Installation Methods

### Method 1: Automated Installation (Recommended)

1. **Download the package**:
   ```bash
   cd /tmp
   wget https://github.com/your-repo/spam-filter-manager/releases/latest/download/spam-filter-manager-1.0.0.zip
   ```

2. **Extract the package**:
   ```bash
   unzip spam-filter-manager-1.0.0.zip
   cd spam-filter-manager-1.0.0
   ```

3. **Run the installation script**:
   ```bash
   sudo ./install.sh
   ```

The installation script will:
- Check system prerequisites
- Create necessary directories
- Copy extension files
- Install Node.js dependencies
- Create systemd service
- Register with Plesk
- Start the service

### Method 2: Manual Installation

If you prefer manual installation or need to customize the process:

1. **Create extension directory**:
   ```bash
   sudo mkdir -p /usr/local/psa/var/modules/spam-filter-manager
   sudo chown root:root /usr/local/psa/var/modules/spam-filter-manager
   sudo chmod 755 /usr/local/psa/var/modules/spam-filter-manager
   ```

2. **Copy extension files**:
   ```bash
   sudo cp -r * /usr/local/psa/var/modules/spam-filter-manager/
   ```

3. **Install dependencies**:
   ```bash
   cd /usr/local/psa/var/modules/spam-filter-manager
   sudo npm install --production
   ```

4. **Create environment file**:
   ```bash
   sudo cp env.example .env
   sudo nano .env
   ```

5. **Create systemd service**:
   ```bash
   sudo cp scripts/spam-filter-manager.service /etc/systemd/system/
   sudo systemctl daemon-reload
   ```

6. **Start the service**:
   ```bash
   sudo systemctl enable spam-filter-manager
   sudo systemctl start spam-filter-manager
   ```

### Method 3: Docker Installation

For containerized environments:

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:14-alpine
   WORKDIR /app
   COPY . .
   RUN npm install --production
   EXPOSE 3000
   CMD ["node", "backend/server.js"]
   ```

2. **Build and run**:
   ```bash
   docker build -t spam-filter-manager .
   docker run -d --name spam-filter-manager -p 3000:3000 spam-filter-manager
   ```

## Post-Installation Configuration

### 1. Configure Environment Variables

Edit the environment configuration file:

```bash
sudo nano /usr/local/psa/var/modules/spam-filter-manager/.env
```

Key configuration options:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# API Configuration
API_BASE_URL=/api/v1
ALLOWED_ORIGINS=https://localhost:8443,https://your-domain.com

# JWT Configuration (IMPORTANT: Change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this

# Plesk Configuration
PLESK_API_ENDPOINT=https://localhost:8443/api/v2
PLESK_API_KEY=your-plesk-api-key
PLESK_CLI_PATH=/usr/local/psa/bin

# IMAP Configuration
IMAP_HOST=localhost
IMAP_PORT=993

# Logging Configuration
LOG_LEVEL=info
LOG_DIR=/var/log/spam-filter-manager
```

### 2. Configure Plesk API Key

1. **Generate API Key**:
   - Log in to Plesk panel as administrator
   - Navigate to Tools & Settings → API Keys
   - Click "Create API Key"
   - Set appropriate permissions:
     - Mail management
     - SpamAssassin configuration
     - User session verification

2. **Update configuration**:
   ```bash
   sudo nano /usr/local/psa/var/modules/spam-filter-manager/.env
   # Set PLESK_API_KEY=your-generated-key
   ```

### 3. Configure SpamAssassin Integration

The extension needs to integrate with SpamAssassin. Verify the following:

1. **SpamAssassin is running**:
   ```bash
   systemctl status spamassassin
   ```

2. **Plesk CLI is accessible**:
   ```bash
   /usr/local/psa/bin/plesk version
   ```

3. **Test SpamAssassin integration**:
   ```bash
   cd /usr/local/psa/var/modules/spam-filter-manager
   node -e "const adapter = require('./backend/adapters/plesk'); adapter.initialize().then(() => console.log('Integration test passed')).catch(console.error)"
   ```

### 4. Configure Firewall (if needed)

If you have a firewall enabled, allow the extension port:

```bash
# For UFW (Ubuntu/Debian)
sudo ufw allow 3000

# For firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# For iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

### 5. Configure Log Rotation

Set up log rotation to prevent log files from growing too large:

```bash
sudo nano /etc/logrotate.d/spam-filter-manager
```

Add the following content:

```
/var/log/spam-filter-manager/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        systemctl reload spam-filter-manager
    endscript
}
```

## Verification

### 1. Check Service Status

```bash
sudo systemctl status spam-filter-manager
```

Expected output:
```
● spam-filter-manager.service - Spam Filter Manager API Server
   Loaded: loaded (/etc/systemd/system/spam-filter-manager.service; enabled; vendor preset: disabled)
   Active: active (running) since [timestamp]
   Main PID: [pid] (node)
   Tasks: [number] (limit: [limit])
   Memory: [memory usage]
   CGroup: /system.slice/spam-filter-manager.service
           └─[pid] /usr/bin/node /usr/local/psa/var/modules/spam-filter-manager/backend/server.js
```

### 2. Check Logs

```bash
# Application logs
sudo tail -f /var/log/spam-filter-manager/spam-filter-manager.log

# Error logs
sudo tail -f /var/log/spam-filter-manager/error.log

# Audit logs
sudo tail -f /var/log/spam-filter-manager/audit.log
```

### 3. Test API Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Test authentication (replace with actual credentials)
curl -X POST http://localhost:3000/api/v1/auth/verify-mailbox \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","mailbox":"test@example.com"}'
```

### 4. Test Plesk Integration

1. **Log in to Plesk panel**
2. **Navigate to a mail account**
3. **Look for the "Spam Filter" tab**
4. **Test adding/removing entries**

### 5. Test SpamAssassin Integration

```bash
# Test adding a whitelist entry
curl -X POST http://localhost:3000/api/v1/spam-rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"mailbox":"test@example.com","listType":"whitelist","entry":"test@example.com"}'

# Verify the entry was added to SpamAssassin
sudo -u spamd /usr/bin/spamassassin -D -c /etc/mail/spamassassin/local.cf
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

**Symptoms**: Service fails to start or crashes immediately

**Solutions**:
```bash
# Check service status
sudo systemctl status spam-filter-manager

# Check logs
sudo journalctl -u spam-filter-manager -f

# Check configuration
sudo node -c /usr/local/psa/var/modules/spam-filter-manager/backend/server.js

# Check dependencies
cd /usr/local/psa/var/modules/spam-filter-manager
npm list
```

#### 2. Permission Denied Errors

**Symptoms**: Permission denied when accessing files or directories

**Solutions**:
```bash
# Fix ownership
sudo chown -R root:root /usr/local/psa/var/modules/spam-filter-manager

# Fix permissions
sudo chmod -R 755 /usr/local/psa/var/modules/spam-filter-manager

# Fix log directory
sudo chown -R root:root /var/log/spam-filter-manager
sudo chmod -R 755 /var/log/spam-filter-manager
```

#### 3. API Connection Issues

**Symptoms**: Frontend can't connect to API

**Solutions**:
```bash
# Check if service is running
sudo systemctl status spam-filter-manager

# Check port binding
sudo netstat -tlnp | grep 3000

# Check firewall
sudo ufw status
sudo firewall-cmd --list-ports

# Test local connection
curl http://localhost:3000/health
```

#### 4. Plesk Integration Issues

**Symptoms**: Extension doesn't appear in Plesk panel

**Solutions**:
```bash
# Check Plesk extension registration
plesk bin extension --list

# Re-register extension
plesk bin extension --install /usr/local/psa/var/modules/spam-filter-manager

# Check Plesk logs
tail -f /usr/local/psa/admin/logs/panel.log
```

#### 5. SpamAssassin Integration Issues

**Symptoms**: Changes don't affect SpamAssassin behavior

**Solutions**:
```bash
# Check SpamAssassin status
systemctl status spamassassin

# Check Plesk CLI
/usr/local/psa/bin/plesk version

# Test SpamAssassin configuration
sudo -u spamd /usr/bin/spamassassin -D -c /etc/mail/spamassassin/local.cf

# Check SpamAssassin logs
tail -f /var/log/maillog | grep spamassassin
```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
sudo nano /usr/local/psa/var/modules/spam-filter-manager/.env
# Change LOG_LEVEL=debug
sudo systemctl restart spam-filter-manager
```

### Performance Issues

If the extension is slow or consuming too many resources:

```bash
# Check memory usage
ps aux | grep spam-filter-manager

# Check CPU usage
top -p $(pgrep -f spam-filter-manager)

# Check disk I/O
iotop -p $(pgrep -f spam-filter-manager)

# Optimize configuration
sudo nano /usr/local/psa/var/modules/spam-filter-manager/.env
# Adjust rate limiting and logging levels
```

## Uninstallation

### Automated Uninstallation

```bash
cd /usr/local/psa/var/modules/spam-filter-manager
sudo ./uninstall.sh
```

### Manual Uninstallation

1. **Stop the service**:
   ```bash
   sudo systemctl stop spam-filter-manager
   sudo systemctl disable spam-filter-manager
   ```

2. **Remove systemd service**:
   ```bash
   sudo rm /etc/systemd/system/spam-filter-manager.service
   sudo systemctl daemon-reload
   ```

3. **Unregister from Plesk**:
   ```bash
   plesk bin extension --disable spam-filter-manager
   plesk bin extension --uninstall spam-filter-manager
   ```

4. **Remove files**:
   ```bash
   sudo rm -rf /usr/local/psa/var/modules/spam-filter-manager
   sudo rm -rf /var/log/spam-filter-manager
   ```

5. **Clean up cron jobs** (if any):
   ```bash
   crontab -l | grep -v spam-filter-manager | crontab -
   ```

## Support

If you encounter issues not covered in this guide:

1. **Check the logs** for error messages
2. **Review the troubleshooting section** above
3. **Search the GitHub issues** for similar problems
4. **Create a new issue** with detailed information:
   - System information
   - Error messages
   - Steps to reproduce
   - Log files (sanitized)

## Security Considerations

- **Change default secrets** in production
- **Use HTTPS** for all communications
- **Regularly update** the extension
- **Monitor logs** for suspicious activity
- **Backup configuration** before changes
- **Test changes** in a staging environment first

---

For additional help, see the [User Guide](USER_GUIDE.md) and [Admin Guide](ADMIN_GUIDE.md).
