import { User } from '../models/User.js';
import { appendActivity, getUserActivities } from '../utils/activityLog.js';
import { sendEmailChangeVerificationCode } from '../utils/mailer.js';
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

function getProfileStats(user) {
  const verification = getVerificationState(user);
  const listings = user.marketplaceListings || [];
  const activeJobs = Array.isArray(user.laborProfile?.activeBookings)
    ? user.laborProfile.activeBookings.length
    : 0;
  const completedJobs = Array.isArray(user.laborProfile?.bookingHistory)
    ? user.laborProfile.bookingHistory.filter((booking) => booking?.status === 'completed').length
    : 0;
  const laborRate = Number(user.laborProfile?.rate || 0);
  const laborAvailability = String(user.laborProfile?.availability || 'Unavailable').trim() || 'Unavailable';
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
      value: `$${totalPurchases.toLocaleString()}`,
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
      value: `$${totalSales.toLocaleString()}`,
      color: 'text-green-600',
    });
  }

  if (verification.laborer === 'verified') {
    stats.push({
      label: 'Labor Rate',
      value: `$${laborRate}/hr`,
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

export async function getCurrentUser(req, res) {
  res.json({
    user: await sanitizeUser(req.user),
    stats: getProfileStats(req.user),
  });
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

    if (typeof phone === 'string') {
      req.user.phone = nextPhone;
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
      message: 'Profile updated successfully.',
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

      if (!String(application.experience || '').trim()) {
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
          addressConfirmed: Boolean(details.addressConfirmed),
          selfieConfirmed: Boolean(details.selfieConfirmed),
          riskAccepted: Boolean(details.riskAccepted),
          consentAccepted: Boolean(details.consentAccepted),
          experience: String(application.experience || '').trim(),
          description: String(application.description || '').trim(),
          laborProofType: details.laborProofType,
          skills: application.skills,
        },
      };
      req.user.laborProfile.workerType = application.skills[0];
      req.user.laborProfile.skills = application.skills;
      req.user.laborProfile.availability = req.user.laborProfile.availability || 'Available';
      req.user.profile.experience = String(application.experience || '').trim() || req.user.profile.experience;
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
    const laborers = await User.find(roleQuery('laborer'));
    const availableLaborers = laborers.filter((laborer) => canManageCommercialFeatures(laborer));
    const currentUserActiveBookings = Array.isArray(req.user?.laborBookings?.activeBookings)
      ? req.user.laborBookings.activeBookings
      : [];
    const currentUserBookingHistory = Array.isArray(req.user?.laborBookings?.bookingHistory)
      ? req.user.laborBookings.bookingHistory
      : [];

    res.json({
      availableWorkers: availableLaborers.map((laborer) => ({
        id: laborer._id.toString(),
        name: laborer.name,
        type: laborer.laborProfile.workerType,
        rating: laborer.laborProfile.rating,
        experience: laborer.profile.experience,
        rate: laborer.laborProfile.rate,
        availability: laborer.laborProfile.availability,
        skills: laborer.laborProfile.skills,
        distance: laborer.laborProfile.distance,
      })),
      activeBookings: currentUserActiveBookings.map((booking, bookingIndex) => ({
        id: `my-active-${bookingIndex}`,
        ...(booking.toObject?.() || booking),
      })),
      bookingHistory: currentUserBookingHistory.map((booking, bookingIndex) => ({
        id: `my-history-${bookingIndex}`,
        ...(booking.toObject?.() || booking),
      })),
      canOfferLabor: hasRole(req.user, 'laborer') && canManageCommercialFeatures(req.user),
      myLaborProfile: hasRole(req.user, 'laborer') && canManageCommercialFeatures(req.user)
        ? {
            workerType: req.user.laborProfile.workerType,
            rate: req.user.laborProfile.rate,
            availability: req.user.laborProfile.availability,
            skills: req.user.laborProfile.skills,
            distance: req.user.laborProfile.distance,
            rating: req.user.laborProfile.rating,
          }
        : null,
      myActiveJobs:
        hasRole(req.user, 'laborer') && canManageCommercialFeatures(req.user)
          ? req.user.laborProfile.activeBookings || []
          : [],
      myJobHistory:
        hasRole(req.user, 'laborer') && canManageCommercialFeatures(req.user)
          ? req.user.laborProfile.bookingHistory || []
          : [],
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
    const date = String(req.body?.date || '').trim();
    const time = String(req.body?.time || '').trim();
    const duration = String(req.body?.duration || '').trim();
    const location = String(req.body?.location || '').trim();

    if (!workerId || !date || !time || !duration || !location) {
      return res.status(400).json({
        message: 'Worker, date, time, duration, and location are required.',
      });
    }

    const worker = await User.findOne({
      _id: workerId,
      ...roleQuery('laborer'),
    });

    if (!worker || !canManageCommercialFeatures(worker)) {
      return res.status(404).json({
        message: 'Selected worker is not available for booking.',
      });
    }

    const numericRate = Number(worker.laborProfile?.rate || req.body?.rate || 0);
    const durationHours = parseInt(duration, 10);
    const bookingCost = Number.isFinite(durationHours) && durationHours > 0
      ? numericRate * durationHours
      : numericRate;
    const bookingType = String(
      req.body?.type || worker.laborProfile?.workerType || worker.profile?.specialization || 'Labor',
    ).trim();
    const buyerName = String(req.user.name || '').trim() || 'Authenticated User';

    const buyerBooking = {
      worker: worker.name,
      workerId: worker._id.toString(),
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
