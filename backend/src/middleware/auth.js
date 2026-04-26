import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

async function resolveUserFromHeader(authHeader = '') {
  const [, token] = authHeader.split(' ');

  if (!token) {
    return null;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is missing. Add it to .env.');
  }

  const payload = jwt.verify(token, secret);
  return User.findById(payload.sub);
}

export async function requireAuth(req, res, next) {
  try {
    const user = await resolveUserFromHeader(req.headers.authorization || '');

    if (!user) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Invalid or expired session.',
      });
    }

    return next(error);
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    req.user = await resolveUserFromHeader(req.headers.authorization || '');
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      req.user = null;
      return next();
    }

    return next(error);
  }
}
