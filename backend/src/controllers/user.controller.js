import { User } from '../models/User.js';
import { LaborPayment } from '../models/LaborPayment.js';
import { appendActivity, getUserActivities } from '../utils/activityLog.js';
import {
  sendEmailChangeVerificationCode,
  sendPhoneVerificationCodeEmail,
} from '../utils/mailer.js';
import {
  canManageCommercialFeatures,
  ensurePrivilegedAccess,
  getPenaltyState,
  getUserRoles,
  getVerificationState,
  hasRole,
  isSuperAdmin,
  roleQuery,
} from '../utils/roles.js';
import {
  createProfileAvatarUploadTarget,
  createProfileAvatarSignedUrl,
  createVerificationUploadTarget,
  deleteVerificationDocuments,
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

function buildPhoneVerificationState(user) {
  return {
    status: user?.phoneVerification?.status === 'verified' ? 'verified' : 'unverified',
    source: user?.phoneVerification?.source || 'email',
    verifiedAt: user?.phoneVerification?.verifiedAt || null,
    requestedAt: user?.phoneVerification?.requestedAt || null,
  };
}

function buildWalletSummary(user) {
  const wallet = user?.wallet || {};
  const transactions = Array.isArray(wallet?.transactions) ? wallet.transactions : [];

  return {
    balance: Number(wallet?.balance || 0),
    totalEarned: Number(wallet?.totalEarned || 0),
    totalWithdrawn: Number(wallet?.totalWithdrawn || 0),
    transactions: transactions
      .map((transaction) => ({
        id: String(transaction?.id || '').trim(),
        type: String(transaction?.type || '').trim(),
        amount: Number(transaction?.amount || 0),
        status: String(transaction?.status || 'completed').trim(),
        method: String(transaction?.method || '').trim(),
        description: String(transaction?.description || '').trim(),
        reference: String(transaction?.reference || '').trim(),
        destinationLabel: String(transaction?.destinationLabel || '').trim(),
        createdAt: transaction?.createdAt || null,
      }))
      .filter((transaction) => transaction.id)
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()),
  };
}

function ensureWalletState(user) {
  if (!user.wallet) {
    user.wallet = {
      balance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      transactions: [],
    };
  }

  user.wallet.balance = Number(user.wallet.balance || 0);
  user.wallet.totalEarned = Number(user.wallet.totalEarned || 0);
  user.wallet.totalWithdrawn = Number(user.wallet.totalWithdrawn || 0);

  if (!Array.isArray(user.wallet.transactions)) {
    user.wallet.transactions = [];
  }

  return user.wallet;
}

function buildWalletTransactionId(prefix = 'WAL') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function addWalletTransaction(user, transaction) {
  const wallet = ensureWalletState(user);
  wallet.transactions = [
    {
      id: transaction.id || buildWalletTransactionId(),
      type: transaction.type,
      amount: Number(transaction.amount || 0),
      status: transaction.status || 'completed',
      method: transaction.method || '',
      description: transaction.description || '',
      reference: transaction.reference || '',
      destinationLabel: transaction.destinationLabel || '',
      createdAt: transaction.createdAt || new Date(),
    },
    ...wallet.transactions,
  ].slice(0, 100);
}

function creditWallet(user, amount, transaction = {}) {
  const numericAmount = Number(amount || 0);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return;
  }

  const wallet = ensureWalletState(user);
  wallet.balance += numericAmount;
  wallet.totalEarned += numericAmount;
  addWalletTransaction(user, {
    ...transaction,
    type: 'credit',
    amount: numericAmount,
    status: transaction.status || 'completed',
  });
}

function debitWalletForCashOut(user, amount, transaction = {}) {
  const numericAmount = Number(amount || 0);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Enter a valid cash-out amount.');
  }

  const wallet = ensureWalletState(user);

  if (wallet.balance < numericAmount) {
    throw new Error('Insufficient wallet balance for this cash out.');
  }

  wallet.balance -= numericAmount;
  wallet.totalWithdrawn += numericAmount;
  addWalletTransaction(user, {
    ...transaction,
    type: 'cashout',
    amount: numericAmount,
    status: transaction.status || 'completed',
  });
}

function normalizeCashOutDestination(payload = {}) {
  const method = String(payload?.method || '').trim().toLowerCase();
  const accountName = String(payload?.accountName || '').trim();
  const mobileNumber = normalizePhilippinePhone(payload?.mobileNumber || '');
  const cardholderName = String(payload?.cardholderName || '').trim();
  const cardBrand = String(payload?.cardBrand || '').trim();
  const cardLast4 = String(payload?.cardLast4 || '').replace(/\D/g, '').slice(-4);

  return {
    method,
    accountName,
    mobileNumber,
    cardholderName,
    cardBrand,
    cardLast4,
  };
}

function buildCashOutDestinationLabel(destination) {
  if (destination.method === 'gcash' || destination.method === 'paymaya') {
    return [destination.accountName, destination.mobileNumber].filter(Boolean).join(' - ');
  }

  if (destination.method === 'card') {
    const masked = destination.cardLast4 ? `**** ${destination.cardLast4}` : '';
    return [destination.cardBrand, masked, destination.cardholderName].filter(Boolean).join(' - ');
  }

  return '';
}

async function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    accountType: user.accountType,
    roles: getUserRoles(user),
    isAdmin: hasRole(user, 'admin'),
    isSuperAdmin: isSuperAdmin(user),
    verification: getVerificationState(user),
    verificationMeta: {
      seller: {
        reviewReason: user.verification?.seller?.reviewReason || '',
        rejectedAt: user.verification?.seller?.rejectedAt || null,
      },
      laborer: {
        reviewReason: user.verification?.laborer?.reviewReason || '',
        rejectedAt: user.verification?.laborer?.rejectedAt || null,
      },
    },
    emailChangePending: user?.emailVerification?.pendingEmail
      ? {
          email: user.emailVerification.pendingEmail,
          requestedAt: user.emailVerification?.requestedAt || null,
        }
      : null,
    phoneChangePending: user?.phoneVerification?.pendingPhone
      ? {
          phone: user.phoneVerification.pendingPhone,
          requestedAt: user?.phoneVerification?.requestedAt || null,
        }
      : null,
    phoneVerification: buildPhoneVerificationState(user),
    wallet: buildWalletSummary(user),
    penalty: getPenaltyState(user),
    canManageCommercialFeatures: canManageCommercialFeatures(user),
    profile: await sanitizeProfile(user.profile),
  };
}

function buildEmailVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildVerificationWindow() {
  const now = new Date();
  return {
    now,
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
  };
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

function normalizeExperienceYears(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits;
}

function formatExperienceYears(value) {
  const normalized = normalizeExperienceYears(value);
  return normalized ? `${normalized} years` : '';
}

function formatPhpCurrency(value) {
  const parsed = Number(value || 0);

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function formatPhpRate(value, unit = 'hour') {
  return `${formatPhpCurrency(value)}/${unit === 'hour' ? 'hr' : unit}`;
}

function normalizePhilippinePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');

  if (digits.startsWith('639') && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }

  if (digits.startsWith('09') && digits.length === 11) {
    return digits;
  }

  return digits;
}

function isValidPhilippineMobile(phone) {
  return /^09\d{9}$/.test(phone);
}

async function issuePhoneVerificationCode(user, phone) {
  const normalizedPhone = normalizePhilippinePhone(phone);

  if (!normalizedPhone || !isValidPhilippineMobile(normalizedPhone)) {
    throw new Error('Please enter a valid Philippine mobile number.');
  }

  const code = buildEmailVerificationCode();
  const { now, expiresAt } = buildVerificationWindow();

  user.phone = normalizedPhone;
  user.phoneVerification = {
    status: 'unverified',
    source: 'email',
    code,
    expiresAt,
    requestedAt: now,
    verifiedAt: null,
    pendingPhone: normalizedPhone,
  };

  await user.save();
  await sendPhoneVerificationCodeEmail({
    toEmail: user.email,
    code,
    name: user.name,
    phone: normalizedPhone,
  });

  return {
    now,
    normalizedPhone,
  };
}

function buildVerificationProfileAddress(profile = {}) {
  const directAddress = String(profile?.address || '').trim();

  if (directAddress) {
    return directAddress;
  }

  return [profile?.streetAddress, profile?.city, profile?.state, profile?.country]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ');
}

function normalizeProvinceToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\bprovince\b/g, '')
    .replace(/\bcity\b/g, '')
    .replace(/\bmunicipality\b/g, '')
    .replace(/\bmetro\b/g, '')
    .replace(/[0-9]/g, ' ')
    .replace(/[^a-z\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildProvinceCandidates(profile = {}) {
  const candidates = new Set();
  const pushCandidate = (value) => {
    const normalized = normalizeProvinceToken(value);

    if (!normalized) {
      return;
    }

    candidates.add(normalized);

    const parts = normalized
      .split(/[\s/-]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length > 1) {
      const trailing = parts[parts.length - 1];

      if (trailing.length >= 3) {
        candidates.add(trailing);
      }
    }
  };

  pushCandidate(profile?.state);

  [profile?.city, profile?.address, profile?.location, profile?.streetAddress]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .forEach((value) => {
      value
        .split(',')
        .map((segment) => segment.trim())
        .filter(Boolean)
        .forEach(pushCandidate);
    });

  return candidates;
}

function getPrimaryProvinceLabel(profile = {}) {
  const directState = normalizeProvinceToken(profile?.state);

  if (directState) {
    return directState
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  const firstCandidate = Array.from(buildProvinceCandidates(profile))[0] || '';

  return firstCandidate
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function belongsToSameProvince(currentProfile = {}, workerProfile = {}) {
  const currentCandidates = buildProvinceCandidates(currentProfile);
  const workerCandidates = buildProvinceCandidates(workerProfile);

  if (currentCandidates.size === 0 || workerCandidates.size === 0) {
    return false;
  }

  return Array.from(currentCandidates).some((candidate) => workerCandidates.has(candidate));
}

function getProfileStats(user) {
  const verification = getVerificationState(user);
  const primaryLaborListing = getLaborListings(user)[0];
  const listings = user.marketplaceListings || [];
  const activeJobs = Array.isArray(user.laborProfile?.activeBookings)
    ? user.laborProfile.activeBookings.length
    : 0;
  const completedJobs = Array.isArray(user.laborProfile?.bookingHistory)
    ? user.laborProfile.bookingHistory.filter((booking) => booking?.status === 'completed').length
    : 0;
  const laborRate = Number(primaryLaborListing?.rate || 0);
  const laborAvailability = String(primaryLaborListing?.availability || 'Unavailable').trim() || 'Unavailable';
  const laborRating = Number(user.laborProfile?.rating || 0);
  const totalSales = listings.reduce(
    (sum, listing) => sum + Number(listing.price || 0) * Number(listing.orders || 0),
    0,
  );
  const totalPurchases = 0;
  const workersHired = 0;
  const servicesBooked = Array.isArray(user.serviceProfile?.bookings)
    ? user.serviceProfile.bookings.length
    : 0;
  const stats = [
    {
      label: 'Total Purchases',
      value: formatPhpCurrency(totalPurchases),
      color: 'text-blue-600',
    },
    {
      label: 'Workers Hired',
      value: String(workersHired),
      color: 'text-purple-600',
    },
    {
      label: 'Services Booked',
      value: String(servicesBooked),
      color: 'text-orange-600',
    },
  ];

  if (verification.seller === 'verified') {
    stats.unshift({
      label: 'Total Sales',
      value: formatPhpCurrency(totalSales),
      color: 'text-green-600',
    });
  }

  if (verification.laborer === 'verified') {
    stats.push({
      label: 'Labor Rate',
      value: formatPhpRate(laborRate),
      color: 'text-emerald-600',
    });
    stats.push({
      label: 'Availability',
      value: laborAvailability,
      color: laborAvailability.toLowerCase() === 'available' ? 'text-green-600' : 'text-amber-600',
    });
    stats.push({
      label: 'Worker Rating',
      value: laborRating > 0 ? laborRating.toFixed(1) : 'Awaiting reviews',
      color: 'text-indigo-600',
    });
    stats.push({
      label: 'Active Jobs',
      value: String(activeJobs),
      color: 'text-teal-600',
    });
    stats.push({
      label: 'Completed Jobs',
      value: String(completedJobs),
      color: 'text-cyan-600',
    });
  }

  return stats;
}

function normalizeLaborSkills(skills) {
  if (!Array.isArray(skills)) {
    return [];
  }

  return skills
    .map((skill) => String(skill || '').trim())
    .filter(Boolean);
}

function normalizeClockTime(value) {
  const normalized = String(value || '').trim();

  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    return '';
  }

  const [hours, minutes] = normalized.split(':').map(Number);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return '';
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function convertClockTimeToMinutes(value) {
  const normalized = normalizeClockTime(value);

  if (!normalized) {
    return null;
  }

  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatWorkingHoursRange(start, end) {
  const normalizedStart = normalizeClockTime(start);
  const normalizedEnd = normalizeClockTime(end);

  if (!normalizedStart || !normalizedEnd) {
    return '';
  }

  const [startHours, startMinutes] = normalizedStart.split(':').map(Number);
  const [endHours, endMinutes] = normalizedEnd.split(':').map(Number);
  const formatOptions = { hour: 'numeric', minute: '2-digit' };
  const startLabel = new Date(2000, 0, 1, startHours, startMinutes).toLocaleTimeString('en-US', formatOptions);
  const endLabel = new Date(2000, 0, 1, endHours, endMinutes).toLocaleTimeString('en-US', formatOptions);

  return `${startLabel} - ${endLabel}`;
}

function getDurationHours(value) {
  const match = String(value || '').trim().match(/^(\d+)\s*hour/i);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function hasLaborBookingTimeConflict(bookings = [], date, requestedStartMinutes, requestedDurationHours, ignoreBookingId = '') {
  const normalizedDate = String(date || '').trim();
  const normalizedIgnoreBookingId = String(ignoreBookingId || '').trim();
  const requestedEndMinutes = requestedStartMinutes + requestedDurationHours * 60;

  return bookings.some((booking) => {
    if (!booking) {
      return false;
    }

    const bookingId = String(booking.bookingId || '').trim();

    if (normalizedIgnoreBookingId && bookingId === normalizedIgnoreBookingId) {
      return false;
    }

    if (String(booking.date || '').trim() !== normalizedDate) {
      return false;
    }

    if (String(booking.status || '').trim().toLowerCase() === 'cancelled') {
      return false;
    }

    const existingStartMinutes = convertClockTimeToMinutes(booking.time);
    const existingDurationHours = getDurationHours(booking.duration);

    if (existingStartMinutes === null || existingDurationHours === null) {
      return false;
    }

    const existingEndMinutes = existingStartMinutes + existingDurationHours * 60;

    return requestedStartMinutes <= existingEndMinutes && existingStartMinutes <= requestedEndMinutes;
  });
}

function buildLaborBookingId() {
  return `LB-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function normalizeCoordinates(coordinates = {}) {
  const lat = Number(coordinates?.lat);
  const lng = Number(coordinates?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      lat: null,
      lng: null,
    };
  }

  return {
    lat,
    lng,
  };
}

function createTravelTrackingSnapshot(travelTracking = {}) {
  return {
    isOnTheWay: Boolean(travelTracking?.isOnTheWay),
    startedAt: travelTracking?.startedAt || null,
    updatedAt: travelTracking?.updatedAt || null,
    currentLocation: normalizeCoordinates(travelTracking?.currentLocation),
  };
}

function getCurrentManilaDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getVerifiedLaborSkills(user) {
  return normalizeLaborSkills(user?.verification?.laborer?.details?.skills);
}

function normalizeLaborOffer(offer) {
  return {
    title: String(offer?.title || '').trim(),
    description: String(offer?.description || '').trim(),
    workerType: String(offer?.workerType || '').trim(),
    rate: Number(offer?.rate || 0),
    availability: String(offer?.availability || '').trim() || 'Unavailable',
    skills: normalizeLaborSkills(offer?.skills),
    distance: String(offer?.distance || '').trim(),
    serviceArea: String(offer?.serviceArea || '').trim(),
    workingHoursStart: normalizeClockTime(offer?.workingHoursStart),
    workingHoursEnd: normalizeClockTime(offer?.workingHoursEnd),
    isPublished: Boolean(offer?.isPublished),
  };
}

function getLaborListings(user) {
  const rawListings = Array.isArray(user?.laborProfile?.listings) ? user.laborProfile.listings : [];

  if (rawListings.length > 0) {
    return rawListings
      .map(normalizeLaborOffer)
      .filter((listing) => listing.workerType);
  }

  const legacyOffer = normalizeLaborOffer(user?.laborProfile);

  if (!legacyOffer.workerType) {
    return [];
  }

  return laborOfferIsComplete(user, legacyOffer) ? [legacyOffer] : [];
}

function laborOfferIsComplete(user, offer) {
  const normalizedOffer = normalizeLaborOffer(offer);

  return Boolean(
    normalizedOffer.title &&
    normalizedOffer.description &&
    normalizedOffer.workerType &&
    normalizedOffer.rate > 0 &&
    normalizedOffer.availability &&
    normalizedOffer.skills.length > 0 &&
    normalizedOffer.workingHoursStart &&
    normalizedOffer.workingHoursEnd &&
    String(user?.profile?.experience || '').trim() &&
    String(user?.profile?.location || '').trim() &&
    String(user?.phone || '').trim(),
  );
}

function syncPrimaryLaborProfileFromListings(user) {
  const listings = getLaborListings(user);
  const primaryListing = listings[0];

  if (!primaryListing) {
    user.laborProfile.title = '';
    user.laborProfile.description = '';
    user.laborProfile.workerType = '';
    user.laborProfile.rate = 0;
    user.laborProfile.availability = 'Available';
    user.laborProfile.skills = [];
    user.laborProfile.distance = '';
    user.laborProfile.serviceArea = '';
    user.laborProfile.workingHoursStart = '';
    user.laborProfile.workingHoursEnd = '';
    user.laborProfile.isPublished = false;
    return;
  }

  user.laborProfile.title = primaryListing.title;
  user.laborProfile.description = primaryListing.description;
  user.laborProfile.workerType = primaryListing.workerType;
  user.laborProfile.rate = primaryListing.rate;
  user.laborProfile.availability = primaryListing.availability;
  user.laborProfile.skills = primaryListing.skills;
  user.laborProfile.distance = primaryListing.distance;
  user.laborProfile.serviceArea = primaryListing.serviceArea;
  user.laborProfile.workingHoursStart = primaryListing.workingHoursStart;
  user.laborProfile.workingHoursEnd = primaryListing.workingHoursEnd;
  user.laborProfile.isPublished = primaryListing.isPublished;
}

function buildLaborOfferPayload(user) {
  const listings = getLaborListings(user);
  const primaryListing = listings[0];
  const verifiedSkills = getVerifiedLaborSkills(user);

  return {
    title: primaryListing?.title || '',
    description: primaryListing?.description || '',
    workerType: primaryListing?.workerType || '',
    rate: Number(primaryListing?.rate || 0),
    availability: primaryListing?.availability || 'Unavailable',
    skills: primaryListing?.skills || [],
    verifiedSkills,
    distance: primaryListing?.distance || '',
    serviceArea: primaryListing?.serviceArea || '',
    workingHoursStart: primaryListing?.workingHoursStart || '',
    workingHoursEnd: primaryListing?.workingHoursEnd || '',
    workingHoursLabel: formatWorkingHoursRange(primaryListing?.workingHoursStart, primaryListing?.workingHoursEnd),
    rating: Number(user?.laborProfile?.rating || 0),
    isPublished: Boolean(primaryListing?.isPublished),
    listings,
    experience: formatExperienceYears(user.profile?.experience || ''),
    location: user.profile?.location || '',
    phone: user.phone || '',
  };
}

export async function getCurrentUser(req, res) {
  res.json({
    user: await sanitizeUser(req.user),
    stats: getProfileStats(req.user),
  });
}

export async function getWalletSummary(req, res) {
  res.json({
    wallet: buildWalletSummary(req.user),
  });
}

export async function requestWalletCashOut(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    const amount = Number(req.body?.amount || 0);
    const destination = normalizeCashOutDestination(req.body || {});

    if (!['gcash', 'paymaya', 'card'].includes(destination.method)) {
      return res.status(400).json({
        message: 'Choose GCash, PayMaya, or card for cash out.',
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        message: 'Enter a valid cash-out amount.',
      });
    }

    if ((destination.method === 'gcash' || destination.method === 'paymaya')) {
      if (!destination.accountName || !destination.mobileNumber) {
        return res.status(400).json({
          message: 'Account name and mobile number are required for wallet cash outs.',
        });
      }

      if (!isValidPhilippineMobile(destination.mobileNumber)) {
        return res.status(400).json({
          message: 'Enter a valid Philippine mobile number for wallet cash out.',
        });
      }
    }

    if (destination.method === 'card') {
      if (!destination.cardholderName || !destination.cardBrand || destination.cardLast4.length !== 4) {
        return res.status(400).json({
          message: 'Cardholder name, card brand, and last 4 digits are required for card cash out.',
        });
      }
    }

    const reference = buildWalletTransactionId('CASHOUT');
    const destinationLabel = buildCashOutDestinationLabel(destination);

    debitWalletForCashOut(req.user, amount, {
      id: reference,
      method: destination.method,
      reference,
      destinationLabel,
      description: `Cash out to ${destination.method === 'paymaya' ? 'PayMaya' : destination.method === 'gcash' ? 'GCash' : 'card'}`,
      status: 'completed',
    });

    appendActivity(req.user, {
      description: `Cashed out ${formatPhpCurrency(amount)} from wallet`,
      status: 'completed',
    });

    await req.user.save();

    return res.json({
      message: 'Wallet cash out completed successfully.',
      wallet: buildWalletSummary(req.user),
      user: await sanitizeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCurrentUser(req, res, next) {
  try {
    const { name, email, phone, profile = {} } = req.body;
    const nextName = typeof name === 'string' ? name.trim() : req.user.name;
    const nextEmail = typeof email === 'string' ? email.trim().toLowerCase() : req.user.email;
    const nextPhone = typeof phone === 'string' ? phone.trim() : req.user.phone;
    const nextProfile = {
      ...req.user.profile?.toObject?.(),
      ...req.user.profile,
      ...profile,
    };
    const previousSnapshot = JSON.stringify({
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      profile: req.user.profile?.toObject?.() || req.user.profile || {},
    });

    if (typeof name === 'string') {
      req.user.name = nextName;
    }

    if (typeof email === 'string') {
      const normalizedEmail = nextEmail;

      if (!normalizedEmail) {
        return res.status(400).json({
          message: 'Email is required.',
        });
      }

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: req.user._id },
      });

      if (existingUser) {
        return res.status(409).json({
          message: 'That email address is already in use.',
        });
      }

      if (normalizedEmail !== String(req.user.email || '').trim().toLowerCase()) {
        return res.status(400).json({
          message: 'Verify your new email address before it can replace the current one.',
        });
      }
    }

    let phoneVerificationTriggered = false;
    let profileMessage = 'Profile updated successfully.';

    if (typeof phone === 'string') {
      const normalizedPhone = normalizePhilippinePhone(nextPhone);
      const currentPhone = normalizePhilippinePhone(req.user.phone || '');

      if (normalizedPhone && !isValidPhilippineMobile(normalizedPhone)) {
        return res.status(400).json({
          message: 'Please enter a valid Philippine mobile number.',
        });
      }

      if (normalizedPhone !== currentPhone) {
        if (!normalizedPhone) {
          req.user.phone = '';
          req.user.phoneVerification = {
            status: 'unverified',
            source: 'email',
            code: '',
            expiresAt: null,
            requestedAt: null,
            verifiedAt: null,
            pendingPhone: '',
          };
          profileMessage = 'Profile updated successfully. Your phone number has been cleared.';
        } else {
          await issuePhoneVerificationCode(req.user, normalizedPhone);
          phoneVerificationTriggered = true;
          profileMessage =
            'Profile updated successfully. We sent a verification code to your email to verify the new phone number.';
        }
      }
    }

    if (typeof profile.avatarPath === 'string' && profile.avatarPath.trim()) {
      profile.avatarPath = profile.avatarPath.trim();
    }

    req.user.profile = nextProfile;

    if (!req.user.profile.firstName && typeof name === 'string') {
      req.user.profile.firstName = name.trim();
    }

    ensurePrivilegedAccess(req.user);

    const nextSnapshot = JSON.stringify({
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      profile: req.user.profile,
    });

    if (previousSnapshot !== nextSnapshot) {
      appendActivity(req.user, {
        description: 'Updated profile information',
        status: 'confirmed',
      });
    }

    await req.user.save();

    res.json({
      message: profileMessage,
      user: await sanitizeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
}

export async function requestEmailChange(req, res, next) {
  try {
    const nextEmail = String(req.body?.email || '').trim().toLowerCase();

    if (!nextEmail) {
      return res.status(400).json({
        message: 'New email is required.',
      });
    }

    if (!isValidEmail(nextEmail)) {
      return res.status(400).json({
        message: 'Please enter a valid email address.',
      });
    }

    if (nextEmail === String(req.user.email || '').trim().toLowerCase()) {
      return res.status(400).json({
        message: 'That email is already your current email address.',
      });
    }

    const existingUser = await User.findOne({
      email: nextEmail,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'That email address is already in use.',
      });
    }

    const code = buildEmailVerificationCode();
    const { now, expiresAt } = buildVerificationWindow();

    req.user.emailVerification = {
      code,
      expiresAt,
      requestedAt: now,
      verifiedAt: null,
      pendingEmail: nextEmail,
    };

    appendActivity(req.user, {
      description: `Requested email change to ${nextEmail}`,
      status: 'pending',
      createdAt: now,
    });
    await req.user.save();

    await sendEmailChangeVerificationCode({
      toEmail: nextEmail,
      code,
      name: req.user.name,
    });

    res.json({
      message: 'A verification code was sent to your new email address.',
      pendingEmail: nextEmail,
      requestedAt: now.toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function requestPhoneChange(req, res, next) {
  try {
    const requestedPhone = normalizePhilippinePhone(String(req.body?.phone || req.user.phone || '').trim());

    if (!requestedPhone) {
      return res.status(400).json({
        message: 'Enter a phone number first.',
      });
    }

    if (!isValidPhilippineMobile(requestedPhone)) {
      return res.status(400).json({
        message: 'Please enter a valid Philippine mobile number.',
      });
    }

    const { now, normalizedPhone } = await issuePhoneVerificationCode(req.user, requestedPhone);

    appendActivity(req.user, {
      description: `Requested phone verification for ${normalizedPhone}`,
      status: 'pending',
      createdAt: now,
    });
    await req.user.save();

    return res.json({
      message: 'A verification code was sent to your email for the selected phone number.',
      pendingPhone: normalizedPhone,
      requestedAt: now.toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyPhoneChange(req, res, next) {
  try {
    const phone = normalizePhilippinePhone(String(req.body?.phone || '').trim());
    const code = String(req.body?.code || '').trim();
    const pendingPhone = normalizePhilippinePhone(req.user.phoneVerification?.pendingPhone || req.user.phone || '');

    if (!phone || !code) {
      return res.status(400).json({
        message: 'Phone number and verification code are required.',
      });
    }

    if (!pendingPhone || phone !== pendingPhone) {
      return res.status(400).json({
        message: 'There is no pending verification for that phone number.',
      });
    }

    if (
      !req.user.phoneVerification?.code ||
      req.user.phoneVerification.code !== code ||
      !req.user.phoneVerification.expiresAt ||
      new Date(req.user.phoneVerification.expiresAt).getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message: 'The verification code is invalid or has expired.',
      });
    }

    req.user.phone = pendingPhone;
    req.user.phoneVerification = {
      status: 'verified',
      source: 'email',
      code: '',
      expiresAt: null,
      requestedAt: req.user.phoneVerification?.requestedAt || null,
      verifiedAt: new Date(),
      pendingPhone: '',
    };

    appendActivity(req.user, {
      description: `Verified phone number ${pendingPhone}`,
      status: 'completed',
    });
    await req.user.save();

    return res.json({
      message: 'Phone number verified successfully.',
      user: await sanitizeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelPhoneChange(req, res, next) {
  try {
    req.user.phoneVerification = {
      status: 'unverified',
      source: 'email',
      code: '',
      expiresAt: null,
      requestedAt: null,
      verifiedAt: null,
      pendingPhone: '',
    };
    await req.user.save();

    return res.json({
      message: 'Phone verification request cancelled.',
      user: await sanitizeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmailChange(req, res, next) {
  try {
    const nextEmail = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();

    if (!nextEmail || !code) {
      return res.status(400).json({
        message: 'Email and verification code are required.',
      });
    }

    if (!req.user.emailVerification?.pendingEmail || req.user.emailVerification.pendingEmail !== nextEmail) {
      return res.status(400).json({
        message: 'There is no pending email change for that address.',
      });
    }

    if (!isEmailVerificationCodeValid(req.user, code)) {
      return res.status(400).json({
        message: 'The verification code is invalid or has expired.',
      });
    }

    const existingUser = await User.findOne({
      email: nextEmail,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'That email address is already in use.',
      });
    }

    req.user.email = nextEmail;
    req.user.emailVerified = true;
    req.user.emailVerification = {
      code: '',
      expiresAt: null,
      requestedAt: req.user.emailVerification?.requestedAt || null,
      verifiedAt: new Date(),
      pendingEmail: '',
    };

    appendActivity(req.user, {
      description: `Changed account email to ${nextEmail}`,
      status: 'completed',
    });
    await req.user.save();

    res.json({
      message: 'Email address updated successfully.',
      user: await sanitizeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
}

export async function applyForRole(req, res, next) {
  try {
    const { role, application = {} } = req.body || {};

    if (!['seller', 'laborer'].includes(role)) {
      return res.status(400).json({
        message: 'Only seller and laborer role applications are supported.',
      });
    }

    if (!canManageCommercialFeatures(req.user)) {
      return res.status(403).json({
        message: 'This account is currently restricted from marketplace and workforce actions.',
      });
    }

    if (req.user.phoneVerification?.status !== 'verified' || !String(req.user.phone || '').trim()) {
      return res.status(403).json({
        message: 'Verify your phone number first before booking a laborer.',
      });
    }

    if (!Array.isArray(req.user.roles) || req.user.roles.length === 0) {
      req.user.roles = ['buyer'];
    }

    const now = new Date();
    const documents = Array.isArray(application.documents) ? application.documents : [];
    const details = application.details || {};
    const idNumber = String(details.idNumber || '').trim();

    if (!details.idType || !idNumber) {
      return res.status(400).json({
        message: 'KYC requires an ID type and ID number.',
      });
    }

    if (!/^\d+$/.test(idNumber)) {
      return res.status(400).json({
        message: 'ID number must contain numbers only.',
      });
    }

    if (!details.addressConfirmed || !details.selfieConfirmed || !details.riskAccepted || !details.consentAccepted) {
      return res.status(400).json({
        message: 'Please complete all identity and consent confirmations before submitting verification.',
      });
    }

    const profileAddress = buildVerificationProfileAddress(req.user.profile);

    if (role === 'seller') {
      const sellerDocumentTypes = new Set(documents.map((document) => document?.type));

      if (!details.farmProofType) {
        return res.status(400).json({
          message: 'Seller KYC requires you to choose the farm proof document type.',
        });
      }

      if (
        !sellerDocumentTypes.has('id-front') ||
        !sellerDocumentTypes.has('id-back') ||
        !sellerDocumentTypes.has('selfie')
      ) {
        return res.status(400).json({
          message: 'Seller KYC requires ID front, ID back, and a clear selfie.',
        });
      }

      if (
        !sellerDocumentTypes.has('farm-proof') &&
        !sellerDocumentTypes.has('barangay-certificate') &&
        !sellerDocumentTypes.has('farm-photos') &&
        !sellerDocumentTypes.has('rsbsa')
      ) {
        return res.status(400).json({
          message: 'Seller verification requires at least one farm proof document.',
        });
      }

      if (!req.user.roles.includes('seller')) {
        req.user.roles.push('seller');
      }

      await deleteVerificationDocuments(req.user.verification?.seller?.documents || []);

      req.user.accountType = 'vendor';
      req.user.verification.seller = {
        status: 'pending',
        submittedAt: now,
        verifiedAt: null,
        rejectedAt: null,
        reviewReason: '',
        documents,
        details: {
          idType: details.idType,
          idNumber,
          farmProofType: details.farmProofType,
          profileAddress,
          addressConfirmed: Boolean(details.addressConfirmed),
          selfieConfirmed: Boolean(details.selfieConfirmed),
          riskAccepted: Boolean(details.riskAccepted),
          consentAccepted: Boolean(details.consentAccepted),
        },
      };
    }

    if (role === 'laborer') {
      const laborerDocumentTypes = new Set(documents.map((document) => document?.type));

      if (
        !laborerDocumentTypes.has('id-front') ||
        !laborerDocumentTypes.has('id-back') ||
        !laborerDocumentTypes.has('selfie')
      ) {
        return res.status(400).json({
          message: 'Laborer KYC requires ID front, ID back, and a clear selfie.',
        });
      }

      if (!Array.isArray(application.skills) || application.skills.length === 0) {
        return res.status(400).json({
          message: 'Choose at least one labor skill before submitting verification.',
        });
      }

      if (!details.laborProofType) {
        return res.status(400).json({
          message: 'Laborer KYC requires you to choose the proof document type.',
        });
      }

      if (!laborerDocumentTypes.has('work-proof')) {
        return res.status(400).json({
          message: 'Laborer KYC requires the selected work proof document.',
        });
      }

      const normalizedExperience = normalizeExperienceYears(application.experience || '');

      if (!normalizedExperience) {
        return res.status(400).json({
          message: 'Laborer KYC requires your work experience.',
        });
      }

      if (!String(application.description || '').trim()) {
        return res.status(400).json({
          message: 'Laborer KYC requires a work summary.',
        });
      }

      if (!req.user.roles.includes('laborer')) {
        req.user.roles.push('laborer');
      }

      await deleteVerificationDocuments(req.user.verification?.laborer?.documents || []);

      req.user.accountType = 'laborer';
      req.user.verification.laborer = {
        status: 'pending',
        submittedAt: now,
        verifiedAt: null,
        rejectedAt: null,
        reviewReason: '',
        documents,
        details: {
          idType: details.idType,
          idNumber,
          farmProofType: '',
          profileAddress,
          addressConfirmed: Boolean(details.addressConfirmed),
          selfieConfirmed: Boolean(details.selfieConfirmed),
          riskAccepted: Boolean(details.riskAccepted),
          consentAccepted: Boolean(details.consentAccepted),
          experience: normalizedExperience,
          description: String(application.description || '').trim(),
          laborProofType: details.laborProofType,
          skills: application.skills,
        },
      };
      req.user.laborProfile.skills = application.skills;
      req.user.laborProfile.availability = req.user.laborProfile.availability || 'Available';
      req.user.profile.experience = normalizedExperience || req.user.profile.experience;
      req.user.profile.specialization = String(application.description || '').trim() || req.user.profile.specialization;
    }

    await req.user.save();

    appendActivity(req.user, {
      description: `${role.charAt(0).toUpperCase() + role.slice(1)} verification submitted`,
      status: 'pending',
      createdAt: now,
    });
    await req.user.save();

    res.json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} verification submitted. It is now pending review.`,
      user: await sanitizeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
}

export async function createVerificationUploadUrl(req, res, next) {
  try {
    const { role, documentType, fileName } = req.body || {};

    if (!role || !documentType || !fileName) {
      return res.status(400).json({
        message: 'Role, document type, and file name are required.',
      });
    }

    const upload = await createVerificationUploadTarget({
      userId: req.user._id.toString(),
      role,
      documentType,
      fileName,
    });

    res.json(upload);
  } catch (error) {
    next(error);
  }
}

export async function createProfileAvatarUploadUrl(req, res, next) {
  try {
    const { fileName } = req.body || {};

    if (!fileName) {
      return res.status(400).json({
        message: 'File name is required.',
      });
    }

    const upload = await createProfileAvatarUploadTarget({
      userId: req.user._id.toString(),
      fileName,
    });

    res.json(upload);
  } catch (error) {
    next(error);
  }
}

export async function getDashboardData(req, res, next) {
  try {
    const user = req.user;
    const recentActivities = getUserActivities(user).map((activity, index) => ({
      id: `${new Date(activity.createdAt).getTime()}-${index}`,
      description: activity.description,
      status: activity.status || 'confirmed',
      createdAt: new Date(activity.createdAt).toISOString(),
    }));

    res.json({
      user: await sanitizeUser(user),
      stats: getProfileStats(user).map((stat, index) => ({
        ...stat,
        change:
          stat.label === 'Total Sales'
            ? 'seller earnings'
            : stat.label === 'Total Purchases'
              ? 'buyer purchases'
              : stat.label === 'Workers Hired'
                ? 'labor bookings'
                : stat.label === 'Labor Rate'
                  ? 'current hourly rate'
                  : stat.label === 'Availability'
                    ? 'booking status'
                    : stat.label === 'Worker Rating'
                      ? 'from completed jobs'
                : stat.label === 'Active Jobs'
                  ? 'worker jobs'
                  : stat.label === 'Completed Jobs'
                    ? 'finished assignments'
                  : 'service bookings',
        tone:
          stat.label === 'Total Sales'
            ? 'sales'
            : stat.label === 'Total Purchases'
              ? 'purchases'
              : stat.label === 'Workers Hired'
                ? 'workers'
                : stat.label === 'Labor Rate'
                  ? 'sales'
                  : stat.label === 'Availability'
                    ? 'laborer'
                    : stat.label === 'Worker Rating'
                      ? 'workers'
                : stat.label === 'Active Jobs'
                  ? 'laborer'
                  : stat.label === 'Completed Jobs'
                    ? 'laborer'
                  : 'services',
        icon:
          stat.label === 'Total Sales'
            ? 'DollarSign'
            : stat.label === 'Total Purchases'
              ? 'DollarSign'
              : stat.label === 'Workers Hired'
                ? 'Users'
                : stat.label === 'Labor Rate'
                  ? 'DollarSign'
                  : stat.label === 'Availability'
                    ? 'Truck'
                    : stat.label === 'Worker Rating'
                      ? 'TrendingUp'
                : stat.label === 'Active Jobs'
                  ? 'TrendingUp'
                  : stat.label === 'Completed Jobs'
                    ? 'TrendingUp'
                  : 'Truck',
        id: index,
      })),
      recentActivities,
      upcomingTasks: [],
    });
  } catch (error) {
    next(error);
  }
}

export async function getMarketplaceData(req, res, next) {
  try {
    const vendors = await User.find(roleQuery('seller'));
    const visibleVendors = vendors.filter((vendor) => canManageCommercialFeatures(vendor));

    const products = visibleVendors.flatMap((vendor) =>
      vendor.marketplaceListings.map((listing, index) => ({
        id: `${vendor._id}-${index}`,
        ...listing.toObject(),
        seller: vendor.profile?.farmName || vendor.name,
        vendorEmail: vendor.email,
      })),
    );

    res.json({
      products,
      myListings:
        hasRole(req.user, 'seller') && canManageCommercialFeatures(req.user)
          ? req.user.marketplaceListings.map((listing, index) => ({
              id: `${req.user._id}-${index}`,
              ...listing.toObject(),
              quantity: listing.stock,
              status: Number(listing.stock) > 0 ? 'active' : 'sold out',
            }))
          : [],
      canManageListings: hasRole(req.user, 'seller') && canManageCommercialFeatures(req.user),
    });
  } catch (error) {
    next(error);
  }
}

export async function getLaborData(req, res, next) {
  try {
      const currentUser = req.user || null;
      const laborers = await User.find(roleQuery('laborer'));
      const viewerProvince = getPrimaryProvinceLabel(currentUser?.profile);
      const currentUserActiveBookings = Array.isArray(currentUser?.laborBookings?.activeBookings)
        ? currentUser.laborBookings.activeBookings
        : [];
    const currentUserBookingHistory = Array.isArray(currentUser?.laborBookings?.bookingHistory)
      ? currentUser.laborBookings.bookingHistory
      : [];

    res.json({
        availableWorkers: laborers.flatMap((laborer) =>
          getLaborListings(laborer)
            .filter(
                (listing) =>
                  canManageCommercialFeatures(laborer) &&
                  listing.isPublished &&
                  laborOfferIsComplete(laborer, listing) &&
                  (!currentUser || belongsToSameProvince(currentUser?.profile, laborer?.profile)),
              )
              .map((listing) => ({
              id: `${laborer._id.toString()}-${listing.workerType}`,
            workerId: laborer._id.toString(),
            name: laborer.name,
            title: listing.title,
            description: listing.description,
            type: listing.workerType,
            rating: laborer.laborProfile.rating,
            experience: formatExperienceYears(laborer.profile.experience),
            rate: listing.rate,
            availability: listing.availability,
            skills: listing.skills,
            distance: listing.distance,
            serviceArea: listing.serviceArea,
              location: laborer.profile.location,
              email: laborer.email,
              phone: laborer.phone,
              bookedSlots: (Array.isArray(laborer.laborProfile?.activeBookings) ? laborer.laborProfile.activeBookings : [])
                .map((booking) => ({
                  bookingId: String(booking?.bookingId || '').trim(),
                  date: String(booking?.date || '').trim(),
                  time: String(booking?.time || '').trim(),
                  duration: String(booking?.duration || '').trim(),
                  status: String(booking?.status || '').trim(),
                }))
                .filter((booking) => booking.date && booking.time && booking.duration),
              workingHoursStart: listing.workingHoursStart,
                workingHoursEnd: listing.workingHoursEnd,
                workingHoursLabel: formatWorkingHoursRange(listing.workingHoursStart, listing.workingHoursEnd),
              })),
        ),
        viewerProvince,
        activeBookings: currentUserActiveBookings.map((booking, bookingIndex) => ({
          id: `my-active-${bookingIndex}`,
          ...(booking.toObject?.() || booking),
      })),
        bookingHistory: currentUserBookingHistory.map((booking, bookingIndex) => ({
          id: `my-history-${bookingIndex}`,
          ...(booking.toObject?.() || booking),
        })),
        canOfferLabor: hasRole(currentUser, 'laborer') && canManageCommercialFeatures(currentUser),
        myLaborProfile: hasRole(currentUser, 'laborer') && canManageCommercialFeatures(currentUser)
          ? buildLaborOfferPayload(currentUser)
          : null,
        myActiveJobs:
          hasRole(currentUser, 'laborer') && canManageCommercialFeatures(currentUser)
            ? currentUser.laborProfile.activeBookings || []
            : [],
        myJobHistory:
          hasRole(currentUser, 'laborer') && canManageCommercialFeatures(currentUser)
            ? currentUser.laborProfile.bookingHistory || []
            : [],
      });
  } catch (error) {
    next(error);
  }
}

export async function upsertLaborOffer(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    if (!hasRole(req.user, 'laborer')) {
      return res.status(403).json({
        message: 'Only laborers can create labor offers.',
      });
    }

    if (!canManageCommercialFeatures(req.user)) {
      return res.status(403).json({
        message: 'This account is currently restricted from marketplace and workforce actions.',
      });
    }

    const workerType = String(req.body?.workerType || '').trim();
    const description = String(req.body?.description || '').trim();
    const availability = String(req.body?.availability || '').trim();
    const location = String(req.body?.location || '').trim();
    const experience = normalizeExperienceYears(req.body?.experience || '');
    const phone = String(req.body?.phone || '').trim();
    const rate = Number(req.body?.rate);
    const workingHoursStart = normalizeClockTime(req.body?.workingHoursStart);
    const workingHoursEnd = normalizeClockTime(req.body?.workingHoursEnd);
    const verifiedSkills = getVerifiedLaborSkills(req.user);
    const existingListings = getLaborListings(req.user);
    const matchedListingIndex = existingListings.findIndex((listing) => listing.workerType === workerType);
    const title = workerType ? `${workerType} Labor` : '';

    if (verifiedSkills.length === 0) {
      return res.status(400).json({
        message: 'No verified labor skills were found for this account.',
      });
    }

    if (!workerType) {
      return res.status(400).json({
        message: 'Choose which labor you will provide from your verified skills.',
      });
    }

    if (!verifiedSkills.includes(workerType)) {
      return res.status(400).json({
        message: 'The selected labor must match one of your verified skills.',
      });
    }

    if (
      !title ||
      !workerType ||
      !description ||
      !availability ||
      !location ||
      !experience ||
      !phone ||
      !workingHoursStart ||
      !workingHoursEnd ||
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      return res.status(400).json({
        message:
          'Labor type, description, rate, availability, working hours, address verification, experience, and phone are required.',
      });
    }

    if (convertClockTimeToMinutes(workingHoursStart) >= convertClockTimeToMinutes(workingHoursEnd)) {
      return res.status(400).json({
        message: 'Working hours end time must be later than the start time.',
      });
    }

    const hadExistingOffer = matchedListingIndex >= 0;
    const nextListing = {
      title,
      workerType,
      description,
      rate,
      availability,
      skills: verifiedSkills,
      distance: '',
      serviceArea: '',
      workingHoursStart,
      workingHoursEnd,
      isPublished: true,
    };

    req.user.phone = phone;
    req.user.profile.location = location;
    req.user.profile.experience = experience;

    if (!Array.isArray(req.user.laborProfile.listings)) {
      req.user.laborProfile.listings = [];
    }

    if (matchedListingIndex >= 0) {
      req.user.laborProfile.listings[matchedListingIndex] = nextListing;
    } else {
      req.user.laborProfile.listings.push(nextListing);
    }

    syncPrimaryLaborProfileFromListings(req.user);

    appendActivity(req.user, {
      description: hadExistingOffer
        ? `Updated labor offer: ${title}`
        : `Created labor offer: ${title}`,
      status: 'confirmed',
    });

    await req.user.save();

    res.json({
      message: 'Labor offer saved successfully.',
      laborOffer: buildLaborOfferPayload(req.user),
    });
  } catch (error) {
    next(error);
  }
}

export async function createLaborBooking(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    if (!canManageCommercialFeatures(req.user)) {
      return res.status(403).json({
        message: 'This account is currently restricted from marketplace and workforce actions.',
      });
    }

    const workerId = String(req.body?.workerId || '').trim();
    const workerType = String(req.body?.workerType || '').trim();
    const date = String(req.body?.date || '').trim();
    const time = String(req.body?.time || '').trim();
    const duration = String(req.body?.duration || '').trim();
    const location = String(req.body?.location || '').trim();

    if (!workerId || !workerType || !date || !time || !duration || !location) {
      return res.status(400).json({
        message: 'Worker, labor type, date, time, duration, and location are required.',
      });
    }

    const worker = await User.findOne({
      _id: workerId,
      ...roleQuery('laborer'),
    });

    const selectedListing = getLaborListings(worker).find((listing) => listing.workerType === workerType);

    if (
      !worker ||
      !selectedListing ||
      !canManageCommercialFeatures(worker) ||
      !selectedListing.isPublished ||
      !laborOfferIsComplete(worker, selectedListing)
    ) {
      return res.status(404).json({
        message: 'Selected worker is not available for booking.',
      });
    }

    const numericRate = Number(selectedListing.rate || req.body?.rate || 0);
    const durationHours = parseInt(duration, 10);
    const bookingCost = Number.isFinite(durationHours) && durationHours > 0
      ? numericRate * durationHours
      : numericRate;
    const bookingType = String(
      req.body?.type || selectedListing.workerType || worker.profile?.specialization || 'Labor',
    ).trim();
    const bookingId = buildLaborBookingId();
    const buyerName = String(req.user.name || '').trim() || 'Authenticated User';
    const buyerEmail = String(req.user.email || '').trim().toLowerCase();
    const buyerPhone = String(req.user.phone || '').trim();
    const requestedTimeMinutes = convertClockTimeToMinutes(time);
    const workingHoursStartMinutes = convertClockTimeToMinutes(selectedListing.workingHoursStart);
    const workingHoursEndMinutes = convertClockTimeToMinutes(selectedListing.workingHoursEnd);
    const durationHoursValue = getDurationHours(duration);

    if (
      requestedTimeMinutes === null ||
      workingHoursStartMinutes === null ||
      workingHoursEndMinutes === null
    ) {
      return res.status(400).json({
        message:
          workingHoursStartMinutes === null || workingHoursEndMinutes === null
            ? 'This labor listing does not have a valid working-hours schedule yet.'
            : 'Enter a valid booking time within the laborer’s working hours.',
      });
    }

    if (requestedTimeMinutes < workingHoursStartMinutes || requestedTimeMinutes > workingHoursEndMinutes) {
      return res.status(400).json({
        message: `Bookings for this laborer are only available from ${formatWorkingHoursRange(selectedListing.workingHoursStart, selectedListing.workingHoursEnd)}.`,
      });
    }

    if (durationHoursValue !== null && requestedTimeMinutes + durationHoursValue * 60 > workingHoursEndMinutes) {
      return res.status(400).json({
        message: `This booking extends past the laborer's working hours of ${formatWorkingHoursRange(selectedListing.workingHoursStart, selectedListing.workingHoursEnd)}.`,
      });
    }

    if (durationHoursValue === null) {
      return res.status(400).json({
        message: 'Choose a valid booking duration in whole hours.',
      });
    }

    const workerActiveBookings = Array.isArray(worker?.laborProfile?.activeBookings)
      ? worker.laborProfile.activeBookings
      : [];

    if (hasLaborBookingTimeConflict(workerActiveBookings, date, requestedTimeMinutes, durationHoursValue)) {
      return res.status(409).json({
        message: 'This worker is already booked for part of that time range on the selected date.',
      });
    }

    const buyerBooking = {
      bookingId,
      worker: worker.name,
      workerId: worker._id.toString(),
      workerEmail: String(worker.email || '').trim().toLowerCase(),
      workerPhone: String(worker.phone || '').trim(),
      type: bookingType,
      date,
      time,
      duration,
      location,
      rate: numericRate,
      status: 'confirmed',
      cost: bookingCost,
      bookedByUserId: req.user._id.toString(),
      bookedByName: buyerName,
      bookedByEmail: buyerEmail,
      bookedByPhone: buyerPhone,
      travelTracking: createTravelTrackingSnapshot(),
    };

    const workerBooking = {
      ...buyerBooking,
      worker: buyerName,
    };

    if (!req.user.laborBookings) {
      req.user.laborBookings = {
        activeBookings: [],
        bookingHistory: [],
      };
    }

    req.user.laborBookings.activeBookings = [
      ...(Array.isArray(req.user.laborBookings.activeBookings) ? req.user.laborBookings.activeBookings : []),
      buyerBooking,
    ];

    worker.laborProfile.activeBookings = [
      ...(Array.isArray(worker.laborProfile?.activeBookings) ? worker.laborProfile.activeBookings : []),
      workerBooking,
    ];

    appendActivity(req.user, {
      description: `Booked worker ${worker.name} for ${date}`,
      status: 'confirmed',
    });

    await Promise.all([req.user.save(), worker.save()]);

    res.status(201).json({
      message: 'Worker booked successfully.',
      booking: buyerBooking,
    });
  } catch (error) {
    next(error);
  }
}

export async function markLaborBookingOnTheWay(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    if (!hasRole(req.user, 'laborer')) {
      return res.status(403).json({
        message: 'Only laborers can update travel tracking for labor bookings.',
      });
    }

    const bookingId = String(req.params?.bookingId || req.body?.bookingId || '').trim();
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);

    if (!bookingId) {
      return res.status(400).json({
        message: 'A booking reference is required.',
      });
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({
        message: 'A valid current location is required to start travel tracking.',
      });
    }

    const activeBookings = Array.isArray(req.user?.laborProfile?.activeBookings)
      ? req.user.laborProfile.activeBookings
      : [];
    const bookingIndex = activeBookings.findIndex((booking) => String(booking?.bookingId || '').trim() === bookingId);

    if (bookingIndex < 0) {
      return res.status(404).json({
        message: 'That active labor booking could not be found on this worker account.',
      });
    }

    const workerBooking = activeBookings[bookingIndex];

    if (String(workerBooking?.date || '').trim() !== getCurrentManilaDateString()) {
      return res.status(400).json({
        message: 'Travel tracking can only be started on the actual booking day.',
      });
    }

    const buyerUserId = String(workerBooking?.bookedByUserId || '').trim();
    const buyer = buyerUserId ? await User.findById(buyerUserId) : null;

    if (!buyer) {
      return res.status(404).json({
        message: 'The client account for this booking could not be found.',
      });
    }

    const buyerActiveBookings = Array.isArray(buyer?.laborBookings?.activeBookings)
      ? buyer.laborBookings.activeBookings
      : [];
    const buyerBookingIndex = buyerActiveBookings.findIndex((booking) => String(booking?.bookingId || '').trim() === bookingId);

    if (buyerBookingIndex < 0) {
      return res.status(404).json({
        message: 'The mirrored client booking record could not be found.',
      });
    }

    const now = new Date();
    const nextTravelTracking = createTravelTrackingSnapshot({
      ...(workerBooking?.travelTracking?.toObject?.() || workerBooking?.travelTracking || {}),
      isOnTheWay: true,
      startedAt: workerBooking?.travelTracking?.startedAt || now,
      updatedAt: now,
      currentLocation: {
        lat,
        lng,
      },
    });

    req.user.laborProfile.activeBookings[bookingIndex] = {
      ...(workerBooking.toObject?.() || workerBooking),
      status: 'on_the_way',
      travelTracking: nextTravelTracking,
    };

    buyer.laborBookings.activeBookings[buyerBookingIndex] = {
      ...(buyerActiveBookings[buyerBookingIndex].toObject?.() || buyerActiveBookings[buyerBookingIndex]),
      status: 'on_the_way',
      travelTracking: nextTravelTracking,
    };

    await Promise.all([req.user.save(), buyer.save()]);

    res.json({
      message: 'Travel tracking is now live for this booking.',
      booking: buyer.laborBookings.activeBookings[buyerBookingIndex],
    });
  } catch (error) {
    next(error);
  }
}

export async function markLaborBookingCompleted(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    const bookingId = String(req.params?.bookingId || req.body?.bookingId || '').trim();

    if (!bookingId) {
      return res.status(400).json({
        message: 'A booking reference is required.',
      });
    }

    const buyerActiveBookings = Array.isArray(req.user?.laborBookings?.activeBookings)
      ? req.user.laborBookings.activeBookings
      : [];
    const workerActiveBookings = Array.isArray(req.user?.laborProfile?.activeBookings)
      ? req.user.laborProfile.activeBookings
      : [];

    const buyerBookingIndex = buyerActiveBookings.findIndex(
      (booking) => String(booking?.bookingId || '').trim() === bookingId,
    );
    const workerBookingIndex = workerActiveBookings.findIndex(
      (booking) => String(booking?.bookingId || '').trim() === bookingId,
    );

    const isBuyerConfirming = buyerBookingIndex >= 0;
    const isWorkerConfirming = workerBookingIndex >= 0;

    if (!isBuyerConfirming && !isWorkerConfirming) {
      return res.status(404).json({
        message: 'That active labor booking could not be found on this account.',
      });
    }

    const sourceBooking = isBuyerConfirming
      ? buyerActiveBookings[buyerBookingIndex]
      : workerActiveBookings[workerBookingIndex];

    if (String(sourceBooking?.date || '').trim() !== getCurrentManilaDateString()) {
      return res.status(409).json({
        message: 'Labor bookings can only be marked as completed on the booked date.',
      });
    }

    if (String(sourceBooking?.status || '').trim() === 'cancelled') {
      return res.status(409).json({
        message: 'Cancelled labor bookings cannot be marked as completed.',
      });
    }

    const counterpartUserId = isBuyerConfirming
      ? String(sourceBooking?.workerId || '').trim()
      : String(sourceBooking?.bookedByUserId || '').trim();

    const counterpartUser = counterpartUserId ? await User.findById(counterpartUserId) : null;

    if (!counterpartUser) {
      return res.status(404).json({
        message: 'The other party for this labor booking could not be found.',
      });
    }

    if (!counterpartUser.laborBookings) {
      counterpartUser.laborBookings = {
        activeBookings: [],
        bookingHistory: [],
      };
    }

    if (!counterpartUser.laborProfile) {
      counterpartUser.laborProfile = {
        activeBookings: [],
        bookingHistory: [],
      };
    }

    const counterpartActiveBookings = isBuyerConfirming
      ? Array.isArray(counterpartUser?.laborProfile?.activeBookings)
        ? counterpartUser.laborProfile.activeBookings
        : []
      : Array.isArray(counterpartUser?.laborBookings?.activeBookings)
        ? counterpartUser.laborBookings.activeBookings
        : [];

    const counterpartBookingIndex = counterpartActiveBookings.findIndex(
      (booking) => String(booking?.bookingId || '').trim() === bookingId,
    );

    if (counterpartBookingIndex < 0) {
      return res.status(404).json({
        message: 'The matching labor booking record could not be found for the other party.',
      });
    }

    const counterpartBooking = counterpartActiveBookings[counterpartBookingIndex];
    const confirmationTime = new Date();

    const localBookingSnapshot = sourceBooking.toObject?.() || sourceBooking;
    const counterpartBookingSnapshot = counterpartBooking.toObject?.() || counterpartBooking;

    const nextLocalConfirmation = {
      ...(localBookingSnapshot.completionConfirmation || {}),
      ...(isBuyerConfirming
        ? { clientConfirmedAt: confirmationTime }
        : { workerConfirmedAt: confirmationTime }),
    };
    const nextCounterpartConfirmation = {
      ...(counterpartBookingSnapshot.completionConfirmation || {}),
      ...(isBuyerConfirming
        ? { clientConfirmedAt: confirmationTime }
        : { workerConfirmedAt: confirmationTime }),
    };

    const clientConfirmedAt = nextLocalConfirmation.clientConfirmedAt || nextCounterpartConfirmation.clientConfirmedAt;
    const workerConfirmedAt = nextLocalConfirmation.workerConfirmedAt || nextCounterpartConfirmation.workerConfirmedAt;
    const bothConfirmed = Boolean(clientConfirmedAt && workerConfirmedAt);

    const nextLocalBooking = {
      ...localBookingSnapshot,
      completionConfirmation: {
        clientConfirmedAt: clientConfirmedAt || null,
        workerConfirmedAt: workerConfirmedAt || null,
      },
      completedAt: bothConfirmed ? confirmationTime : localBookingSnapshot.completedAt || null,
      status: bothConfirmed ? 'completed' : localBookingSnapshot.status || 'confirmed',
    };
    const nextCounterpartBooking = {
      ...counterpartBookingSnapshot,
      completionConfirmation: {
        clientConfirmedAt: clientConfirmedAt || null,
        workerConfirmedAt: workerConfirmedAt || null,
      },
      completedAt: bothConfirmed ? confirmationTime : counterpartBookingSnapshot.completedAt || null,
      status: bothConfirmed ? 'completed' : counterpartBookingSnapshot.status || 'confirmed',
    };

    if (isBuyerConfirming) {
      req.user.laborBookings.activeBookings[buyerBookingIndex] = nextLocalBooking;
      counterpartUser.laborProfile.activeBookings[counterpartBookingIndex] = nextCounterpartBooking;
    } else {
      req.user.laborProfile.activeBookings[workerBookingIndex] = nextLocalBooking;
      counterpartUser.laborBookings.activeBookings[counterpartBookingIndex] = nextCounterpartBooking;
    }

    if (bothConfirmed) {
      if (isBuyerConfirming) {
        req.user.laborBookings.activeBookings = buyerActiveBookings.filter((_, index) => index !== buyerBookingIndex);
        req.user.laborBookings.bookingHistory = [
          ...(Array.isArray(req.user.laborBookings.bookingHistory) ? req.user.laborBookings.bookingHistory : []),
          nextLocalBooking,
        ];
        counterpartUser.laborProfile.activeBookings = counterpartActiveBookings.filter(
          (_, index) => index !== counterpartBookingIndex,
        );
        counterpartUser.laborProfile.bookingHistory = [
          ...(Array.isArray(counterpartUser?.laborProfile?.bookingHistory)
            ? counterpartUser.laborProfile.bookingHistory
            : []),
          nextCounterpartBooking,
        ];
      } else {
        req.user.laborProfile.activeBookings = workerActiveBookings.filter((_, index) => index !== workerBookingIndex);
        req.user.laborProfile.bookingHistory = [
          ...(Array.isArray(req.user.laborProfile.bookingHistory) ? req.user.laborProfile.bookingHistory : []),
          nextLocalBooking,
        ];
        counterpartUser.laborBookings.activeBookings = counterpartActiveBookings.filter(
          (_, index) => index !== counterpartBookingIndex,
        );
        counterpartUser.laborBookings.bookingHistory = [
          ...(Array.isArray(counterpartUser?.laborBookings?.bookingHistory)
            ? counterpartUser.laborBookings.bookingHistory
            : []),
          nextCounterpartBooking,
        ];
      }

      appendActivity(req.user, {
        description: `Completed labor booking ${bookingId}`,
        status: 'completed',
      });
      appendActivity(counterpartUser, {
        description: `Completed labor booking ${bookingId}`,
        status: 'completed',
      });
    } else {
      appendActivity(req.user, {
        description: `Confirmed completion for labor booking ${bookingId}`,
        status: 'confirmed',
      });
    }

    const laborPayment = await LaborPayment.findOne({ bookingId });

    if (laborPayment) {
      laborPayment.bookingId = bookingId;
      if (bothConfirmed) {
        const workerUser = isBuyerConfirming ? counterpartUser : req.user;

        if (laborPayment.releaseStatus !== 'released') {
          const releaseAmount = Number(laborPayment.subtotal || 0);

          creditWallet(workerUser, releaseAmount, {
            id: buildWalletTransactionId('WALLET'),
            method: 'labor_payment',
            reference: laborPayment.reference || bookingId,
            description: `Labor earnings from booking ${bookingId}`,
            destinationLabel: '',
            status: 'completed',
            createdAt: confirmationTime,
          });

          appendActivity(workerUser, {
            description: `Wallet credited for labor booking ${bookingId}`,
            status: 'completed',
          });
        }

        laborPayment.status = 'released';
        laborPayment.releaseStatus = 'released';
        laborPayment.releasedAt = laborPayment.releasedAt || confirmationTime;
        laborPayment.releaseFailureReason = '';
      }
      laborPayment.paidAt = laborPayment.paidAt || confirmationTime;
      await laborPayment.save();
    }

    await Promise.all([req.user.save(), counterpartUser.save()]);

    return res.json({
      message: bothConfirmed
        ? 'Both sides confirmed the labor booking. It has been marked as completed.'
        : isBuyerConfirming
          ? 'Your completion confirmation has been recorded. Waiting for the laborer to confirm.'
          : 'Your completion confirmation has been recorded. Waiting for the client to confirm.',
      booking: isBuyerConfirming
        ? bothConfirmed
          ? nextLocalBooking
          : req.user.laborBookings.activeBookings[buyerBookingIndex]
        : bothConfirmed
          ? nextLocalBooking
          : req.user.laborProfile.activeBookings[workerBookingIndex],
      completed: bothConfirmed,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelLaborBooking(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    const bookingId = String(req.params?.bookingId || req.body?.bookingId || '').trim();

    if (!bookingId) {
      return res.status(400).json({
        message: 'A booking reference is required.',
      });
    }

    const buyerActiveBookings = Array.isArray(req.user?.laborBookings?.activeBookings)
      ? req.user.laborBookings.activeBookings
      : [];
    const workerActiveBookings = Array.isArray(req.user?.laborProfile?.activeBookings)
      ? req.user.laborProfile.activeBookings
      : [];

    const buyerBookingIndex = buyerActiveBookings.findIndex(
      (booking) => String(booking?.bookingId || '').trim() === bookingId,
    );
    const workerBookingIndex = workerActiveBookings.findIndex(
      (booking) => String(booking?.bookingId || '').trim() === bookingId,
    );

    const isBuyerCancelling = buyerBookingIndex >= 0;
    const isWorkerCancelling = workerBookingIndex >= 0;

    if (!isBuyerCancelling && !isWorkerCancelling) {
      return res.status(404).json({
        message: 'That active labor booking could not be found on this account.',
      });
    }

    const sourceBooking = isBuyerCancelling
      ? buyerActiveBookings[buyerBookingIndex]
      : workerActiveBookings[workerBookingIndex];

    if (isBuyerCancelling && String(sourceBooking?.date || '').trim() === getCurrentManilaDateString()) {
      return res.status(409).json({
        message:
          'This labor booking can no longer be cancelled on the booking date. The booked time remains payable whether the client is present or not.',
      });
    }

    const cancelledAt = new Date();
    const nextCancelledBooking = {
      ...(sourceBooking.toObject?.() || sourceBooking),
      status: 'cancelled',
      cancelledAt,
      travelTracking: createTravelTrackingSnapshot(sourceBooking?.travelTracking),
    };

    if (!req.user.laborBookings) {
      req.user.laborBookings = {
        activeBookings: [],
        bookingHistory: [],
      };
    }

    if (!req.user.laborProfile) {
      req.user.laborProfile = {
        activeBookings: [],
        bookingHistory: [],
      };
    }

    const finalizeLocalCancellation = async (message) => {
      if (isBuyerCancelling) {
        req.user.laborBookings.activeBookings = buyerActiveBookings.filter((_, index) => index !== buyerBookingIndex);
        req.user.laborBookings.bookingHistory = [
          ...(Array.isArray(req.user.laborBookings.bookingHistory) ? req.user.laborBookings.bookingHistory : []),
          nextCancelledBooking,
        ];
      } else {
        req.user.laborProfile.activeBookings = workerActiveBookings.filter((_, index) => index !== workerBookingIndex);
        req.user.laborProfile.bookingHistory = [
          ...(Array.isArray(req.user.laborProfile.bookingHistory) ? req.user.laborProfile.bookingHistory : []),
          nextCancelledBooking,
        ];
      }

      appendActivity(req.user, {
        description: `Cancelled labor booking ${bookingId}`,
        status: 'cancelled',
      });

      await req.user.save();

      return res.json({
        message,
        booking: nextCancelledBooking,
      });
    };

    const counterpartUserId = isBuyerCancelling
      ? String(sourceBooking?.workerId || '').trim()
      : String(sourceBooking?.bookedByUserId || '').trim();

    const counterpartUser = counterpartUserId ? await User.findById(counterpartUserId) : null;

    if (!counterpartUser) {
      return finalizeLocalCancellation(
        isBuyerCancelling
          ? 'Labor booking removed from your account. The worker record was no longer available.'
          : 'Labor booking removed from your account. The client record was no longer available.',
      );
    }

    const counterpartActiveBookings = isBuyerCancelling
      ? Array.isArray(counterpartUser?.laborProfile?.activeBookings)
        ? counterpartUser.laborProfile.activeBookings
        : []
      : Array.isArray(counterpartUser?.laborBookings?.activeBookings)
        ? counterpartUser.laborBookings.activeBookings
        : [];

    const counterpartBookingIndex = counterpartActiveBookings.findIndex(
      (booking) => String(booking?.bookingId || '').trim() === bookingId,
    );

    if (counterpartBookingIndex < 0) {
      return finalizeLocalCancellation(
        'Labor booking removed from your account. The mirrored booking record was no longer available.',
      );
    }

    const nextCounterpartCancelledBooking = {
      ...(counterpartActiveBookings[counterpartBookingIndex].toObject?.() || counterpartActiveBookings[counterpartBookingIndex]),
      status: 'cancelled',
      cancelledAt,
      travelTracking: createTravelTrackingSnapshot(counterpartActiveBookings[counterpartBookingIndex]?.travelTracking),
    };

    if (isBuyerCancelling) {
      req.user.laborBookings.activeBookings = buyerActiveBookings.filter((_, index) => index !== buyerBookingIndex);
      req.user.laborBookings.bookingHistory = [
        ...(Array.isArray(req.user.laborBookings.bookingHistory) ? req.user.laborBookings.bookingHistory : []),
        nextCancelledBooking,
      ];

      counterpartUser.laborProfile.activeBookings = counterpartActiveBookings.filter(
        (_, index) => index !== counterpartBookingIndex,
      );
      counterpartUser.laborProfile.bookingHistory = [
        ...(Array.isArray(counterpartUser?.laborProfile?.bookingHistory) ? counterpartUser.laborProfile.bookingHistory : []),
        nextCounterpartCancelledBooking,
      ];
    } else {
      req.user.laborProfile.activeBookings = workerActiveBookings.filter((_, index) => index !== workerBookingIndex);
      req.user.laborProfile.bookingHistory = [
        ...(Array.isArray(req.user.laborProfile.bookingHistory) ? req.user.laborProfile.bookingHistory : []),
        nextCancelledBooking,
      ];

      counterpartUser.laborBookings.activeBookings = counterpartActiveBookings.filter(
        (_, index) => index !== counterpartBookingIndex,
      );
      counterpartUser.laborBookings.bookingHistory = [
        ...(Array.isArray(counterpartUser?.laborBookings?.bookingHistory) ? counterpartUser.laborBookings.bookingHistory : []),
        nextCounterpartCancelledBooking,
      ];
    }

    appendActivity(req.user, {
      description: `Cancelled labor booking ${bookingId}`,
      status: 'cancelled',
    });

    appendActivity(counterpartUser, {
      description: `Labor booking ${bookingId} was cancelled`,
      status: 'cancelled',
    });

    await Promise.all([req.user.save(), counterpartUser.save()]);

    res.json({
      message: 'Labor booking cancelled successfully.',
      booking: isBuyerCancelling ? nextCancelledBooking : nextCounterpartCancelledBooking,
    });
  } catch (error) {
    next(error);
  }
}

export async function getServicesData(_req, res, next) {
  try {
    const providers = await User.find(roleQuery('service'));
    const visibleProviders = providers.filter((provider) => canManageCommercialFeatures(provider));

    const grouped = visibleProviders.map((provider) => ({
      id: provider._id.toString(),
      category: provider.serviceProfile.category,
      categoryId:
        provider.serviceProfile.category === 'Equipment Rental'
          ? 'equipment'
          : provider.serviceProfile.category === 'Maintenance'
            ? 'maintenance'
            : provider.serviceProfile.category === 'Irrigation Services'
              ? 'irrigation'
              : 'harvesting',
      provider: provider.name,
      contact: provider.phone,
      services: provider.serviceProfile.services.map((service, index) => ({
        id: `${provider._id}-${index}`,
        ...service.toObject(),
        provider: provider.name,
      })),
      bookings: provider.serviceProfile.bookings.map((booking, index) => ({
        id: Number(`${String(index + 1)}${String(index + 1)}`),
        ...booking.toObject(),
      })),
    }));

    res.json({
      providers: grouped,
      bookings: grouped.flatMap((group) => group.bookings),
    });
  } catch (error) {
    next(error);
  }
}
