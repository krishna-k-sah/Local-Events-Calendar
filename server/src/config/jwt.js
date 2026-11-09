import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const DEFAULT_DEV_SECRET = 'eventhub-super-secret-jwt-key-2026-production';

// Production security assertion
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_DEV_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL SECURITY ERROR: In production mode, JWT_SECRET must be explicitly set to a cryptographically secure random string with at least 32 characters.');
  }
}

export const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const signToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
