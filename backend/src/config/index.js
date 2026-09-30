const path = require('path');
// Ensure .env is loaded regardless of the execution working directory
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config(); // Fallback to current working directory

const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD.trim() !== ''
  ? process.env.DB_PASSWORD
  : null;
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT, 10) || 5432;
const dbName = process.env.DB_NAME || 'ontime_db';

// Construct databaseUrl if not explicitly provided or if granular fields are set
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && dbPassword !== null) {
  databaseUrl = `postgres://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
} else if (!databaseUrl) {
  databaseUrl = 'postgres://postgres:postgres@localhost:5432/ontime_db';
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl,
  db: {
    user: dbUser,
    password: dbPassword,
    host: dbHost,
    port: dbPort,
    database: dbName
  },
  jwtSecret: process.env.JWT_SECRET || 'ontime_college_super_secure_jwt_secret_key_2026_dev',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  payment: {
    mode: process.env.PAYMENT_MODE || 'test',
    keyId: process.env.PAYMENT_KEY_ID || 'rzp_test_college_ontime_key_1234',
    keySecret: process.env.PAYMENT_KEY_SECRET || 'rzp_test_secret_college_ontime_9876'
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  }
};
