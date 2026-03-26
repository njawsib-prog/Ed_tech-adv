import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Admin API', () => {
  describe('GET /api/admin/dashboard', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/students', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/students');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/courses', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/courses');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/tests', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/tests');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/results', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/results');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/materials', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/materials');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/notifications', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/notifications');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/settings', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/settings');

      expect(response.status).toBe(401);
    });
  });
});