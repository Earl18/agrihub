import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import {
  canManageCommercialFeatures,
  ensurePrivilegedAccess,
  getPenaltyState,
  getUserRoles,
  getVerificationState,
  hasRole,
  isSuperAdmin,
  isSuperAdminEmail,
} from '../utils/roles.js';
import { appendActivity } from '../utils/activityLog.js';
import { sendEmailVerificationCode, sendPasswordResetCode } from '../utils/mailer.js';
import {
  createProfileAvatarSignedUrl,
  extractProfileAvatarPath,
} from '../utils/verificationStorage.js';

async function sanitizeProfile(profile) {
  const plainProfile = profile?.toObject?.() || profile || {};
  const avatarPath = plainProfile.avatarPath || extractProfileAvatarPath(plainProfile.avatarUrl || '');

  if (!avatarPath) {
    return plainProfile;
  }

  try {
    const { url } = await createProfileAvatarSignedUrl(avatarPath);
    return {
      ...plainProfile,
      avatarPath,
      avatarUrl: url,
    };
  } catch {
    return plainProfile;
  }
}

async function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    role: user.role,
    accountType: user.accountType,
    roles: getUserRoles(user),
    isAdmin: hasRole(user, 'admin'),
    isSuperAdmin: isSuperAdmin(user),
    verification: getVerificationState(user),
    penalty: getPenaltyState(user),
    canManageCommercialFeatures: canManageCommercialFeatures(user),
    phone: user.phone,
    profile: await sanitizeProfile(user.profile),
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

