import { User } from '../models/User.js';
import { appendActivity } from '../utils/activityLog.js';
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
import { createVerificationDocumentSignedUrl } from '../utils/verificationStorage.js';

function sanitizeAdminUser(user) {
  const roles = getUserRoles(user);
  const verification = getVerificationState(user);

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    accountType: user.accountType,
    roles,
    isAdmin: hasRole(user, 'admin'),
    isSuperAdmin: isSuperAdmin(user),
    accountStatus: user.accountStatus || 'active',
    disabledAt: user.disabledAt || null,
    disabledReason: user.disabledReason || '',
    pendingDisableAt: user.pendingDisableAt || null,
    pendingDisableReason: user.pendingDisableReason || '',
    pendingDeleteAt: user.pendingDeleteAt || null,
    pendingDeleteReason: user.pendingDeleteReason || '',
    emailVerified: Boolean(user.emailVerified),
    verification,
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
    penalty: getPenaltyState(user),
    canManageCommercialFeatures: canManageCommercialFeatures(user),
    profile: {
      farmName: user.profile?.farmName || '',
      location: user.profile?.location || user.profile?.address || '',
      experience: user.profile?.experience || '',
      specialization: user.profile?.specialization || '',
    },
    counts: {
      listings: Array.isArray(user.marketplaceListings) ? user.marketplaceListings.length : 0,
      laborActiveBookings: Array.isArray(user.laborProfile?.activeBookings)
        ? user.laborProfile.activeBookings.length
        : 0,
      laborHistoryBookings: Array.isArray(user.laborProfile?.bookingHistory)
        ? user.laborProfile.bookingHistory.length
        : 0,
      services: Array.isArray(user.serviceProfile?.services) ? user.serviceProfile.services.length : 0,
      serviceBookings: Array.isArray(user.serviceProfile?.bookings)
        ? user.serviceProfile.bookings.length
        : 0,
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function hasActiveLaborBookings(user) {
  return Array.isArray(user?.laborProfile?.activeBookings) && user.laborProfile.activeBookings.length > 0;
}

function hasPendingServiceBookings(user) {
  return Array.isArray(user?.serviceProfile?.bookings)
    && user.serviceProfile.bookings.some((booking) => {
      const status = String(booking?.status || '').trim().toLowerCase();
      return status && !['completed', 'cancelled'].includes(status);
    });
}

function hasActiveBuyerBookings(user) {
  return Array.isArray(user?.laborBookings?.activeBookings) && user.laborBookings.activeBookings.length > 0;
}

function hasActiveBookings(user) {
  return hasActiveLaborBookings(user) || hasPendingServiceBookings(user) || hasActiveBuyerBookings(user);
}

async function hasBlockingActiveBookingLinks(userId) {
  const normalizedUserId = String(userId || '').trim();

  if (!normalizedUserId) {
    return false;
  }

  const linkedUser = await User.exists({
    _id: { $ne: normalizedUserId },
    $or: [
      {
        'laborBookings.activeBookings': {
          $elemMatch: {
            workerId: normalizedUserId,
          },
        },
      },
      {
        'laborProfile.activeBookings': {
          $elemMatch: {
            bookedByUserId: normalizedUserId,
          },
        },
      },
    ],
  });

  return Boolean(linkedUser);
}

function clearPendingDisable(user) {
  user.pendingDisableAt = null;
  user.pendingDisableReason = '';
}

function clearPendingDelete(user) {
  user.pendingDeleteAt = null;
  user.pendingDeleteReason = '';
}

function applyDisableState(user, reason = '') {
  user.accountStatus = 'disabled';
  user.disabledAt = new Date();
  user.disabledReason = String(reason || '').trim();
  clearPendingDisable(user);
}

async function applyPendingDisableIfEligible(user) {
  if (!user?.pendingDisableAt || user.accountStatus === 'disabled' || hasActiveBookings(user)) {
    return false;
  }

  applyDisableState(user, user.pendingDisableReason || user.disabledReason || '');
  appendActivity(user, {
    description: `Queued account disable took effect after active bookings finished${user.disabledReason ? `: ${user.disabledReason}` : ''}`,
    status: 'confirmed',
  });
  await user.save();
  return true;
}

async function deleteUserRecord(user) {
  await removeDeletedUserReferences(user._id.toString());
  await User.deleteOne({ _id: user._id });
}

async function applyPendingDeleteIfEligible(user) {
  if (
    !user?.pendingDeleteAt
    || hasActiveBookings(user)
    || await hasBlockingActiveBookingLinks(user._id.toString())
  ) {
    return false;
  }

  await deleteUserRecord(user);
  return true;
}

async function removeDeletedUserReferences(userId) {
  const normalizedUserId = String(userId || '').trim();

  if (!normalizedUserId) {
    return;
  }

  await User.updateMany(
    {},
    {
      $pull: {
        'laborBookings.activeBookings': {
          $or: [{ workerId: normalizedUserId }, { bookedByUserId: normalizedUserId }],
        },
        'laborProfile.activeBookings': {
          $or: [{ workerId: normalizedUserId }, { bookedByUserId: normalizedUserId }],
        },
      },
    },
  );
}

function buildPenaltyPayload({
  status = 'good',
  reason = '',
  notes = '',
  penalizedBy = '',
  expiresAt = null,
} = {}) {
  return {
    status,
    reason: String(reason || '').trim(),
    notes: String(notes || '').trim(),
    penalizedBy: String(penalizedBy || '').trim(),
    penalizedAt: status === 'good' ? null : new Date(),
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  };
}

function flattenMarketplaceListings(vendors) {
  return vendors.flatMap((vendor) =>
    (vendor.marketplaceListings || []).map((listing, listingIndex) => ({
      id: `${vendor._id.toString()}-${listingIndex}`,
      userId: vendor._id.toString(),
      listingIndex,
      seller: vendor.profile?.farmName || vendor.name,
      sellerEmail: vendor.email,
      verification: getVerificationState(vendor).seller,
      ...listing.toObject(),
    })),
  );
}

function flattenLaborBookings(laborers) {
  return laborers.flatMap((laborer) => [
    ...(laborer.laborProfile?.activeBookings || []).map((booking, bookingIndex) => ({
      id: `${laborer._id.toString()}-active-${bookingIndex}`,
      userId: laborer._id.toString(),
      bookingIndex,
      bookingType: 'active',
      workerName: laborer.name,
      workerEmail: laborer.email,
      ...booking.toObject(),
    })),
    ...(laborer.laborProfile?.bookingHistory || []).map((booking, bookingIndex) => ({
      id: `${laborer._id.toString()}-history-${bookingIndex}`,
      userId: laborer._id.toString(),
      bookingIndex,
      bookingType: 'history',
      workerName: laborer.name,
      workerEmail: laborer.email,
      ...booking.toObject(),
    })),
  ]);
}

function flattenServiceProviders(providers) {
  return providers.map((provider) => ({
    id: provider._id.toString(),
    name: provider.name,
    email: provider.email,
    category: provider.serviceProfile?.category || '',
    services: (provider.serviceProfile?.services || []).map((service, serviceIndex) => ({
      id: `${provider._id.toString()}-service-${serviceIndex}`,
      serviceIndex,
      ...service.toObject(),
    })),
    bookings: (provider.serviceProfile?.bookings || []).map((booking, bookingIndex) => ({
      id: `${provider._id.toString()}-booking-${bookingIndex}`,
      bookingIndex,
      ...booking.toObject(),
    })),
  }));
}

async function flattenVerifications(users) {
  const verificationGroups = await Promise.all(
    users.map(async (user) => {
    const items = [];

    for (const role of ['seller', 'laborer']) {
      const entry = user.verification?.[role];

      if (!entry || (entry.status === 'unverified' && (!entry.documents || entry.documents.length === 0))) {
        continue;
      }

      items.push({
        id: `${user._id.toString()}-${role}`,
        userId: user._id.toString(),
        userName: user.name,
        userEmail: user.email,
        role,
        status: entry.status || 'unverified',
        submittedAt: entry.submittedAt || null,
        verifiedAt: entry.verifiedAt || null,
        rejectedAt: entry.rejectedAt || null,
        reviewReason: entry.reviewReason || '',
        details: entry.details || {},
        documents: await Promise.all(
          (entry.documents || []).map(async (document, index) => {
            let signedUrl = '';

            try {
              const signedDocument = await createVerificationDocumentSignedUrl(
                document.path,
                document.bucket,
              );
              signedUrl = signedDocument.url;
            } catch {
              signedUrl = '';
            }

            return {
              id: `${user._id.toString()}-${role}-${index}`,
              type: document.type,
              originalName: document.originalName,
              uploadedAt: document.uploadedAt,
              bucket: document.bucket,
              path: document.path,
              signedUrl,
            };
          }),
        ),
      });
    }

    return items;
    }),
  );

  return verificationGroups.flat();
}

async function buildAdminOverview() {
  const users = await User.find().sort({ createdAt: -1 });

  for (const user of users) {
    if (ensurePrivilegedAccess(user)) {
      await user.save();
    }
  }

  const vendors = users.filter((user) => hasRole(user, 'seller'));
  const laborers = users.filter((user) => hasRole(user, 'laborer'));
  const serviceProviders = users.filter((user) => hasRole(user, 'service'));
  const marketplaceListings = flattenMarketplaceListings(vendors);
  const laborBookings = flattenLaborBookings(laborers);
  const serviceProviderGroups = flattenServiceProviders(serviceProviders);
  const verifications = await flattenVerifications(users);

  return {
    metrics: {
      totalUsers: users.length,
      totalAdmins: users.filter((user) => hasRole(user, 'admin')).length,
      totalSellers: vendors.length,
      totalLaborers: laborers.length,
      totalServiceProviders: serviceProviders.length,
      totalMarketplaceItems: marketplaceListings.length,
      totalLaborBookings: laborBookings.length,
      totalServiceBookings: serviceProviderGroups.reduce(
        (sum, provider) => sum + provider.bookings.length,
        0,
      ),
      pendingVerifications: verifications.filter((item) => item.status === 'pending').length,
    },
    users: users.map(sanitizeAdminUser),
    marketplaceListings,
    laborBookings,
    serviceProviders: serviceProviderGroups,
    verifications,
  };
}

export async function getAdminOverview(_req, res, next) {
  try {
    res.json(await buildAdminOverview());
  } catch (error) {
    next(error);
  }
}

export async function updateUserAdminAccess(req, res, next) {
  try {
    const { userId } = req.params;
    const { admin } = req.body || {};
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (isSuperAdmin(user) && admin === false) {
      return res.status(400).json({ message: 'Super admin access cannot be removed from this account.' });
    }

    const nextRoles = new Set(Array.isArray(user.roles) ? user.roles : []);
    nextRoles.add('buyer');

    if (admin) {
      nextRoles.add('admin');
      user.role = 'admin';
      user.accountType = 'admin';
    } else {
      nextRoles.delete('admin');
      user.role = 'user';
      user.accountType = hasRole(user, 'seller')
        ? 'vendor'
        : hasRole(user, 'laborer')
          ? 'laborer'
          : hasRole(user, 'service')
            ? 'service'
            : hasRole(user, 'operations')
              ? 'operations'
              : 'customer';
    }

    user.roles = Array.from(nextRoles);
    ensurePrivilegedAccess(user);
    appendActivity(user, {
      description: admin ? 'Admin access granted to this account' : 'Admin access removed from this account',
      status: 'confirmed',
    });
    await user.save();

    res.json({
      message: admin ? 'Admin access granted.' : 'Admin access removed.',
      user: sanitizeAdminUser(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateVerificationStatus(req, res, next) {
  try {
    const { userId } = req.params;
    const { role, status, reason = '' } = req.body || {};
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!['seller', 'laborer'].includes(role)) {
      return res.status(400).json({ message: 'Unsupported verification role.' });
    }

    if (!['verified', 'pending', 'unverified'].includes(status)) {
      return res.status(400).json({ message: 'Unsupported verification status.' });
    }

    if (status === 'unverified' && !String(reason).trim()) {
      return res.status(400).json({ message: 'A rejection reason is required.' });
    }

    user.verification[role].status = status;
    user.verification[role].verifiedAt = status === 'verified' ? new Date() : null;
    user.verification[role].rejectedAt = status === 'unverified' ? new Date() : null;
    user.verification[role].reviewReason = status === 'unverified' ? String(reason).trim() : '';

    const nextRoles = new Set(Array.isArray(user.roles) ? user.roles : []);
    nextRoles.add('buyer');

    if (status === 'verified') {
      nextRoles.add(role);
      user.accountType = role === 'seller' ? 'vendor' : 'laborer';
    } else if (status === 'unverified') {
      nextRoles.delete(role);
    }

    user.roles = Array.from(nextRoles);
    ensurePrivilegedAccess(user);
    appendActivity(user, {
      description:
        status === 'verified'
          ? `${role.charAt(0).toUpperCase() + role.slice(1)} verification approved`
          : status === 'unverified'
            ? `${role.charAt(0).toUpperCase() + role.slice(1)} verification rejected: ${String(reason).trim()}`
            : `${role.charAt(0).toUpperCase() + role.slice(1)} verification moved back to pending review`,
      status: status === 'verified' ? 'completed' : status === 'unverified' ? 'confirmed' : 'pending',
    });
    await user.save();

    res.json({
      message: `${role} verification updated to ${status}.`,
      user: sanitizeAdminUser(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserPenalty(req, res, next) {
  try {
    const { userId } = req.params;
    const { status, reason, notes, expiresAt } = req.body || {};
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (isSuperAdmin(user)) {
      return res.status(400).json({ message: 'Super admin accounts cannot be penalized.' });
    }

    if (!['good', 'warned', 'restricted', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Unsupported penalty status.' });
    }

    if (status !== 'good' && !String(reason || '').trim()) {
      return res.status(400).json({ message: 'Penalty reason is required.' });
    }

    const penaltyPayload = buildPenaltyPayload({
      status,
      reason,
      notes,
      penalizedBy: req.user?.email || req.user?.name || 'Admin',
      expiresAt,
    });

    user.penalty = penaltyPayload;
    user.penaltyHistory = [
      penaltyPayload,
      ...(Array.isArray(user.penaltyHistory) ? user.penaltyHistory : []),
    ].slice(0, 12);

    appendActivity(user, {
      description:
        status === 'good'
          ? 'Account penalty was cleared'
          : `Account status changed to ${status}${penaltyPayload.reason ? `: ${penaltyPayload.reason}` : ''}`,
      status: status === 'warned' ? 'confirmed' : status === 'good' ? 'completed' : 'pending',
    });
    await user.save();

    res.json({
      message:
        status === 'good'
          ? 'User penalty cleared.'
          : `User account marked as ${status}.`,
      user: sanitizeAdminUser(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function softDeleteUser(req, res, next) {
  try {
    const { userId } = req.params;
    const { reason = '' } = req.body || {};
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (isSuperAdmin(user)) {
      return res.status(400).json({ message: 'Super admin accounts cannot be disabled.' });
    }

    if (req.user?._id?.toString() === user._id.toString()) {
      return res.status(400).json({ message: 'You cannot disable your own account.' });
    }

    const normalizedReason = String(reason || '').trim();

    if (hasActiveBookings(user) || await hasBlockingActiveBookingLinks(user._id.toString())) {
      user.pendingDisableAt = new Date();
      user.pendingDisableReason = normalizedReason;
      user.disabledReason = normalizedReason;

      appendActivity(user, {
        description: `Account disable queued until all active booking links are cleared${normalizedReason ? `: ${normalizedReason}` : ''}`,
        status: 'pending',
      });
      await user.save();

      return res.json({
        message:
          'User has active bookings or active booking links. The account disable is queued and will only take effect once those active bookings are cleared.',
        user: sanitizeAdminUser(user),
      });
    }

    applyDisableState(user, normalizedReason);

    appendActivity(user, {
      description: `Account disabled by super admin${user.disabledReason ? `: ${user.disabledReason}` : ''}`,
      status: 'confirmed',
    });
    await user.save();

    res.json({
      message: 'User account disabled.',
      user: sanitizeAdminUser(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function restoreUser(req, res, next) {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.accountStatus = 'active';
    user.disabledAt = null;
    user.disabledReason = '';
    clearPendingDisable(user);
    clearPendingDelete(user);

    appendActivity(user, {
      description: 'Account restored by super admin',
      status: 'completed',
    });
    await user.save();

    res.json({
      message: 'User account restored.',
      user: sanitizeAdminUser(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function permanentlyDeleteUser(req, res, next) {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (isSuperAdmin(user)) {
      return res.status(400).json({ message: 'Super admin accounts cannot be permanently deleted.' });
    }

    if (req.user?._id?.toString() === user._id.toString()) {
      return res.status(400).json({ message: 'You cannot permanently delete your own account.' });
    }

    if (hasActiveBookings(user) || await hasBlockingActiveBookingLinks(user._id.toString())) {
      user.pendingDeleteAt = user.pendingDeleteAt || new Date();

      appendActivity(user, {
        description: 'Account permanent delete queued until all active booking links are cleared',
        status: 'pending',
      });
      await user.save();

      return res.json({
        message:
          'User has active bookings or active booking links. The permanent delete is queued and will only take effect once those active bookings are cleared.',
        user: sanitizeAdminUser(user),
      });
    }

    await deleteUserRecord(user);

    res.json({
      message: 'User account and related listings data were permanently deleted.',
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteMarketplaceListing(req, res, next) {
  try {
    const { userId, listingIndex } = req.params;
    const vendor = await User.findById(userId);

    if (!vendor) {
      return res.status(404).json({ message: 'Seller not found.' });
    }

    const index = Number(listingIndex);

    if (!Number.isInteger(index) || index < 0 || index >= vendor.marketplaceListings.length) {
      return res.status(400).json({ message: 'Invalid listing index.' });
    }

    const removedListing = vendor.marketplaceListings[index];
    vendor.marketplaceListings.splice(index, 1);
    appendActivity(vendor, {
      description: `Marketplace listing removed: ${removedListing?.name || 'listing'}`,
      status: 'confirmed',
    });
    await vendor.save();

    res.json({ message: 'Marketplace listing removed.' });
  } catch (error) {
    next(error);
  }
}

export async function updateLaborBookingStatus(req, res, next) {
  try {
    const { userId, bookingType, bookingIndex } = req.params;
    const { status } = req.body || {};
    const laborer = await User.findById(userId);

    if (!laborer) {
      return res.status(404).json({ message: 'Laborer not found.' });
    }

    if (!['active', 'history'].includes(bookingType)) {
      return res.status(400).json({ message: 'Invalid labor booking type.' });
    }

    const index = Number(bookingIndex);
    const source =
      bookingType === 'active' ? laborer.laborProfile.activeBookings : laborer.laborProfile.bookingHistory;

    if (!Number.isInteger(index) || index < 0 || index >= source.length) {
      return res.status(400).json({ message: 'Invalid labor booking index.' });
    }

    const booking = source[index];
    const bookingDescription = booking?.type || booking?.worker || 'labor booking';
    const counterpartUserId =
      bookingType === 'active'
        ? String(
            source[index]?.bookedByUserId || source[index]?.workerId || '',
          ).trim()
        : '';
    booking.status = String(status || booking.status);

    if (bookingType === 'active' && ['completed', 'cancelled'].includes(booking.status)) {
      laborer.laborProfile.bookingHistory.push(booking);
      laborer.laborProfile.activeBookings.splice(index, 1);
    }

    appendActivity(laborer, {
      description: `Labor booking updated: ${bookingDescription} is now ${booking.status}`,
      status: booking.status === 'completed' ? 'completed' : booking.status === 'cancelled' ? 'confirmed' : 'pending',
    });
    await laborer.save();
    await applyPendingDisableIfEligible(laborer);
    await applyPendingDeleteIfEligible(laborer);

    if (counterpartUserId && counterpartUserId !== laborer._id.toString()) {
      const counterpartUser = await User.findById(counterpartUserId);

      if (counterpartUser) {
        await applyPendingDisableIfEligible(counterpartUser);
        await applyPendingDeleteIfEligible(counterpartUser);
      }
    }

    res.json({ message: 'Labor booking updated.' });
  } catch (error) {
    next(error);
  }
}

export async function updateServiceBookingStatus(req, res, next) {
  try {
    const { userId, bookingIndex } = req.params;
    const { status } = req.body || {};
    const provider = await User.findById(userId);

    if (!provider) {
      return res.status(404).json({ message: 'Service provider not found.' });
    }

    const index = Number(bookingIndex);

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= (provider.serviceProfile?.bookings || []).length
    ) {
      return res.status(400).json({ message: 'Invalid service booking index.' });
    }

    const booking = provider.serviceProfile.bookings[index];
    booking.status = String(status || booking.status);
    appendActivity(provider, {
      description: `Service booking updated: ${booking.service || 'service'} is now ${booking.status}`,
      status: booking.status === 'confirmed' ? 'completed' : booking.status === 'cancelled' ? 'confirmed' : 'pending',
    });
    await provider.save();
    await applyPendingDisableIfEligible(provider);
    await applyPendingDeleteIfEligible(provider);

    res.json({ message: 'Service booking updated.' });
  } catch (error) {
    next(error);
  }
}
