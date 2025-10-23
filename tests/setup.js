/**
 * Jest test setup file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.LOG_LEVEL = 'error';
process.env.LOG_DIR = '/tmp/spam-filter-manager-test-logs';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
