const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// In-memory token store (in production, use Redis or database)
const tokenStore = new Map();

/**
 * Authentication middleware to verify JWT tokens
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Access token required'
    });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-change-in-production');
    
    // Check if token exists in our store and is not expired
    const tokenData = tokenStore.get(token);
    if (!tokenData || tokenData.expiresAt < new Date()) {
      tokenStore.delete(token);
      return res.status(401).json({
        status: 'error',
        message: 'Token expired or invalid'
      });
    }

    // Add user info to request
    req.user = {
      email: decoded.email,
      mailbox: decoded.mailbox,
      type: decoded.type
    };

    next();
  } catch (error) {
    logger.warn('Invalid token provided', { error: error.message, ip: req.ip });
    return res.status(403).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
};

/**
 * CSRF protection middleware
 */
const csrfProtection = (req, res, next) => {
  const csrfToken = req.headers['x-csrf-token'];
  const sessionCsrfToken = req.session?.csrfToken;

  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  if (!csrfToken || !sessionCsrfToken || csrfToken !== sessionCsrfToken) {
    return res.status(403).json({
      status: 'error',
      message: 'CSRF token mismatch'
    });
  }

  next();
};

/**
 * Rate limiting per user
 */
const userRateLimit = (maxRequests = 50, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.email;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [user, requests] of userRequests.entries()) {
      const validRequests = requests.filter(time => time > windowStart);
      if (validRequests.length === 0) {
        userRequests.delete(user);
      } else {
        userRequests.set(user, validRequests);
      }
    }

    // Check current user's requests
    const userRequestTimes = userRequests.get(userId) || [];
    const recentRequests = userRequestTimes.filter(time => time > windowStart);

    if (recentRequests.length >= maxRequests) {
      logger.warn('User rate limit exceeded', {
        userId,
        requests: recentRequests.length,
        ip: req.ip
      });
      return res.status(429).json({
        status: 'error',
        message: 'Too many requests, please try again later'
      });
    }

    // Add current request
    recentRequests.push(now);
    userRequests.set(userId, recentRequests);

    next();
  };
};

/**
 * Ownership verification middleware
 */
const verifyOwnership = (req, res, next) => {
  const requestedMailbox = req.body.mailbox || req.query.mailbox;
  const userMailbox = req.user.mailbox;

  if (requestedMailbox && requestedMailbox !== userMailbox) {
    logger.warn('Ownership verification failed', {
      requestedMailbox,
      userMailbox,
      ip: req.ip,
      user: req.user.email
    });
    return res.status(403).json({
      status: 'error',
      message: 'Access denied: You can only manage your own mailbox'
    });
  }

  next();
};

/**
 * Audit logging middleware
 */
const auditLog = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action
      logger.info('User action', {
        action,
        user: req.user?.email,
        mailbox: req.user?.mailbox,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        success: res.statusCode < 400
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  authenticateToken,
  csrfProtection,
  userRateLimit,
  verifyOwnership,
  auditLog
};

// Export the main auth middleware as default
module.exports = authenticateToken;
