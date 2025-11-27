// Test setup file
// This runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';

// Ensure database connection variables are set for tests
// These should match your test database configuration
if (!process.env.DB_HOST) {
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
}
if (!process.env.DB_PORT) {
  process.env.DB_PORT = process.env.DB_PORT || '5432';
}
if (!process.env.DB_USER) {
  process.env.DB_USER = process.env.DB_USER || 'repair_admin';
}
if (!process.env.DB_PASSWORD) {
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'repair_password';
}
if (!process.env.DB_NAME) {
  process.env.DB_NAME = process.env.DB_NAME || 'repair_business';
}

// Suppress console logs during tests (optional)
// Uncomment if you want to silence logs during tests
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

