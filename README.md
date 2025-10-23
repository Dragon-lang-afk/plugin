# Spam Filter Manager - Plesk Extension

A production-ready Plesk panel extension that allows mail users to manage their SpamAssassin whitelist and blacklist entries through a user-friendly web interface.

## Features

- **User-Friendly Interface**: Clean, responsive web interface for managing spam filters
- **Security-First Design**: Strict ownership verification and input validation
- **Dual Authentication**: Support for both Plesk session and IMAP credential verification
- **Real-time Updates**: Changes are immediately applied to SpamAssassin configuration
- **Audit Logging**: Comprehensive logging of all user actions
- **Rate Limiting**: Protection against abuse and spam
- **Mobile Responsive**: Works on desktop, tablet, and mobile devices
- **Multi-language Support**: Japanese and English interface

## Requirements

- **Plesk**: 18.0.0 or higher
- **Node.js**: 14.0.0 or higher
- **SpamAssassin**: 3.4.0 or higher
- **Operating System**: Linux (tested on CentOS, Ubuntu, Debian)
- **Permissions**: Root access for installation

## Quick Start

### Installation

1. **Download the package**:
   ```bash
   wget https://github.com/your-repo/spam-filter-manager/releases/latest/download/spam-filter-manager-1.0.0.zip
   ```

2. **Extract and install**:
   ```bash
   unzip spam-filter-manager-1.0.0.zip
   cd spam-filter-manager-1.0.0
   sudo ./install.sh
   ```

3. **Configure the extension**:
   ```bash
   sudo nano /usr/local/psa/var/modules/spam-filter-manager/.env
   ```

4. **Restart the service**:
   ```bash
   sudo systemctl restart spam-filter-manager
   ```

### Usage

1. **Access the extension**:
   - Log in to your Plesk panel
   - Navigate to your mail account
   - Click on the "Spam Filter" tab

2. **Manage whitelist**:
   - Add trusted email addresses or domains
   - Emails from these sources will never be marked as spam

3. **Manage blacklist**:
   - Add unwanted email addresses or domains
   - Emails from these sources will always be marked as spam

## Configuration

### Environment Variables

Edit `/usr/local/psa/var/modules/spam-filter-manager/.env`:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# API Configuration
API_BASE_URL=/api/v1
ALLOWED_ORIGINS=https://localhost:8443,https://your-domain.com

# JWT Configuration (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key

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

### Plesk API Key Setup

1. **Generate API Key**:
   - Log in to Plesk panel as administrator
   - Go to Tools & Settings → API Keys
   - Create a new API key with appropriate permissions

2. **Set Permissions**:
   - Mail management permissions
   - SpamAssassin configuration access
   - User session verification

## API Documentation

### Authentication

#### Verify Mailbox Ownership (IMAP)
```http
POST /api/v1/auth/verify-mailbox
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password",
  "mailbox": "user@example.com"
}
```

#### Verify Plesk Session
```http
POST /api/v1/auth/verify-plesk-session
Content-Type: application/json

{
  "sessionId": "session-id",
  "mailbox": "user@example.com"
}
```

### Spam Rules Management

#### Get Spam Rules
```http
GET /api/v1/spam-rules?mailbox=user@example.com
Authorization: Bearer <token>
```

#### Add Spam Rule
```http
POST /api/v1/spam-rules
Authorization: Bearer <token>
Content-Type: application/json

{
  "mailbox": "user@example.com",
  "listType": "whitelist",
  "entry": "friend@example.com"
}
```

#### Remove Spam Rule
```http
DELETE /api/v1/spam-rules
Authorization: Bearer <token>
Content-Type: application/json

{
  "mailbox": "user@example.com",
  "listType": "whitelist",
  "entry": "friend@example.com"
}
```

#### Bulk Operations
```http
POST /api/v1/spam-rules/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "mailbox": "user@example.com",
  "operations": [
    {
      "action": "add",
      "listType": "whitelist",
      "entry": "friend1@example.com"
    },
    {
      "action": "remove",
      "listType": "blacklist",
      "entry": "spam@bad.com"
    }
  ]
}
```

## Supported Entry Formats

- **Email addresses**: `user@example.com`
- **Domains**: `@example.com` or `example.com`
- **IP addresses**: `192.168.1.1` (IPv4), `2001:db8::1` (IPv6)
- **Wildcards**: `*.example.com`, `user@*.example.com`

## Security Features

- **Ownership Verification**: Users can only manage their own mailboxes
- **Input Validation**: Strict validation of all input data
- **XSS Protection**: Sanitization of user inputs
- **CSRF Protection**: Token-based CSRF protection
- **Rate Limiting**: Prevents abuse and spam
- **Audit Logging**: Complete audit trail of all actions
- **Secure Authentication**: JWT-based authentication with expiration

## Troubleshooting

### Common Issues

1. **Service won't start**:
   ```bash
   sudo systemctl status spam-filter-manager
   sudo journalctl -u spam-filter-manager -f
   ```

2. **Permission denied errors**:
   ```bash
   sudo chown -R root:root /usr/local/psa/var/modules/spam-filter-manager
   sudo chmod -R 755 /usr/local/psa/var/modules/spam-filter-manager
   ```

3. **API connection issues**:
   - Check Plesk API key configuration
   - Verify network connectivity
   - Check firewall settings

4. **SpamAssassin integration issues**:
   - Verify SpamAssassin is installed and running
   - Check Plesk CLI path configuration
   - Review SpamAssassin logs

### Logs

- **Application logs**: `/var/log/spam-filter-manager/spam-filter-manager.log`
- **Error logs**: `/var/log/spam-filter-manager/error.log`
- **Audit logs**: `/var/log/spam-filter-manager/audit.log`
- **Installation logs**: `/var/log/spam-filter-manager-install.log`

### Debug Mode

Enable debug logging:
```bash
sudo nano /usr/local/psa/var/modules/spam-filter-manager/.env
# Change LOG_LEVEL=debug
sudo systemctl restart spam-filter-manager
```

## Development

### Prerequisites

- Node.js 14+
- npm
- Git

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-repo/spam-filter-manager.git
   cd spam-filter-manager
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

### Building

```bash
npm run build
```

### Packaging

```bash
npm run package
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### End-to-End Tests
```bash
npm run test:e2e
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/spam-filter-manager/issues)
- **Email**: support@example.com

## Changelog

### Version 1.0.0
- Initial release
- Basic whitelist/blacklist management
- Plesk integration
- Security features
- Mobile responsive UI

## Roadmap

- [ ] Bulk import/export functionality
- [ ] Advanced filtering rules
- [ ] Email preview functionality
- [ ] Statistics and reporting
- [ ] Multi-domain support
- [ ] API rate limiting improvements
- [ ] Database backend option
- [ ] Docker containerization

---

**Note**: This extension requires proper Plesk and SpamAssassin configuration. Please ensure your system meets all requirements before installation.
