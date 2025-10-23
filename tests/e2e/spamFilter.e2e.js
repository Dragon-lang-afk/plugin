/**
 * End-to-End Tests for Spam Filter Manager
 * These tests simulate real user interactions
 */

const puppeteer = require('puppeteer');

describe('Spam Filter Manager E2E Tests', () => {
  let browser;
  let page;
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:8080';
  const apiUrl = process.env.E2E_API_URL || 'http://localhost:3000';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Mock API responses
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/')) {
        // Mock API responses
        const url = request.url();
        const method = request.method();
        
        if (url.includes('/auth/verify-mailbox') && method === 'POST') {
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'success',
              message: 'Authentication successful',
              token: 'mock-jwt-token',
              expiresIn: '24h'
            })
          });
        } else if (url.includes('/spam-rules?mailbox=') && method === 'GET') {
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'success',
              mailbox: 'test@example.com',
              whitelist: ['friend@example.com', '@trusted.com'],
              blacklist: ['spam@bad.com'],
              lastUpdated: new Date().toISOString()
            })
          });
        } else if (url.includes('/spam-rules') && method === 'POST') {
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'success',
              message: 'Entry added successfully',
              entry: {
                value: 'new@example.com',
                listType: 'whitelist',
                addedAt: new Date().toISOString()
              }
            })
          });
        } else if (url.includes('/spam-rules') && method === 'DELETE') {
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'success',
              message: 'Entry removed successfully'
            })
          });
        } else {
          request.continue();
        }
      } else {
        request.continue();
      }
    });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Login Flow', () => {
    test('should display login form initially', async () => {
      await page.goto(baseUrl);
      
      const loginScreen = await page.$('#login-screen');
      expect(loginScreen).toBeTruthy();
      
      const emailInput = await page.$('#email');
      const passwordInput = await page.$('#password');
      const loginButton = await page.$('#login-form button[type="submit"]');
      
      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
      expect(loginButton).toBeTruthy();
    });

    test('should login successfully with valid credentials', async () => {
      await page.goto(baseUrl);
      
      // Fill login form
      await page.type('#email', 'test@example.com');
      await page.type('#password', 'password123');
      
      // Submit form
      await page.click('#login-form button[type="submit"]');
      
      // Wait for main app to load
      await page.waitForSelector('#main-app', { visible: true });
      
      // Verify user email is displayed
      const userEmail = await page.$eval('#user-email', el => el.textContent);
      expect(userEmail).toBe('test@example.com');
    });

    test('should show error for invalid credentials', async () => {
      // Mock failed login
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.url().includes('/auth/verify-mailbox') && request.method() === 'POST') {
          request.respond({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'error',
              message: 'Invalid credentials'
            })
          });
        } else {
          request.continue();
        }
      });

      await page.goto(baseUrl);
      
      await page.type('#email', 'test@example.com');
      await page.type('#password', 'wrongpassword');
      await page.click('#login-form button[type="submit"]');
      
      // Wait for error message
      await page.waitForSelector('#login-error', { visible: true });
      
      const errorMessage = await page.$eval('#login-error', el => el.textContent);
      expect(errorMessage).toContain('Invalid credentials');
    });
  });

  describe('Spam Rules Management', () => {
    beforeEach(async () => {
      // Login first
      await page.goto(baseUrl);
      await page.type('#email', 'test@example.com');
      await page.type('#password', 'password123');
      await page.click('#login-form button[type="submit"]');
      await page.waitForSelector('#main-app', { visible: true });
    });

    test('should display existing whitelist and blacklist entries', async () => {
      // Wait for entries to load
      await page.waitForSelector('#whitelist-entries .entry-item', { visible: true });
      
      const whitelistEntries = await page.$$eval('#whitelist-entries .entry-item', 
        items => items.map(item => item.querySelector('.entry-value').textContent)
      );
      
      const blacklistEntries = await page.$$eval('#blacklist-entries .entry-item', 
        items => items.map(item => item.querySelector('.entry-value').textContent)
      );
      
      expect(whitelistEntries).toContain('friend@example.com');
      expect(whitelistEntries).toContain('@trusted.com');
      expect(blacklistEntries).toContain('spam@bad.com');
    });

    test('should add new whitelist entry', async () => {
      const newEntry = 'newfriend@example.com';
      
      // Add entry
      await page.type('#whitelist-entry', newEntry);
      await page.click('#add-whitelist-btn');
      
      // Wait for success message
      await page.waitForSelector('.message.success', { visible: true });
      
      const successMessage = await page.$eval('.message.success', el => el.textContent);
      expect(successMessage).toContain('Entry added to whitelist successfully');
    });

    test('should add new blacklist entry', async () => {
      const newEntry = 'spammer@bad.com';
      
      // Add entry
      await page.type('#blacklist-entry', newEntry);
      await page.click('#add-blacklist-btn');
      
      // Wait for success message
      await page.waitForSelector('.message.success', { visible: true });
      
      const successMessage = await page.$eval('.message.success', el => el.textContent);
      expect(successMessage).toContain('Entry added to blacklist successfully');
    });

    test('should remove whitelist entry', async () => {
      // Wait for entries to load
      await page.waitForSelector('#whitelist-entries .entry-item', { visible: true });
      
      // Click remove button for first entry
      await page.click('#whitelist-entries .entry-item:first-child .btn-icon');
      
      // Confirm removal in modal
      await page.waitForSelector('#confirm-modal', { visible: true });
      await page.click('#confirm-ok');
      
      // Wait for success message
      await page.waitForSelector('.message.success', { visible: true });
      
      const successMessage = await page.$eval('.message.success', el => el.textContent);
      expect(successMessage).toContain('Entry removed from whitelist successfully');
    });

    test('should validate entry format', async () => {
      // Try to add invalid entry
      await page.type('#whitelist-entry', '<script>alert("xss")</script>');
      await page.click('#add-whitelist-btn');
      
      // Should show error message
      await page.waitForSelector('.message.error', { visible: true });
      
      const errorMessage = await page.$eval('.message.error', el => el.textContent);
      expect(errorMessage).toContain('Invalid entry format');
    });

    test('should handle empty entries', async () => {
      // Try to add empty entry
      await page.click('#add-whitelist-btn');
      
      // Should show error message
      await page.waitForSelector('.message.error', { visible: true });
      
      const errorMessage = await page.$eval('.message.error', el => el.textContent);
      expect(errorMessage).toContain('Please enter a whitelist entry');
    });
  });

  describe('User Interface', () => {
    beforeEach(async () => {
      // Login first
      await page.goto(baseUrl);
      await page.type('#email', 'test@example.com');
      await page.type('#password', 'password123');
      await page.click('#login-form button[type="submit"]');
      await page.waitForSelector('#main-app', { visible: true });
    });

    test('should be responsive on mobile devices', async () => {
      await page.setViewport({ width: 375, height: 667 }); // iPhone SE
      
      // Check if elements are still visible and functional
      const whitelistSection = await page.$('.filter-section:first-child');
      expect(whitelistSection).toBeTruthy();
      
      const addButton = await page.$('#add-whitelist-btn');
      expect(addButton).toBeTruthy();
    });

    test('should support keyboard navigation', async () => {
      // Test Enter key on input fields
      await page.focus('#whitelist-entry');
      await page.type('#whitelist-entry', 'keyboard@example.com');
      await page.keyboard.press('Enter');
      
      // Should trigger add action
      await page.waitForSelector('.message.success', { visible: true });
    });

    test('should show loading states', async () => {
      // Mock slow API response
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.url().includes('/spam-rules') && request.method() === 'POST') {
          setTimeout(() => {
            request.respond({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                status: 'success',
                message: 'Entry added successfully'
              })
            });
          }, 1000);
        } else {
          request.continue();
        }
      });

      await page.type('#whitelist-entry', 'slow@example.com');
      await page.click('#add-whitelist-btn');
      
      // Should show loading state
      const app = await page.$('#spam-filter-app');
      const hasLoadingClass = await page.evaluate(el => el.classList.contains('loading'), app);
      expect(hasLoadingClass).toBe(true);
    });
  });

  describe('Logout Flow', () => {
    beforeEach(async () => {
      // Login first
      await page.goto(baseUrl);
      await page.type('#email', 'test@example.com');
      await page.type('#password', 'password123');
      await page.click('#login-form button[type="submit"]');
      await page.waitForSelector('#main-app', { visible: true });
    });

    test('should logout successfully', async () => {
      await page.click('#logout-btn');
      
      // Should return to login screen
      await page.waitForSelector('#login-screen', { visible: true });
      
      // Should show success message
      await page.waitForSelector('.message.success', { visible: true });
      
      const successMessage = await page.$eval('.message.success', el => el.textContent);
      expect(successMessage).toContain('Logged out successfully');
    });
  });
});
