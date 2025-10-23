/**
 * Input validation utilities for spam filter entries
 */

/**
 * Validate email address format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

/**
 * Validate domain format
 */
const isValidDomain = (domain) => {
  // Remove @ prefix if present
  const cleanDomain = domain.startsWith('@') ? domain.substring(1) : domain;
  
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(cleanDomain) && cleanDomain.length <= 253;
};

/**
 * Validate IPv4 address
 */
const isValidIPv4 = (ip) => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
};

/**
 * Validate IPv6 address
 */
const isValidIPv6 = (ip) => {
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  return ipv6Regex.test(ip);
};

/**
 * Validate IP address (IPv4 or IPv6)
 */
const isValidIP = (ip) => {
  return isValidIPv4(ip) || isValidIPv6(ip);
};

/**
 * Validate wildcard pattern
 */
const isValidWildcard = (pattern) => {
  // Allow simple wildcards like *.example.com or user@*.example.com
  const wildcardRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$|^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return wildcardRegex.test(pattern);
};

/**
 * Normalize entry format
 */
const normalizeEntry = (entry) => {
  if (!entry || typeof entry !== 'string') {
    return '';
  }
  
  // Trim whitespace and convert to lowercase
  let normalized = entry.trim().toLowerCase();
  
  // Handle domain entries - ensure they start with @
  if (normalized.includes('@') && !normalized.startsWith('@')) {
    // It's an email address, leave as is
    return normalized;
  } else if (normalized.includes('.') && !normalized.includes('@')) {
    // It's a domain, add @ prefix if not present
    if (!normalized.startsWith('@')) {
      normalized = '@' + normalized;
    }
  }
  
  return normalized;
};

/**
 * Validate spam filter entry
 */
const validateSpamEntry = (entry) => {
  const errors = [];
  
  if (!entry || typeof entry !== 'string') {
    errors.push('Entry is required');
    return { isValid: false, errors };
  }
  
  const normalized = normalizeEntry(entry);
  
  if (normalized.length === 0) {
    errors.push('Entry cannot be empty');
    return { isValid: false, errors };
  }
  
  if (normalized.length > 255) {
    errors.push('Entry is too long (maximum 255 characters)');
    return { isValid: false, errors };
  }
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
    /url\s*\(/i,
    /@import/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(normalized)) {
      errors.push('Entry contains potentially dangerous content');
      break;
    }
  }
  
  // Validate based on entry type
  if (normalized.includes('@')) {
    // Email address
    if (!isValidEmail(normalized)) {
      errors.push('Invalid email address format');
    }
  } else if (normalized.startsWith('@')) {
    // Domain
    if (!isValidDomain(normalized)) {
      errors.push('Invalid domain format');
    }
  } else if (normalized.includes('*')) {
    // Wildcard pattern
    if (!isValidWildcard(normalized)) {
      errors.push('Invalid wildcard pattern');
    }
  } else if (isValidIP(normalized)) {
    // IP address
    // IP addresses are valid
  } else {
    // Try to validate as domain without @
    const domainWithAt = '@' + normalized;
    if (isValidDomain(domainWithAt)) {
      // It's a valid domain without @ prefix
    } else {
      errors.push('Invalid entry format. Must be email, domain, IP address, or wildcard pattern');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    normalized
  };
};

/**
 * Validate mailbox email address
 */
const validateMailbox = (mailbox) => {
  if (!mailbox || typeof mailbox !== 'string') {
    return { isValid: false, error: 'Mailbox is required' };
  }
  
  const normalized = mailbox.trim().toLowerCase();
  
  if (!isValidEmail(normalized)) {
    return { isValid: false, error: 'Invalid mailbox format' };
  }
  
  return { isValid: true, normalized };
};

/**
 * Validate list type
 */
const validateListType = (listType) => {
  const validTypes = ['whitelist', 'blacklist'];
  
  if (!listType || typeof listType !== 'string') {
    return { isValid: false, error: 'List type is required' };
  }
  
  const normalized = listType.trim().toLowerCase();
  
  if (!validTypes.includes(normalized)) {
    return { isValid: false, error: 'Invalid list type. Must be whitelist or blacklist' };
  }
  
  return { isValid: true, normalized };
};

/**
 * Sanitize input to prevent XSS
 */
const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

module.exports = {
  validateSpamEntry,
  validateMailbox,
  validateListType,
  normalizeEntry,
  sanitizeInput,
  isValidEmail,
  isValidDomain,
  isValidIP,
  isValidWildcard
};
