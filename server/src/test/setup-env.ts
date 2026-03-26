/**
 * Loaded before any test file imports `app`. Keeps Express/passport/session usable without Redis/Mongo.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '3999';
process.env.SESSION_SECRET = 'jest-session-secret-must-be-at-least-32-chars';
process.env.JWT_SECRET = 'jest-jwt-secret-must-be-at-least-32-chars!!';
process.env.REDIS_URL = '';
process.env.MONGO_CONN = 'mongodb://127.0.0.1:27017/jest-not-used';
process.env.FRONTEND_URL = 'http://localhost:3000';
