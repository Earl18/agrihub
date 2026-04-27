import { User } from '../models/User.js';
import { appendActivity, getUserActivities } from '../utils/activityLog.js';
import { getUserRoles, getVerificationState, hasRole, roleQuery } from '../utils/roles.js';
import {
  createProfileAvatarUploadTarget,
  createProfileAvatarSignedUrl,
  createVerificationUploadTarget,
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
    verification: getVerificationState(user),
    profile: await sanitizeProfile(user.profile),
  };
}

function getProfileStats(user) {
  const verification = getVerificationState(user);
  const listings = user.marketplaceListings || [];
  const activeJobs = Array.isArray(user.laborProfile?.activeBookings)
    ? user.laborProfile.activeBookings.length
    : 0;
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
      label: 'Active Jobs',
      value: String(activeJobs),
      color: 'text-teal-600',
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

      req.user.email = normalizedEmail;
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

export async function applyForRole(req, res, next) {
  try {
    const { role, application = {} } = req.body || {};

    if (!['seller', 'laborer'].includes(role)) {
      return res.status(400).json({
        message: 'Only seller and laborer role applications are supported.',
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

      req.user.accountType = 'vendor';
      req.user.verification.seller = {
        status: 'pending',
        submittedAt: now,
        verifiedAt: null,
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

      req.user.accountType = 'laborer';
      req.user.verification.laborer = {
        status: 'pending',
        submittedAt: now,
        verifiedAt: null,
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
                : stat.label === 'Active Jobs'
                  ? 'worker jobs'
                  : 'service bookings',
        tone:
          stat.label === 'Total Sales'
            ? 'sales'
            : stat.label === 'Total Purchases'
              ? 'purchases'
              : stat.label === 'Workers Hired'
                ? 'workers'
                : stat.label === 'Active Jobs'
                  ? 'laborer'
                  : 'services',
        icon:
          stat.label === 'Total Sales'
            ? 'DollarSign'
            : stat.label === 'Total Purchases'
              ? 'DollarSign'
              : stat.label === 'Workers Hired'
                ? 'Users'
                : stat.label === 'Active Jobs'
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

    const products = vendors.flatMap((vendor) =>
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
        hasRole(req.user, 'seller')
          ? req.user.marketplaceListings.map((listing, index) => ({
              id: `${req.user._id}-${index}`,
              ...listing.toObject(),
              quantity: listing.stock,
              status: Number(listing.stock) > 0 ? 'active' : 'sold out',
            }))
          : [],
      canManageListings: hasRole(req.user, 'seller'),
    });
  } catch (error) {
    next(error);
  }
}

export async function getLaborData(req, res, next) {
  try {
    const laborers = await User.find(roleQuery('laborer'));

    res.json({
      availableWorkers: laborers.map((laborer) => ({
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
      activeBookings: laborers.flatMap((laborer, laborerIndex) =>
        laborer.laborProfile.activeBookings.map((booking, bookingIndex) => ({
          id: `${laborerIndex}-${bookingIndex}`,
          ...booking.toObject(),
        })),
      ),
      bookingHistory: laborers.flatMap((laborer, laborerIndex) =>
        laborer.laborProfile.bookingHistory.map((booking, bookingIndex) => ({
          id: `${laborerIndex}-${bookingIndex}`,
          ...booking.toObject(),
        })),
      ),
      canOfferLabor: hasRole(req.user, 'laborer'),
      myLaborProfile: hasRole(req.user, 'laborer')
        ? {
            workerType: req.user.laborProfile.workerType,
            rate: req.user.laborProfile.rate,
            availability: req.user.laborProfile.availability,
            skills: req.user.laborProfile.skills,
            distance: req.user.laborProfile.distance,
            rating: req.user.laborProfile.rating,
          }
        : null,
      myActiveJobs: hasRole(req.user, 'laborer') ? req.user.laborProfile.activeBookings || [] : [],
      myJobHistory: hasRole(req.user, 'laborer') ? req.user.laborProfile.bookingHistory || [] : [],
    });
  } catch (error) {
    next(error);
  }
}

export async function getServicesData(_req, res, next) {
  try {
    const providers = await User.find(roleQuery('service'));

    const grouped = providers.map((provider) => ({
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
