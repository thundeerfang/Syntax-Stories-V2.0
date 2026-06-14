process.env.NODE_ENV = "test";
process.env.PORT = "3999";
process.env.SESSION_SECRET = "jest-session-secret-must-be-at-least-32-chars";
process.env.JWT_SECRET = "jest-jwt-secret-must-be-at-least-32-chars!!";
process.env.OTP_PEPPER = "jest-otp-pepper-for-hmac-hashing-tests";
if (process.env.RUN_REDIS_TESTS !== "1") {
  process.env.REDIS_URL = "";
}
process.env.CLAMAV_AUTO_START = "false";
process.env.MONGO_CONN = "mongodb://127.0.0.1:27017/jest-not-used";
process.env.FRONTEND_URL = "http://localhost:3001";
process.env.GOOGLE_CLIENT_ID = "jest-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "jest-google-client-secret";
process.env.GITHUB_CLIENT_ID = "jest-github-client-id";
process.env.GITHUB_CLIENT_SECRET = "jest-github-client-secret";
