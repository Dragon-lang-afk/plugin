# Admin Guide - Spam Filter Manager

This guide provides comprehensive information for system administrators managing the Spam Filter Manager Plesk extension.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Security](#security)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)
- [Advanced Topics](#advanced-topics)

## Overview

### What is Spam Filter Manager?

The Spam Filter Manager is a Plesk extension that provides mail users with a web interface to manage their SpamAssassin whitelist and blacklist entries. It bridges the gap between end users and the technical SpamAssassin configuration.

### Key Features

- **User-friendly Interface**: Web-based interface for non-technical users
- **Security-First Design**: Strict ownership verification and input validation
- **Real-time Integration**: Direct integration with SpamAssassin
- **Audit Logging**: Comprehensive logging of all user actions
- **Rate Limiting**: Protection against abuse
- **Multi-authentication**: Support for both Plesk sessions and IMAP credentials

### System Requirements

- **Plesk**: 18.0.0 or higher
- **Node.js**: 14.0.0 or higher
- **SpamAssassin**: 3.4.0 or higher
- **Memory**: 512MB minimum, 1GB recommended
- **Disk Space**: 100MB minimum
- **Network**: HTTPS access to Plesk panel

## Architecture

### Component Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │  Plesk Adapter  │
│   (HTML/JS)     │◄──►│   (Node.js)      │◄──►│   (CLI/API)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   SpamAssassin   │
                       │   Configuration  │
                       └──────────────────┘
```

### File Structure

```
/usr/local/psa/var/modules/spam-filter-manager/
├── backend/                 # Backend API server
│   ├── server.js           # Main server file
│   ├── controllers/        # API controllers
│   ├── middleware/         # Authentication & security
│   ├── adapters/           # Plesk integration
│   └── utils/              # Utilities
├── frontend/               # Frontend assets
│   ├── index.html          # Main HTML file
│   ├── styles/             # CSS files
│   └── js/                 # JavaScript files
├── scripts/                # Installation scripts
├── tests/                  # Test files
├── meta.xml                # Plesk extension manifest
├── package.json            # Node.js dependencies
└── .env                    # Environment configuration
```

### Data Flow

1. **User Authentication**: User logs in via Plesk session or IMAP credentials
2. **Request Processing**: Frontend sends API requests to backend
3. **Authorization**: Backend verifies user ownership of mailbox
4. **SpamAssassin Integration**: Backend calls Plesk CLI/API to modify SpamAssassin
5. **Response**: Backend returns success/failure to frontend
6. **Audit Logging**: All actions are logged for security and debugging

## Configuration

### Environment Variables

The extension is configured through environment variables in `.env`:

```bash
# Server Configuration
PORT=3000                    # API server port
NODE_ENV=production          # Environment mode

# API Configuration
API_BASE_URL=/api/v1        # API base path
ALLOWED_ORIGINS=https://localhost:8443,https://your-domain.com

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key  # CHANGE IN PRODUCTION!

# Plesk Configuration
PLESK_API_ENDPOINT=https://localhost:8443/api/v2
PLESK_API_KEY=your-plesk-api-key
PLESK_CLI_PATH=/usr/local/psa/bin

# IMAP Configuration
IMAP_HOST=localhost
IMAP_PORT=993

# Logging Configuration
LOG_LEVEL=info              # debug, info, warn, error
LOG_DIR=/var/log/spam-filter-manager

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100 # Max requests per window
USER_RATE_LIMIT_MAX_REQUESTS=50  # Max requests per user per window

# Security
CSRF_SECRET=your-csrf-secret-key
SESSION_SECRET=your-session-secret-key
```

### Plesk API Configuration

1. **Generate API Key**:
   ```bash
   # In Plesk panel: Tools & Settings → API Keys
   # Or via CLI:
   plesk bin api_key --create -name "Spam Filter Manager" -ip 127.0.0.1
   ```

2. **Set Permissions**:
   - Mail management
   - SpamAssassin configuration
   - User session verification
   - Domain management (if needed)

3. **Test API Access**:
   ```bash
   curl -H "X-API-Key: your-key" https://localhost:8443/api/v2/domains
   ```

### SpamAssassin Configuration

The extension integrates with SpamAssassin through Plesk CLI commands:

```bash
# Get user spam settings
plesk bin spamassassin --get-user-settings -mailname user@domain.com

# Add whitelist entry
plesk bin spamassassin --add-whitelist -mailname user@domain.com -entry "friend@example.com"

# Add blacklist entry
plesk bin spamassassin --add-blacklist -mailname user@domain.com -entry "spam@bad.com"

# Remove whitelist entry
plesk bin spamassassin --remove-whitelist -mailname user@domain.com -entry "friend@example.com"

# Remove blacklist entry
plesk bin spamassassin --remove-blacklist -mailname user@domain.com -entry "spam@bad.com"
```

### Service Configuration

The extension runs as a systemd service:

```ini
# /etc/systemd/system/spam-filter-manager.service
[Unit]
Description=Spam Filter Manager API Server
After=network.target plesk.service

[Service]
Type=simple
User=root
WorkingDirectory=/usr/local/psa/var/modules/spam-filter-manager
ExecStart=/usr/bin/node backend/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/usr/local/psa/var/modules/spam-filter-manager/.env

[Install]
WantedBy=multi-user.target
```

## Security

### Authentication Methods

#### 1. Plesk Session Authentication (Recommended)

- Uses existing Plesk session tokens
- More secure and integrated
- Requires Plesk API access

#### 2. IMAP Credential Authentication (Fallback)

- Verifies mailbox ownership via IMAP
- Issues temporary JWT tokens
- Less secure but more compatible

### Security Measures

#### Input Validation

- **Email validation**: Strict regex patterns
- **Domain validation**: Proper domain format checking
- **IP validation**: IPv4 and IPv6 address validation
- **XSS protection**: HTML sanitization
- **Injection protection**: SQL injection prevention

#### Rate Limiting

- **Global rate limiting**: 100 requests per 15 minutes per IP
- **User rate limiting**: 50 requests per 15 minutes per user
- **Configurable limits**: Adjustable via environment variables

#### Audit Logging

All user actions are logged with:

- **User identification**: Email address and IP
- **Action details**: What was changed
- **Timestamp**: When the action occurred
- **Success/failure**: Whether the action succeeded
- **Security events**: Failed login attempts, suspicious activity

#### CSRF Protection

- **Token-based protection**: CSRF tokens for all state-changing operations
- **Origin validation**: Checks request origin
- **Session validation**: Verifies session integrity

### Security Best Practices

1. **Change default secrets**: Update JWT_SECRET, CSRF_SECRET, SESSION_SECRET
2. **Use HTTPS**: Ensure all communications are encrypted
3. **Regular updates**: Keep the extension updated
4. **Monitor logs**: Regularly review audit logs
5. **Access control**: Limit API key permissions
6. **Network security**: Use firewalls and VPNs when appropriate

## Monitoring

### Health Checks

#### Service Status

```bash
# Check service status
systemctl status spam-filter-manager

# Check if service is responding
curl http://localhost:3000/health

# Check service logs
journalctl -u spam-filter-manager -f
```

#### API Health

```bash
# Test API endpoints
curl -X GET http://localhost:3000/api/v1/spam-rules?mailbox=test@example.com \
  -H "Authorization: Bearer your-token"
```

### Log Monitoring

#### Log Files

- **Application logs**: `/var/log/spam-filter-manager/spam-filter-manager.log`
- **Error logs**: `/var/log/spam-filter-manager/error.log`
- **Audit logs**: `/var/log/spam-filter-manager/audit.log`

#### Log Analysis

```bash
# Monitor real-time logs
tail -f /var/log/spam-filter-manager/spam-filter-manager.log

# Search for errors
grep -i error /var/log/spam-filter-manager/*.log

# Search for specific user actions
grep "user@example.com" /var/log/spam-filter-manager/audit.log

# Count API requests
grep "GET /api/v1/spam-rules" /var/log/spam-filter-manager/spam-filter-manager.log | wc -l
```

### Performance Monitoring

#### Resource Usage

```bash
# Check memory usage
ps aux | grep spam-filter-manager

# Check CPU usage
top -p $(pgrep -f spam-filter-manager)

# Check disk I/O
iotop -p $(pgrep -f spam-filter-manager)
```

#### API Performance

```bash
# Test API response time
time curl -s http://localhost:3000/health

# Monitor API errors
grep "500\|502\|503\|504" /var/log/spam-filter-manager/spam-filter-manager.log
```

### Alerting

Set up monitoring alerts for:

- Service down
- High error rates
- High resource usage
- Security events
- API failures

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

**Symptoms**: Service fails to start or crashes immediately

**Diagnosis**:
```bash
# Check service status
systemctl status spam-filter-manager

# Check logs
journalctl -u spam-filter-manager -f

# Check configuration
node -c /usr/local/psa/var/modules/spam-filter-manager/backend/server.js
```

**Solutions**:
- Fix configuration errors
- Check file permissions
- Verify dependencies
- Check port availability

#### 2. API Connection Issues

**Symptoms**: Frontend can't connect to API

**Diagnosis**:
```bash
# Check if service is running
systemctl status spam-filter-manager

# Check port binding
netstat -tlnp | grep 3000

# Test local connection
curl http://localhost:3000/health
```

**Solutions**:
- Start the service
- Check firewall rules
- Verify port configuration
- Check network connectivity

#### 3. Plesk Integration Issues

**Symptoms**: Extension doesn't appear in Plesk or API calls fail

**Diagnosis**:
```bash
# Check Plesk extension registration
plesk bin extension --list

# Test Plesk CLI
/usr/local/psa/bin/plesk version

# Check Plesk API
curl -H "X-API-Key: your-key" https://localhost:8443/api/v2/domains
```

**Solutions**:
- Re-register extension
- Check API key permissions
- Verify Plesk CLI path
- Check Plesk logs

#### 4. SpamAssassin Integration Issues

**Symptoms**: Changes don't affect SpamAssassin behavior

**Diagnosis**:
```bash
# Check SpamAssassin status
systemctl status spamassassin

# Test SpamAssassin configuration
sudo -u spamd /usr/bin/spamassassin -D -c /etc/mail/spamassassin/local.cf

# Check SpamAssassin logs
tail -f /var/log/maillog | grep spamassassin
```

**Solutions**:
- Start SpamAssassin service
- Check SpamAssassin configuration
- Verify Plesk CLI commands
- Check file permissions

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
# Edit configuration
nano /usr/local/psa/var/modules/spam-filter-manager/.env
# Change LOG_LEVEL=debug

# Restart service
systemctl restart spam-filter-manager

# Monitor debug logs
tail -f /var/log/spam-filter-manager/spam-filter-manager.log
```

### Performance Issues

#### High Memory Usage

**Symptoms**: Service consumes excessive memory

**Solutions**:
- Restart the service
- Check for memory leaks
- Optimize configuration
- Upgrade server resources

#### Slow API Responses

**Symptoms**: API calls are slow or timeout

**Solutions**:
- Check server resources
- Optimize database queries
- Check network latency
- Review rate limiting settings

## Maintenance

### Regular Maintenance Tasks

#### Daily

- Check service status
- Review error logs
- Monitor resource usage

#### Weekly

- Review audit logs
- Check for security issues
- Verify backups

#### Monthly

- Update dependencies
- Review configuration
- Performance analysis
- Security audit

### Backup and Recovery

#### Backup Configuration

```bash
# Backup extension files
tar -czf spam-filter-manager-backup-$(date +%Y%m%d).tar.gz \
  /usr/local/psa/var/modules/spam-filter-manager

# Backup logs
tar -czf spam-filter-manager-logs-$(date +%Y%m%d).tar.gz \
  /var/log/spam-filter-manager
```

#### Recovery

```bash
# Restore extension files
tar -xzf spam-filter-manager-backup-YYYYMMDD.tar.gz -C /

# Restore logs
tar -xzf spam-filter-manager-logs-YYYYMMDD.tar.gz -C /
```

### Updates

#### Updating the Extension

1. **Backup current installation**:
   ```bash
   ./scripts/backup.sh
   ```

2. **Download new version**:
   ```bash
   wget https://github.com/your-repo/spam-filter-manager/releases/latest/download/spam-filter-manager-1.0.1.zip
   ```

3. **Stop service**:
   ```bash
   systemctl stop spam-filter-manager
   ```

4. **Install new version**:
   ```bash
   unzip spam-filter-manager-1.0.1.zip
   cd spam-filter-manager-1.0.1
   ./install.sh
   ```

5. **Start service**:
   ```bash
   systemctl start spam-filter-manager
   ```

### Log Rotation

Configure log rotation to prevent disk space issues:

```bash
# /etc/logrotate.d/spam-filter-manager
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

## Advanced Topics

### Custom Integration

#### Custom Plesk Adapter

If you need to customize the Plesk integration:

```javascript
// backend/adapters/plesk-custom.js
class CustomPleskAdapter extends PleskAdapter {
  async addSpamRule(mailbox, listType, entry) {
    // Custom implementation
    // Call your custom Plesk API or CLI commands
  }
}
```

#### Custom Authentication

For custom authentication methods:

```javascript
// backend/middleware/auth-custom.js
const customAuth = (req, res, next) => {
  // Custom authentication logic
  // Verify user credentials
  // Set req.user
  next();
};
```

### Scaling

#### Load Balancing

For high-traffic environments:

1. **Multiple instances**: Run multiple API servers
2. **Load balancer**: Use nginx or HAProxy
3. **Session storage**: Use Redis for session storage
4. **Database**: Use database for token storage

#### Caching

Implement caching for better performance:

```javascript
// Redis caching example
const redis = require('redis');
const client = redis.createClient();

const cacheSpamRules = async (mailbox) => {
  const cached = await client.get(`spam-rules:${mailbox}`);
  if (cached) return JSON.parse(cached);
  
  const rules = await pleskAdapter.getSpamRules(mailbox);
  await client.setex(`spam-rules:${mailbox}`, 300, JSON.stringify(rules));
  return rules;
};
```

### Security Hardening

#### Additional Security Measures

1. **WAF**: Use Web Application Firewall
2. **DDoS Protection**: Implement DDoS protection
3. **Intrusion Detection**: Monitor for suspicious activity
4. **Regular Audits**: Conduct security audits
5. **Penetration Testing**: Regular penetration testing

#### Compliance

For compliance requirements:

1. **GDPR**: Implement data protection measures
2. **SOX**: Maintain audit trails
3. **HIPAA**: Implement healthcare data protection
4. **PCI DSS**: Implement payment card security

---

For user documentation, see the [User Guide](USER_GUIDE.md) and [Installation Guide](INSTALLATION.md).
