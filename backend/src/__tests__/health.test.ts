import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Health Check', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return current timestamp', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(typeof response.body.timestamp).toBe('number');
      expect(response.body.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });
});