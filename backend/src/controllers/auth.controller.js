import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function signToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is missing. Add it to backend/.env.');
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    secret,
    {
      expiresIn: '7d',
    },
  );
}

function getGoogleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is missing. Add it to backend/.env.');
  }

  return new OAuth2Client(clientId);
}

export async function register(req, res, next) {
  try {
    const { name, email, phone = '', password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with that email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role = normalizedEmail === 'admin@agrihub.com' ? 'admin' : 'user';

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      passwordHash,
      role,
    });

    return res.status(201).json({
      message: 'Account created successfully.',
      token: signToken(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    return res.json({
      message: 'Login successful.',
      token: signToken(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

export async function googleLogin(req, res, next) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: 'Google credential is required.',
      });
    }

    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.sub) {
      return res.status(400).json({
        message: 'Unable to validate Google account.',
      });
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const role = normalizedEmail === 'admin@agrihub.com' ? 'admin' : 'user';

    let user = await User.findOne({
      $or: [{ email: normalizedEmail }, { googleId: payload.sub }],
    });

    if (!user) {
      user = await User.create({
        name: payload.name?.trim() || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleId: payload.sub,
        role,
      });
    } else {
      let changed = false;

      if (!user.googleId) {
        user.googleId = payload.sub;
        changed = true;
      }

      if (!user.name && payload.name) {
        user.name = payload.name.trim();
        changed = true;
      }

      if (changed) {
        await user.save();
      }
    }

    return res.json({
      message: 'Google login successful.',
      token: signToken(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

export function getGoogleConfig(_req, res) {
  res.json({
    enabled: Boolean(process.env.GOOGLE_CLIENT_ID),
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  });
}
