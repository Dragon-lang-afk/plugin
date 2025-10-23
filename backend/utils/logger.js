const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const logDir = process.env.LOG_DIR || '/var/log/spam-filter-manager';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'spam-filter-manager' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'spam-filter-manager.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // File transport for error logs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // File transport for audit logs
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

// Add audit logging method
logger.audit = (message, meta = {}) => {
  logger.info(message, {
    ...meta,
    type: 'audit',
    timestamp: new Date().toISOString()
  });
};

// Add security logging method
logger.security = (message, meta = {}) => {
  logger.warn(message, {
    ...meta,
    type: 'security',
    timestamp: new Date().toISOString()
  });
};

// Add performance logging method
logger.performance = (message, meta = {}) => {
  logger.info(message, {
    ...meta,
    type: 'performance',
    timestamp: new Date().toISOString()
  });
};

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'exceptions.log')
  })
);

// Handle unhandled promise rejections
logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'rejections.log')
  })
);

module.exports = logger;
