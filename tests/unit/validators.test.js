const {
  validateSpamEntry,
  validateMailbox,
  validateListType,
  normalizeEntry,
  sanitizeInput,
  isValidEmail,
  isValidDomain,
  isValidIP
} = require('../../backend/utils/validators');

describe('Validators', () => {
  describe('validateSpamEntry', () => {
    test('should validate email addresses', () => {
      const result = validateSpamEntry('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('user@example.com');
    });

    test('should validate domains with @ prefix', () => {
      const result = validateSpamEntry('@example.com');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('@example.com');
    });

    test('should validate domains without @ prefix', () => {
      const result = validateSpamEntry('example.com');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('@example.com');
    });

    test('should validate IPv4 addresses', () => {
      const result = validateSpamEntry('192.168.1.1');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('192.168.1.1');
    });

    test('should validate IPv6 addresses', () => {
      const result = validateSpamEntry('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
      expect(result.isValid).toBe(true);
    });

    test('should reject empty entries', () => {
      const result = validateSpamEntry('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Entry cannot be empty');
    });

    test('should reject entries that are too long', () => {
      const longEntry = 'a'.repeat(256);
      const result = validateSpamEntry(longEntry);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Entry is too long (maximum 255 characters)');
    });

    test('should reject dangerous patterns', () => {
      const dangerousEntries = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'onclick="alert(\'xss\')"',
        'eval(alert("xss"))',
        'expression(alert("xss"))'
      ];

      dangerousEntries.forEach(entry => {
        const result = validateSpamEntry(entry);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Entry contains potentially dangerous content');
      });
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com'
      ];

      invalidEmails.forEach(email => {
        const result = validateSpamEntry(email);
        expect(result.isValid).toBe(false);
      });
    });

    test('should reject invalid domain formats', () => {
      const invalidDomains = [
        '@',
        '@.',
        '@.com',
        '@-invalid.com',
        '@invalid-.com'
      ];

      invalidDomains.forEach(domain => {
        const result = validateSpamEntry(domain);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateMailbox', () => {
    test('should validate correct email addresses', () => {
      const result = validateMailbox('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('user@example.com');
    });

    test('should reject invalid email addresses', () => {
      const result = validateMailbox('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid mailbox format');
    });

    test('should reject empty mailbox', () => {
      const result = validateMailbox('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Mailbox is required');
    });
  });

  describe('validateListType', () => {
    test('should validate whitelist', () => {
      const result = validateListType('whitelist');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('whitelist');
    });

    test('should validate blacklist', () => {
      const result = validateListType('blacklist');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('blacklist');
    });

    test('should reject invalid list types', () => {
      const result = validateListType('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid list type. Must be whitelist or blacklist');
    });

    test('should be case insensitive', () => {
      const result = validateListType('WHITELIST');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('whitelist');
    });
  });

  describe('normalizeEntry', () => {
    test('should normalize email addresses', () => {
      expect(normalizeEntry('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
    });

    test('should add @ prefix to domains', () => {
      expect(normalizeEntry('example.com')).toBe('@example.com');
    });

    test('should not add @ prefix to domains that already have it', () => {
      expect(normalizeEntry('@example.com')).toBe('@example.com');
    });

    test('should handle empty strings', () => {
      expect(normalizeEntry('')).toBe('');
    });

    test('should handle null/undefined', () => {
      expect(normalizeEntry(null)).toBe('');
      expect(normalizeEntry(undefined)).toBe('');
    });
  });

  describe('sanitizeInput', () => {
    test('should remove dangerous HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")');
    });

    test('should remove javascript: protocol', () => {
      expect(sanitizeInput('javascript:alert("xss")')).toBe('alert("xss")');
    });

    test('should remove event handlers', () => {
      expect(sanitizeInput('onclick="alert(\'xss\')"')).toBe('"alert(\'xss\')"');
    });

    test('should handle null/undefined', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
    });
  });

  describe('isValidEmail', () => {
    test('should validate correct email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.email+tag@example.co.uk')).toBe(true);
    });

    test('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
    });
  });

  describe('isValidDomain', () => {
    test('should validate correct domains', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('@example.com')).toBe(true);
      expect(isValidDomain('sub.example.com')).toBe(true);
    });

    test('should reject invalid domains', () => {
      expect(isValidDomain('')).toBe(false);
      expect(isValidDomain('.com')).toBe(false);
      expect(isValidDomain('example.')).toBe(false);
    });
  });

  describe('isValidIP', () => {
    test('should validate IPv4 addresses', () => {
      expect(isValidIP('192.168.1.1')).toBe(true);
      expect(isValidIP('127.0.0.1')).toBe(true);
    });

    test('should validate IPv6 addresses', () => {
      expect(isValidIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(isValidIP('::1')).toBe(true);
    });

    test('should reject invalid IP addresses', () => {
      expect(isValidIP('256.256.256.256')).toBe(false);
      expect(isValidIP('192.168.1')).toBe(false);
      expect(isValidIP('invalid')).toBe(false);
    });
  });
});