function splitName(fullName = '') {
  const trimmed = String(fullName).trim();

  if (!trimmed) {
    return { firstName: '', middleName: '', lastName: '' };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return { firstName: parts[0], middleName: '', lastName: '' };
  }

  if (parts.length === 2) {
    return { firstName: parts[0], middleName: '', lastName: parts[1] };
  }

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

function combineName({ firstName = '', middleName = '', lastName = '' }) {
  return [firstName, middleName, lastName]
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(' ');
}

function buildPasswordResetCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function buildEmailVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function isPasswordResetCodeValid(user, code) {
  return (
    user?.passwordReset?.code &&
    user.passwordReset.code === code &&
    user.passwordReset.expiresAt &&
    new Date(user.passwordReset.expiresAt).getTime() > Date.now()
  );
}

function isEmailVerificationCodeValid(user, code) {
  return (
    user?.emailVerification?.code &&
    user.emailVerification.code === code &&
    user.emailVerification.expiresAt &&
    new Date(user.emailVerification.expiresAt).getTime() > Date.now()
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhilippineMobile(phone) {
  return /^09\d{9}$/.test(phone);
}

function buildVerificationWindow() {
  const now = new Date();
  return {
    now,
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
  };
}

async function issueEmailVerificationCode(user) {
  const code = buildEmailVerificationCode();
  const { now, expiresAt } = buildVerificationWindow();

  user.emailVerification = {
    code,
    expiresAt,
    requestedAt: now,
    verifiedAt: null,
  };

  await user.save();
  await sendEmailVerificationCode({
    toEmail: user.email,
    code,
    name: user.name,
  });
}

export async function register(req, res, next) {
  try {
    const { name, email, phone = '', password, profile = {} } = req.body;
    const providedNames = {
      firstName: String(profile.firstName || '').trim(),
      middleName: String(profile.middleName || '').trim(),
      lastName: String(profile.lastName || '').trim(),
    };
    const normalizedName =
      combineName(providedNames) || String(name || '').trim();
    const profileNames = combineName(providedNames)
      ? providedNames
      : splitName(normalizedName);

    if (!normalizedName || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = String(phone).trim();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: 'Please enter a valid email address.',
      });
    }

    if (normalizedPhone && !isValidPhilippineMobile(normalizedPhone)) {
      return res.status(400).json({
        message: 'Please enter a valid Philippine mobile number.',
      });
    }
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with that email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isPrivilegedEmail = isSuperAdminEmail(normalizedEmail);
    const role = isPrivilegedEmail ? 'admin' : 'user';

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      emailVerified: false,
      role,
      roles: role === 'admin' ? ['buyer', 'admin'] : ['buyer'],
      accountType: role === 'admin' ? 'admin' : 'customer',
      profile: {
        firstName: profileNames.firstName,
        middleName: profileNames.middleName,
        lastName: profileNames.lastName,
      },
    });

    if (ensurePrivilegedAccess(user)) {
      await user.save();
    }

    appendActivity(user, {
      description: 'Created an AgriHub account',
      status: 'completed',
      createdAt: user.createdAt,
    });
    await issueEmailVerificationCode(user);
    appendActivity(user, {
      description: 'Requested email verification',
      status: 'pending',
    });
    await user.save();

    return res.status(201).json({
      message: 'Account created. Enter the verification code sent to your email to continue.',
      email: user.email,
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

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: 'Please enter a valid email address.',
      });
    }
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

    if (!user.emailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
      });
    }

    if (ensurePrivilegedAccess(user)) {
      await user.save();
    }

    appendActivity(user, {
      description: 'Signed in to AgriHub',
      status: 'completed',
    });
    await user.save();

    return res.json({
      message: 'Login successful.',
      token: signToken(user),
      user: await sanitizeUser(user),
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
    const role = isSuperAdminEmail(normalizedEmail) ? 'admin' : 'user';
    const googleNames = splitName(payload.name?.trim() || normalizedEmail.split('@')[0]);

    let user = await User.findOne({
      $or: [{ email: normalizedEmail }, { googleId: payload.sub }],
    });

    if (!user) {
      user = await User.create({
        name: payload.name?.trim() || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleId: payload.sub,
        emailVerified: payload.email_verified !== false,
        role,
        roles: role === 'admin' ? ['buyer', 'admin'] : ['buyer'],
        accountType: role === 'admin' ? 'admin' : 'customer',
        profile: {
          firstName: googleNames.firstName,
          middleName: googleNames.middleName,
          lastName: googleNames.lastName,
        },
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

      if (!user.profile?.firstName && googleNames.firstName) {
        user.profile.firstName = googleNames.firstName;
        changed = true;
      }

      if (!user.profile?.middleName && googleNames.middleName) {
        user.profile.middleName = googleNames.middleName;
        changed = true;
      }

      if (!user.profile?.lastName && googleNames.lastName) {
        user.profile.lastName = googleNames.lastName;
        changed = true;
      }

      if (!Array.isArray(user.roles) || user.roles.length === 0) {
        user.roles = role === 'admin' ? ['buyer', 'admin'] : ['buyer'];
        changed = true;
      }

      if (!user.emailVerified && payload.email_verified !== false) {
        user.emailVerified = true;
        changed = true;
      }

      if (ensurePrivilegedAccess(user)) {
        changed = true;
      }

      if (changed) {
        await user.save();
      }
    }

    appendActivity(user, {
      description: 'Signed in with Google',
      status: 'completed',
    });
    await user.save();

    return res.json({
      message: 'Google login successful.',
      token: signToken(user),
      user: await sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

export async function verifyRegistrationCode(req, res, next) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();

    if (!email || !code) {
      return res.status(400).json({
        message: 'Email and verification code are required.',
      });
    }

    const user = await User.findOne({ email });

    if (!user || !isEmailVerificationCodeValid(user, code)) {
      return res.status(400).json({
        message: 'The verification code is invalid or has expired.',
      });
    }

    user.emailVerified = true;
    user.emailVerification = {
      code: '',
      expiresAt: null,
      requestedAt: user.emailVerification?.requestedAt || null,
      verifiedAt: new Date(),
    };
    appendActivity(user, {
      description: 'Verified email address',
      status: 'completed',
    });

    if (ensurePrivilegedAccess(user)) {
      await user.save();
    }

    await user.save();

    return res.json({
      message: 'Email verified successfully.',
      token: signToken(user),
      user: await sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

export async function resendRegistrationCode(req, res, next) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: 'Email is required.',
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: 'No account was found for that email address.',
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: 'This email is already verified.',
      });
    }

    await issueEmailVerificationCode(user);
    appendActivity(user, {
      description: 'Resent email verification code',
      status: 'pending',
    });
    await user.save();

    return res.json({
      message: 'A new verification code has been sent to your email.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function requestPasswordReset(req, res, next) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: 'Email is required.',
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: 'No account was found for that email address.',
      });
    }

    const code = buildPasswordResetCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    user.passwordReset = {
      code,
      expiresAt,
      verifiedAt: null,
      requestedAt: now,
    };

    await user.save();
    await sendPasswordResetCode({
      toEmail: user.email,
      code,
      name: user.name,
    });

    return res.json({
      message: 'A verification code has been sent to your email.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function verifyPasswordResetCode(req, res, next) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();

    if (!email || !code) {
      return res.status(400).json({
        message: 'Email and verification code are required.',
      });
    }

    const user = await User.findOne({ email });

    if (!user || !isPasswordResetCodeValid(user, code)) {
      return res.status(400).json({
        message: 'The verification code is invalid or has expired.',
      });
    }

    user.passwordReset.verifiedAt = new Date();
    await user.save();

    return res.json({
      message: 'Verification code confirmed.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    const password = String(req.body?.password || '');

    if (!email || !code || !password) {
      return res.status(400).json({
        message: 'Email, verification code, and new password are required.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long.',
      });
    }

    const user = await User.findOne({ email });

    if (!user || !isPasswordResetCodeValid(user, code) || !user.passwordReset?.verifiedAt) {
      return res.status(400).json({
        message: 'The verification code is invalid or has not been confirmed.',
      });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordReset = {
      code: '',
      expiresAt: null,
      verifiedAt: null,
      requestedAt: null,
    };
    appendActivity(user, {
      description: 'Reset account password',
      status: 'completed',
    });
    await user.save();

    return res.json({
      message: 'Password updated successfully.',
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
