const express = require('express');
const { body, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const pleskAdapter = require('../adapters/plesk');
const { validateSpamEntry } = require('../utils/validators');

const router = express.Router();

/**
 * Get spam rules for a specific mailbox
 */
router.get('/', [
  query('mailbox').isEmail().withMessage('Valid email address is required')
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

    const { mailbox } = req.query;
    const userMailbox = req.user.mailbox;

    // Verify user can only access their own mailbox
    if (mailbox !== userMailbox) {
      logger.warn('Unauthorized access attempt', {
        requestedMailbox: mailbox,
        userMailbox: userMailbox,
        ip: req.ip
      });
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You can only manage your own mailbox'
      });
    }

    const rules = await pleskAdapter.getSpamRules(mailbox);
    
    logger.info('Spam rules retrieved', { mailbox, rulesCount: rules.whitelist.length + rules.blacklist.length });

    res.json({
      status: 'success',
      mailbox,
      whitelist: rules.whitelist,
      blacklist: rules.blacklist,
      lastUpdated: rules.lastUpdated
    });

  } catch (error) {
    logger.error('Failed to retrieve spam rules', { error: error.message, mailbox: req.query.mailbox });
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve spam rules'
    });
  }
});

/**
 * Add a new spam rule entry
 */
router.post('/', [
  body('mailbox').isEmail().withMessage('Valid email address is required'),
  body('listType').isIn(['whitelist', 'blacklist']).withMessage('listType must be whitelist or blacklist'),
  body('entry').notEmpty().withMessage('Entry is required')
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

    const { mailbox, listType, entry } = req.body;
    const userMailbox = req.user.mailbox;

    // Verify user can only modify their own mailbox
    if (mailbox !== userMailbox) {
      logger.warn('Unauthorized modification attempt', {
        requestedMailbox: mailbox,
        userMailbox: userMailbox,
        ip: req.ip
      });
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You can only manage your own mailbox'
      });
    }

    // Validate entry format
    const validationResult = validateSpamEntry(entry);
    if (!validationResult.isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid entry format',
        details: validationResult.errors
      });
    }

    // Check if entry already exists
    const existingRules = await pleskAdapter.getSpamRules(mailbox);
    const existingList = existingRules[listType];
    
    if (existingList.includes(entry)) {
      return res.status(409).json({
        status: 'error',
        message: 'Entry already exists in the list'
      });
    }

    // Add the entry
    const result = await pleskAdapter.addSpamRule(mailbox, listType, entry);
    
    if (!result.success) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to add entry',
        details: result.error
      });
    }

    logger.info('Spam rule added', {
      mailbox,
      listType,
      entry,
      user: req.user.email
    });

    res.json({
      status: 'success',
      message: 'Entry added successfully',
      entry: {
        value: entry,
        listType,
        addedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to add spam rule', {
      error: error.message,
      mailbox: req.body.mailbox,
      listType: req.body.listType,
      entry: req.body.entry
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to add entry'
    });
  }
});

/**
 * Remove a spam rule entry
 */
router.delete('/', [
  body('mailbox').isEmail().withMessage('Valid email address is required'),
  body('listType').isIn(['whitelist', 'blacklist']).withMessage('listType must be whitelist or blacklist'),
  body('entry').notEmpty().withMessage('Entry is required')
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

    const { mailbox, listType, entry } = req.body;
    const userMailbox = req.user.mailbox;

    // Verify user can only modify their own mailbox
    if (mailbox !== userMailbox) {
      logger.warn('Unauthorized modification attempt', {
        requestedMailbox: mailbox,
        userMailbox: userMailbox,
        ip: req.ip
      });
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You can only manage your own mailbox'
      });
    }

    // Check if entry exists
    const existingRules = await pleskAdapter.getSpamRules(mailbox);
    const existingList = existingRules[listType];
    
    if (!existingList.includes(entry)) {
      return res.status(404).json({
        status: 'error',
        message: 'Entry not found in the list'
      });
    }

    // Remove the entry
    const result = await pleskAdapter.removeSpamRule(mailbox, listType, entry);
    
    if (!result.success) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to remove entry',
        details: result.error
      });
    }

    logger.info('Spam rule removed', {
      mailbox,
      listType,
      entry,
      user: req.user.email
    });

    res.json({
      status: 'success',
      message: 'Entry removed successfully'
    });

  } catch (error) {
    logger.error('Failed to remove spam rule', {
      error: error.message,
      mailbox: req.body.mailbox,
      listType: req.body.listType,
      entry: req.body.entry
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove entry'
    });
  }
});

/**
 * Bulk operations for spam rules
 */
router.post('/bulk', [
  body('mailbox').isEmail().withMessage('Valid email address is required'),
  body('operations').isArray().withMessage('Operations must be an array'),
  body('operations.*.action').isIn(['add', 'remove']).withMessage('Action must be add or remove'),
  body('operations.*.listType').isIn(['whitelist', 'blacklist']).withMessage('listType must be whitelist or blacklist'),
  body('operations.*.entry').notEmpty().withMessage('Entry is required')
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

    const { mailbox, operations } = req.body;
    const userMailbox = req.user.mailbox;

    // Verify user can only modify their own mailbox
    if (mailbox !== userMailbox) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You can only manage your own mailbox'
      });
    }

    const results = [];
    const errors = [];

    for (const operation of operations) {
      try {
        const { action, listType, entry } = operation;
        
        // Validate entry format
        const validationResult = validateSpamEntry(entry);
        if (!validationResult.isValid) {
          errors.push({
            entry,
            error: 'Invalid entry format',
            details: validationResult.errors
          });
          continue;
        }

        let result;
        if (action === 'add') {
          result = await pleskAdapter.addSpamRule(mailbox, listType, entry);
        } else {
          result = await pleskAdapter.removeSpamRule(mailbox, listType, entry);
        }

        if (result.success) {
          results.push({
            action,
            listType,
            entry,
            status: 'success'
          });
        } else {
          errors.push({
            entry,
            error: result.error || 'Operation failed'
          });
        }
      } catch (error) {
        errors.push({
          entry: operation.entry,
          error: error.message
        });
      }
    }

    logger.info('Bulk spam rules operation completed', {
      mailbox,
      totalOperations: operations.length,
      successful: results.length,
      failed: errors.length
    });

    res.json({
      status: 'success',
      message: `Bulk operation completed: ${results.length} successful, ${errors.length} failed`,
      results,
      errors
    });

  } catch (error) {
    logger.error('Bulk spam rules operation failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Bulk operation failed'
    });
  }
});

module.exports = router;
