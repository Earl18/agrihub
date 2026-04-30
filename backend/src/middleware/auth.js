import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ensurePrivilegedAccess, hasRole, isSuperAdmin } from '../utils/roles.js';

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
  const user = await User.findById(payload.sub);

  if (!user) {
    return null;
  }

  if (ensurePrivilegedAccess(user)) {
    await user.save();
  }

  if (user.accountStatus === 'disabled') {
    const error = new Error('This account has been disabled.');
    error.name = 'AccountDisabledError';
    throw error;
  }

  return user;
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

    if (error.name === 'AccountDisabledError') {
      return res.status(403).json({
        message: 'This account has been disabled. Please contact support.',
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

    if (error.name === 'AccountDisabledError') {
      req.user = null;
      return next();
    }

    return next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || !hasRole(req.user, 'admin')) {
    return res.status(403).json({
      message: 'Admin access is required for this action.',
    });
  }

  return next();
}

export function requireSuperAdmin(req, res, next) {
  if (!req.user || !isSuperAdmin(req.user)) {
    return res.status(403).json({
      message: 'Super admin access is required for this action.',
    });
  }

  return next();
}
