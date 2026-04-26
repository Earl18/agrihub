import { User } from '../models/User.js';
import { getUserRoles, getVerificationState, hasRole, roleQuery } from '../utils/roles.js';

function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    accountType: user.accountType,
    roles: getUserRoles(user),
    verification: getVerificationState(user),
    profile: user.profile,
  };
}

function getProfileStats(user) {
  const verification = getVerificationState(user);
  const listings = user.marketplaceListings || [];
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

  return stats;
}

export async function getCurrentUser(req, res) {
  res.json({
    user: sanitizeUser(req.user),
    stats: getProfileStats(req.user),
  });
}

export async function updateCurrentUser(req, res, next) {
  try {
    const { name, email, phone, profile = {} } = req.body;

    if (typeof name === 'string') {
      req.user.name = name.trim();
    }

    if (typeof email === 'string') {
      const normalizedEmail = email.trim().toLowerCase();

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
      req.user.phone = phone.trim();
    }

    req.user.profile = {
      ...req.user.profile?.toObject?.(),
      ...req.user.profile,
      ...profile,
    };

    if (!req.user.profile.firstName && typeof name === 'string') {
      req.user.profile.firstName = name.trim();
    }

    await req.user.save();

    res.json({
      message: 'Profile updated successfully.',
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
}

function buildRoleDashboardSections(user) {
  const roles = getUserRoles(user);
  const sections = [];

  sections.push({
    role: 'buyer',
    title: 'Buyer Dashboard',
    description: 'Purchase goods, hire workers, and acquire services.',
    stats: [
      { label: 'Active Roles', value: String(roles.length) },
      { label: 'Services Booked', value: String(user.serviceProfile?.bookings?.length || 0) },
      { label: 'Workers Hired', value: String(0) },
    ],
    highlights: [
      'You can browse the marketplace, hire laborers, and book service providers.',
      'Seller and laborer tools stay locked until the matching verification succeeds.',
    ],
  });

  if (hasRole(user, 'seller')) {
    const listings = user.marketplaceListings || [];
    sections.push({
      role: 'seller',
      title: 'Seller Dashboard',
      description: 'Manage listings and track marketplace performance.',
      stats: [
        { label: 'Listings', value: String(listings.length) },
        {
          label: 'Orders',
          value: String(listings.reduce((sum, listing) => sum + Number(listing.orders || 0), 0)),
        },
        {
          label: 'Views',
          value: String(listings.reduce((sum, listing) => sum + Number(listing.views || 0), 0)),
        },
      ],
      highlights: listings.length
        ? listings.slice(0, 3).map((listing) => `${listing.name}: ${listing.stock} ${listing.unit} available`)
        : ['Your seller verification is active. You can now add and manage marketplace listings.'],
    });
  }

  if (hasRole(user, 'laborer')) {
    const activeJobs = user.laborProfile?.activeBookings || [];
    const completedJobs = user.laborProfile?.bookingHistory || [];
    sections.push({
      role: 'laborer',
      title: 'Laborer Dashboard',
      description: 'Offer farm labor services and manage your job activity.',
      stats: [
        { label: 'Skills', value: String(user.laborProfile?.skills?.length || 0) },
        { label: 'Active Jobs', value: String(activeJobs.length) },
        { label: 'Completed Jobs', value: String(completedJobs.length) },
      ],
      highlights: activeJobs.length
        ? activeJobs.slice(0, 3).map((job) => `${job.worker} booked on ${job.date} at ${job.time}`)
        : ['Your laborer verification is active. You can now offer labor services and accept jobs.'],
    });
  }

  if (hasRole(user, 'service')) {
    sections.push({
      role: 'service',
      title: 'Service Dashboard',
      description: 'Operate your service catalog and provider bookings.',
      stats: [
        { label: 'Services', value: String(user.serviceProfile?.services?.length || 0) },
        { label: 'Bookings', value: String(user.serviceProfile?.bookings?.length || 0) },
        { label: 'Category', value: user.serviceProfile?.category || 'N/A' },
      ],
      highlights: ['Your service-provider tools are active for this account.'],
    });
  }

  return sections;
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

    if (role === 'seller') {
      if (!application.documents?.validId || !application.documents?.selfieWithId) {
        return res.status(400).json({
          message: 'Seller verification requires a valid ID and a selfie with ID.',
        });
      }

      if (!application.documents?.barangayCertificate && !application.documents?.farmPhotos && !application.documents?.rsbsa) {
        return res.status(400).json({
          message: 'Seller verification requires at least one farm proof document.',
        });
      }

      if (!req.user.roles.includes('seller')) {
        req.user.roles.push('seller');
      }

      req.user.accountType = 'vendor';
      req.user.verification.seller = {
        status: 'verified',
        submittedAt: now,
        verifiedAt: now,
      };
    }

    if (role === 'laborer') {
      if (!application.documents?.validId || !application.documents?.selfie) {
        return res.status(400).json({
          message: 'Laborer verification requires a valid ID and a selfie.',
        });
      }

      if (!Array.isArray(application.skills) || application.skills.length === 0) {
        return res.status(400).json({
          message: 'Choose at least one labor skill before submitting verification.',
        });
      }

      if (!req.user.roles.includes('laborer')) {
        req.user.roles.push('laborer');
      }

      req.user.accountType = 'laborer';
      req.user.verification.laborer = {
        status: 'verified',
        submittedAt: now,
        verifiedAt: now,
      };
      req.user.laborProfile.workerType = application.skills[0];
      req.user.laborProfile.skills = application.skills;
      req.user.laborProfile.availability = req.user.laborProfile.availability || 'Available';
      req.user.profile.experience = application.experience || req.user.profile.experience;
      req.user.profile.specialization = application.description || req.user.profile.specialization;
    }

    await req.user.save();

    res.json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} verification successful.`,
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardData(req, res, next) {
  try {
    const user = req.user;
    const recentActivities = [
      {
        id: 1,
        description: `${user.name} signed in to AgriHub`,
        time: 'Just now',
        status: 'completed',
      },
      {
        id: 2,
        description: 'Marketplace access is ready for your next purchase.',
        time: 'Live',
        status: 'confirmed',
      },
      {
        id: 3,
        description: 'Worker hiring tools are available from your dashboard.',
        time: 'Live',
        status: 'confirmed',
      },
      {
        id: 4,
        description: 'Service booking is available whenever you need it.',
        time: 'Live',
        status: 'pending',
      },
    ];

    res.json({
      user: sanitizeUser(user),
      stats: getProfileStats(user).map((stat, index) => ({
        ...stat,
        change:
          stat.label === 'Total Sales'
            ? 'seller earnings'
            : stat.label === 'Total Purchases'
              ? 'buyer purchases'
              : stat.label === 'Workers Hired'
                ? 'labor bookings'
                : 'service bookings',
        color:
          stat.label === 'Total Sales'
            ? 'from-green-500 to-emerald-600'
            : stat.label === 'Total Purchases'
              ? 'from-blue-500 to-blue-600'
              : stat.label === 'Workers Hired'
                ? 'from-purple-500 to-purple-600'
                : 'from-orange-500 to-orange-600',
        icon:
          stat.label === 'Total Sales'
            ? 'DollarSign'
            : stat.label === 'Total Purchases'
              ? 'DollarSign'
              : stat.label === 'Workers Hired'
                ? 'Users'
                : 'Truck',
        id: index,
      })),
      recentActivities,
      upcomingTasks: [],
      roleSections: buildRoleDashboardSections(user),
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
