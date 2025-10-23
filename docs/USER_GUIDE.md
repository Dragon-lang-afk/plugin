# User Guide - Spam Filter Manager

This guide explains how to use the Spam Filter Manager extension as a mail user.

## Table of Contents

- [Getting Started](#getting-started)
- [Accessing the Extension](#accessing-the-extension)
- [Managing Whitelist](#managing-whitelist)
- [Managing Blacklist](#managing-blacklist)
- [Understanding Entry Types](#understanding-entry-types)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Getting Started

### What is Spam Filter Manager?

The Spam Filter Manager is a Plesk extension that allows you to control which emails are considered spam for your mailbox. You can:

- **Whitelist** trusted senders (emails that should never be marked as spam)
- **Blacklist** unwanted senders (emails that should always be marked as spam)
- **Manage** these lists through a simple web interface

### How It Works

1. **SpamAssassin Integration**: The extension integrates with SpamAssassin, your server's spam filtering system
2. **Real-time Updates**: Changes you make are immediately applied to your spam filter
3. **Secure Access**: Only you can manage spam filters for your own mailbox
4. **Persistent Settings**: Your settings are saved and persist across sessions

## Accessing the Extension

### Method 1: Through Plesk Panel (Recommended)

1. **Log in to Plesk**:
   - Open your web browser
   - Navigate to your Plesk panel URL
   - Enter your Plesk username and password

2. **Navigate to Mail**:
   - Click on "Mail" in the main menu
   - Select your mail account

3. **Access Spam Filter**:
   - Look for the "Spam Filter" tab
   - Click on it to open the Spam Filter Manager

### Method 2: Direct Access

If you have the direct URL to the extension:

1. **Open the extension URL** in your browser
2. **Enter your email credentials**:
   - Email address
   - Password
3. **Click "Login"**

## Managing Whitelist

### What is a Whitelist?

A whitelist contains email addresses and domains that should **never** be marked as spam. Emails from whitelisted sources will always be delivered to your inbox, even if they would normally be considered spam.

### Adding to Whitelist

1. **Navigate to the Whitelist section**
2. **Enter the email address or domain**:
   - Full email: `friend@example.com`
   - Domain: `@example.com` or `example.com`
3. **Click "Add"**
4. **Confirm the entry appears** in the whitelist

### Removing from Whitelist

1. **Find the entry** you want to remove
2. **Click the trash icon** next to the entry
3. **Confirm removal** in the popup dialog
4. **Verify the entry is removed**

### Whitelist Examples

- **Individual emails**: `newsletter@company.com`
- **Entire domains**: `@trusted-company.com`
- **Specific senders**: `support@service.com`

## Managing Blacklist

### What is a Blacklist?

A blacklist contains email addresses and domains that should **always** be marked as spam. Emails from blacklisted sources will be automatically moved to your spam folder or rejected.

### Adding to Blacklist

1. **Navigate to the Blacklist section**
2. **Enter the email address or domain**:
   - Full email: `spam@bad-site.com`
   - Domain: `@spam-site.com` or `spam-site.com`
3. **Click "Add"**
4. **Confirm the entry appears** in the blacklist

### Removing from Blacklist

1. **Find the entry** you want to remove
2. **Click the trash icon** next to the entry
3. **Confirm removal** in the popup dialog
4. **Verify the entry is removed**

### Blacklist Examples

- **Spam emails**: `spam@unwanted.com`
- **Spam domains**: `@spam-site.com`
- **Unwanted newsletters**: `newsletter@unwanted-site.com`

## Understanding Entry Types

### Email Addresses

**Format**: `user@domain.com`

**Examples**:
- `john@example.com`
- `support@company.com`
- `newsletter@service.com`

**Use cases**:
- Whitelist specific trusted senders
- Blacklist specific unwanted senders

### Domains

**Format**: `@domain.com` or `domain.com`

**Examples**:
- `@example.com`
- `@trusted-company.com`
- `@spam-site.com`

**Use cases**:
- Whitelist entire trusted domains
- Blacklist entire spam domains

### IP Addresses

**Format**: IPv4 (`192.168.1.1`) or IPv6 (`2001:db8::1`)

**Examples**:
- `192.168.1.100`
- `10.0.0.1`
- `2001:db8::1`

**Use cases**:
- Whitelist trusted mail servers
- Blacklist known spam sources

### Wildcards

**Format**: `*.domain.com` or `user@*.domain.com`

**Examples**:
- `*.example.com` (all subdomains)
- `user@*.company.com` (user at any subdomain)

**Use cases**:
- Whitelist all subdomains of a trusted company
- Blacklist all subdomains of a spam site

## Troubleshooting

### Common Issues

#### 1. Can't Access the Extension

**Symptoms**: Extension doesn't appear in Plesk or login fails

**Solutions**:
- Verify you're logged in to the correct Plesk account
- Check if the extension is installed and running
- Contact your system administrator

#### 2. Changes Not Taking Effect

**Symptoms**: Added entries don't affect spam filtering

**Solutions**:
- Wait a few minutes for changes to propagate
- Check if the entry format is correct
- Verify SpamAssassin is running
- Contact your system administrator

#### 3. Login Issues

**Symptoms**: Can't log in with email credentials

**Solutions**:
- Verify your email address and password
- Check if your mailbox is active
- Try using Plesk panel login instead
- Contact your system administrator

#### 4. Interface Not Loading

**Symptoms**: Page loads but interface is blank or broken

**Solutions**:
- Refresh the page
- Clear browser cache
- Try a different browser
- Check if JavaScript is enabled

### Error Messages

#### "Invalid entry format"
- **Cause**: The entry doesn't match supported formats
- **Solution**: Use valid email addresses, domains, or IP addresses

#### "Entry already exists"
- **Cause**: The entry is already in the list
- **Solution**: Check the existing entries or modify the entry

#### "Access denied"
- **Cause**: You don't have permission to modify this mailbox
- **Solution**: Contact your system administrator

#### "Authentication failed"
- **Cause**: Invalid credentials or session expired
- **Solution**: Log in again with correct credentials

## Best Practices

### Whitelist Management

1. **Be selective**: Only whitelist truly trusted sources
2. **Use domains**: Whitelist entire domains for trusted companies
3. **Regular review**: Periodically review and clean up your whitelist
4. **Test first**: Add entries and test before making permanent decisions

### Blacklist Management

1. **Be cautious**: Don't blacklist entire domains unless necessary
2. **Use specific emails**: Blacklist specific spam addresses when possible
3. **Monitor results**: Check if blacklisted entries are working as expected
4. **Regular cleanup**: Remove outdated blacklist entries

### Security

1. **Keep credentials secure**: Don't share your login information
2. **Log out**: Always log out when finished
3. **Report issues**: Contact your administrator if you notice problems
4. **Regular updates**: Keep your browser updated

### Performance

1. **Limit entries**: Don't add thousands of entries unnecessarily
2. **Use wildcards**: Use domain wildcards instead of individual emails when possible
3. **Regular maintenance**: Clean up old or unused entries

## Tips and Tricks

### Quick Actions

- **Enter key**: Press Enter in input fields to quickly add entries
- **Bulk operations**: Use the bulk import feature for large lists
- **Search**: Use browser search (Ctrl+F) to find specific entries

### Common Scenarios

#### Whitelist a Newsletter
1. Add the newsletter's "from" address to whitelist
2. Add the newsletter's domain to whitelist
3. Test by sending yourself a test email

#### Blacklist a Spam Source
1. Add the spam email address to blacklist
2. Add the spam domain to blacklist
3. Monitor your spam folder to verify it's working

#### Whitelist a Company
1. Add the company's main domain (e.g., `@company.com`)
2. Add any subdomains if needed (e.g., `@*.company.com`)
3. Add specific email addresses if needed

### Troubleshooting Spam Issues

1. **Check whitelist**: Ensure legitimate senders are whitelisted
2. **Check blacklist**: Ensure unwanted senders are blacklisted
3. **Test with sample emails**: Send test emails to verify settings
4. **Monitor logs**: Ask your administrator to check SpamAssassin logs

## Getting Help

### Self-Service

1. **Check this guide** for common issues
2. **Review error messages** for specific solutions
3. **Test with different browsers** if having interface issues

### Contact Support

If you need additional help:

1. **Contact your system administrator**
2. **Provide detailed information**:
   - What you were trying to do
   - What error messages you received
   - What browser you're using
   - When the issue occurred

### Reporting Issues

When reporting issues, include:

- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Error messages** (if any)
- **Browser and version** you're using
- **Screenshots** (if helpful)

---

For technical documentation, see the [Admin Guide](ADMIN_GUIDE.md) and [Installation Guide](INSTALLATION.md).
