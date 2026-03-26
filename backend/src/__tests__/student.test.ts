import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Student API', () => {
  describe('GET /api/student/dashboard', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/student/dashboard');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/student/tests', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/student/tests');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/student/results', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/student/results');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/student/materials', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/student/materials');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/student/notifications', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/student/notifications');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/student/profile', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/student/profile');

      expect(response.status).toBe(401);
    });
  });
});