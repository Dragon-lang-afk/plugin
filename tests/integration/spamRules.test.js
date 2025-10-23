const request = require('supertest');
const app = require('../../backend/server');
const pleskAdapter = require('../../backend/adapters/plesk');

// Mock the Plesk adapter
jest.mock('../../backend/adapters/plesk');

describe('Spam Rules API Integration Tests', () => {
  let authToken;
  const testMailbox = 'test@example.com';

  beforeAll(async () => {
    // Mock successful authentication
    pleskAdapter.verifyPleskSession.mockResolvedValue(true);
    
    // Mock spam rules data
    pleskAdapter.getSpamRules.mockResolvedValue({
      whitelist: ['friend@example.com', '@trusted.com'],
      blacklist: ['spam@bad.com'],
      lastUpdated: new Date().toISOString()
    });

    pleskAdapter.addSpamRule.mockResolvedValue({ success: true });
    pleskAdapter.removeSpamRule.mockResolvedValue({ success: true });
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock JWT verification
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      { email: testMailbox, mailbox: testMailbox, type: 'mail_user' },
      process.env.JWT_SECRET || 'default-secret-change-in-production'
    );
  });

  describe('GET /api/v1/spam-rules', () => {
    test('should return spam rules for authenticated user', async () => {
      const response = await request(app)
        .get(`/api/v1/spam-rules?mailbox=${testMailbox}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.mailbox).toBe(testMailbox);
      expect(response.body.whitelist).toEqual(['friend@example.com', '@trusted.com']);
      expect(response.body.blacklist).toEqual(['spam@bad.com']);
    });

    test('should reject access to other mailboxes', async () => {
      const otherMailbox = 'other@example.com';
      
      const response = await request(app)
        .get(`/api/v1/spam-rules?mailbox=${otherMailbox}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Access denied');
    });

    test('should require authentication', async () => {
      await request(app)
        .get(`/api/v1/spam-rules?mailbox=${testMailbox}`)
        .expect(401);
    });

    test('should validate mailbox parameter', async () => {
      const response = await request(app)
        .get('/api/v1/spam-rules?mailbox=invalid-email')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/v1/spam-rules', () => {
    test('should add whitelist entry', async () => {
      const newEntry = 'newfriend@example.com';
      
      const response = await request(app)
        .post('/api/v1/spam-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mailbox: testMailbox,
          listType: 'whitelist',
          entry: newEntry
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Entry added successfully');
      expect(pleskAdapter.addSpamRule).toHaveBeenCalledWith(testMailbox, 'whitelist', newEntry);
    });

    test('should add blacklist entry', async () => {
      const newEntry = 'spammer@bad.com';
      
      const response = await request(app)
        .post('/api/v1/spam-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mailbox: testMailbox,
          listType: 'blacklist',
          entry: newEntry
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(pleskAdapter.addSpamRule).toHaveBeenCalledWith(testMailbox, 'blacklist', newEntry);
    });

    test('should reject access to other mailboxes', async () => {
      const otherMailbox = 'other@example.com';
      
      const response = await request(app)
        .post('/api/v1/spam-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mailbox: otherMailbox,
          listType: 'whitelist',
          entry: 'test@example.com'
        })
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Access denied');
    });

    test('should validate entry format', async () => {
      const response = await request(app)
        .post('/api/v1/spam-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mailbox: testMailbox,
          listType: 'whitelist',
          entry: '<script>alert("xss")</script>'
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid entry format');
    });

    test('should handle duplicate entries', async () => {
      // Mock existing entry
      pleskAdapter.getSpamRules.mockResolvedValueOnce({
        whitelist: ['existing@example.com'],
        blacklist: [],
        lastUpdated: new Date().toISOString()
      });

      const response = await request(app)
        .post('/api/v1/spam-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mailbox: testMailbox,
          listType: 'whitelist',
          entry: 'existing@example.com'
        })
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Entry already exists in the list');
    });

    test('should handle adapter errors', async () => {
      pleskAdapter.addSpamRule.mockResolvedValueOnce({
        success: false,
        error: 'SpamAssassin configuration failed'
      });

      const response = await request(app)
        .post('/api/v1/spam-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mailbox: testMailbox,
          listType: 'whitelist',
          entry: 'test@example.com'
        })
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Failed to add entry');
    });
  });

  describe('DELETE /api/v1/spam-rules', () => {
    test('should remove whitelist entry', async () => {
      const entryToRemove = 'friend@example.com';
      
      const response = await request(app)
        .delete('/api/v1/spam-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mailbox: testMailbox,
          listType: 'whitelist',
          entry: entryToRemove
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Entry removed successfully');
      expect(pleskAdapter.removeSpamRule).toHaveBeenCalledWith(testMailbox, 'whitelist', entryToRemove);
    });

    test('should handle non-existent entries', async () => {
      // Mock empty lists
      pleskAdapter.getSpamRules.mockResolvedValueOnce({
        whitelist: [],
        blacklist: [],
        lastUpdated: new Date().toISOString()
      });

      const response = await request(app)
        .delete('/api/v1/spam-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mailbox: testMailbox,
          listType: 'whitelist',
          entry: 'nonexistent@example.com'
        })
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Entry not found in the list');
    });

    test('should reject access to other mailboxes', async () => {
      const otherMailbox = 'other@example.com';
      
      const response = await request(app)
        .delete('/api/v1/spam-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mailbox: otherMailbox,
          listType: 'whitelist',
          entry: 'test@example.com'
        })
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Access denied');
    });
  });

  describe('POST /api/v1/spam-rules/bulk', () => {
    test('should handle bulk operations', async () => {
      const operations = [
        { action: 'add', listType: 'whitelist', entry: 'bulk1@example.com' },
        { action: 'add', listType: 'blacklist', entry: 'bulk2@bad.com' },
        { action: 'remove', listType: 'whitelist', entry: 'friend@example.com' }
      ];

      const response = await request(app)
        .post('/api/v1/spam-rules/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mailbox: testMailbox,
          operations: operations
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toHaveLength(3);
      expect(response.body.errors).toHaveLength(0);
    });

    test('should handle mixed success and failure', async () => {
      // Mock one operation to fail
      pleskAdapter.addSpamRule
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Failed to add' });

      const operations = [
        { action: 'add', listType: 'whitelist', entry: 'valid@example.com' },
        { action: 'add', listType: 'whitelist', entry: 'invalid@example.com' }
      ];

      const response = await request(app)
        .post('/api/v1/spam-rules/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mailbox: testMailbox,
          operations: operations
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.results).toHaveLength(1);
      expect(response.body.errors).toHaveLength(1);
    });
  });
});
