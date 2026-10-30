const request = require('supertest');
const app = require('../app');
const { connectDB, disconnectDB, getDatabaseHealth } = require('../db/db');

describe('Server Lifecycle & Health Checks', () => {
  jest.setTimeout(30000);

  beforeAll(async () => {
    // Establish connection for testing against local MongoDB
    await connectDB();
  });

  afterAll(async () => {
    // Cleanly disconnect after tests
    await disconnectDB();
  });

  describe('GET /health', () => {
    it('should return HTTP 200 with database health status UP when connected', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'UP');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.database).toMatchObject({
        isConnected: true,
        status: 'connected',
        readyState: 1,
      });
      expect(response.body.database.host).toBeUndefined();
      expect(response.body.database.name).toBeUndefined();
    });
  });

  describe('Backward Compatibility & Error Handling', () => {
    it('should maintain existing GET / root endpoint', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.text).toBe('hellow world');
    });

    it('should return HTTP 404 with JSON message for unknown routes', async () => {
      const response = await request(app).get('/non-existent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Resource not found');
    });
  });

  describe('Database Connection State & Idempotency', () => {
    it('should accurately report database health metrics without exposing internal names', () => {
      const health = getDatabaseHealth();

      expect(health.isConnected).toBe(true);
      expect(health.status).toBe('connected');
      expect(health.readyState).toBe(1);
      expect(health.host).toBeUndefined();
      expect(health.name).toBeUndefined();
    });

    it('should reuse existing active connection when connectDB is called again', async () => {
      const conn = await connectDB();
      expect(conn.readyState).toBe(1);
    });
  });
});
