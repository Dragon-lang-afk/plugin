const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const imap = require('imap');
const logger = require('../utils/logger');
const pleskAdapter = require('../adapters/plesk');

const router = express.Router();

// In-memory token store (in production, use Redis or database)
const tokenStore = new Map();

/**
 * Verify mailbox ownership using IMAP authentication
 */
const verifyMailboxOwnership = async (email, password) => {
  return new Promise((resolve) => {
    const imapConfig = {
      user: email,
      password: password,
      host: process.env.IMAP_HOST || 'localhost',
      port: process.env.IMAP_PORT || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    };

    const connection = new imap(imapConfig);
    
    connection.once('ready', () => {
      connection.end();
      resolve(true);
    });

    connection.once('error', (err) => {
      logger.warn('IMAP authentication failed', { email, error: err.message });
      resolve(false);
    });

    connection.once('end', () => {
      resolve(false);
    });

    connection.connect();
  });
};

/**
 * Generate JWT token for authenticated user
 */
const generateToken = (email, mailbox) => {
  const payload = {
    email,
    mailbox,
    type: 'mail_user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET || 'default-secret-change-in-production');
};

/**
 * Verify mailbox ownership via Plesk session (preferred method)
 */
router.post('/verify-plesk-session', [
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('mailbox').isEmail().withMessage('Valid email address is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { sessionId, mailbox } = req.body;

    // Verify session with Plesk
    const isValidSession = await pleskAdapter.verifyPleskSession(sessionId, mailbox);
    
    if (!isValidSession) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid session or insufficient permissions'
      });
    }

    const token = generateToken(mailbox, mailbox);
    tokenStore.set(token, {
      email: mailbox,
      mailbox: mailbox,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    logger.info('Plesk session verified successfully', { mailbox });

    res.json({
      status: 'success',
      message: 'Authentication successful',
      token,
      expiresIn: '24h'
    });

  } catch (error) {
    logger.error('Plesk session verification failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
});

/**
 * Verify mailbox ownership via IMAP credentials (fallback method)
 */
router.post('/verify-mailbox', [
  body('email').isEmail().withMessage('Valid email address is required'),
  body('password').isLength({ min: 1 }).withMessage('Password is required'),
  body('mailbox').isEmail().withMessage('Valid mailbox address is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, mailbox } = req.body;

    // Verify that the email matches the mailbox
    if (email !== mailbox) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and mailbox must match'
      });
    }

    // Verify mailbox ownership via IMAP
    const isOwner = await verifyMailboxOwnership(email, password);
    
    if (!isOwner) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials or mailbox not accessible'
      });
    }

    const token = generateToken(email, mailbox);
    tokenStore.set(token, {
      email,
      mailbox,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    logger.info('Mailbox ownership verified via IMAP', { email, mailbox });

    res.json({
      status: 'success',
      message: 'Authentication successful',
      token,
      expiresIn: '24h'
    });

  } catch (error) {
    logger.error('Mailbox verification failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
});

/**
 * Refresh token
 */
router.post('/refresh', [
  body('token').notEmpty().withMessage('Token is required')
], async (req, res) => {
  try {
    const { token } = req.body;
    
    const tokenData = tokenStore.get(token);
    if (!tokenData || tokenData.expiresAt < new Date()) {
      tokenStore.delete(token);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }

    // Generate new token
    const newToken = generateToken(tokenData.email, tokenData.mailbox);
    tokenStore.delete(token);
    tokenStore.set(newToken, {
      ...tokenData,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    res.json({
      status: 'success',
      message: 'Token refreshed successfully',
      token: newToken,
      expiresIn: '24h'
    });

  } catch (error) {
    logger.error('Token refresh failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Token refresh failed'
    });
  }
});

/**
 * Logout and invalidate token
 */
router.post('/logout', [
  body('token').notEmpty().withMessage('Token is required')
], async (req, res) => {
  try {
    const { token } = req.body;
    
    const tokenData = tokenStore.get(token);
    if (tokenData) {
      tokenStore.delete(token);
      logger.info('User logged out', { email: tokenData.email });
    }

    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Logout failed'
    });
  }
});

module.exports = router;
