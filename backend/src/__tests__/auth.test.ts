import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Authentication API', () => {
  describe('POST /api/auth/admin/login', () => {
    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/admin/login')
        .send({ password: 'Password123!' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for non-existent admin', async () => {
      const response = await request(app)
        .post('/api/auth/admin/login')
        .send({
          email: 'nonexistent@edtech.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/admin/login')
        .send({
          email: 'superadmin@edtech.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_PASSWORD');
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/admin/login')
        .send({
          email: 'superadmin@edtech.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('superadmin@edtech.com');
      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('POST /api/auth/student/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/student/login')
        .send({
          email: 'alice@student.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('alice@student.com');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return 200 even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });
});
