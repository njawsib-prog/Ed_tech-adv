import { beforeAll, afterAll, afterEach } from 'vitest';
import { execSync } from 'child_process';

// Setup before all tests
beforeAll(async () => {
  console.log('Setting up test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  
  // Run migrations if needed
  // execSync('npm run db:migrate');
});

// Cleanup after each test
afterEach(async () => {
  // Clean up test data if needed
});

// Teardown after all tests
afterAll(async () => {
  console.log('Tearing down test environment...');
});