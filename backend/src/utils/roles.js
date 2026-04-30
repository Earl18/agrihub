const LEGACY_ACCOUNT_TYPE_TO_ROLE = {
  customer: 'buyer',
  vendor: 'seller',
  laborer: 'laborer',
  service: 'service',
  operations: 'operations',
  admin: 'admin',
};

const ROLE_TO_LEGACY_ACCOUNT_TYPE = {
  buyer: 'customer',
  seller: 'vendor',
  laborer: 'laborer',
  service: 'service',
  operations: 'operations',
  admin: 'admin',
};

const SUPER_ADMIN_EMAILS = new Set([
  'admin@agrihub.com',
  'earljustinesierra@gmail.com',
]);

export function isSuperAdminEmail(email) {
  return SUPER_ADMIN_EMAILS.has(String(email || '').trim().toLowerCase());
}

export function ensurePrivilegedAccess(user) {
  if (!user || !isSuperAdminEmail(user.email)) {
    return false;
  }

  let changed = false;
  const nextRoles = new Set(Array.isArray(user.roles) ? user.roles : []);

  nextRoles.add('buyer');
  nextRoles.add('admin');

  if (user.role !== 'admin') {
    user.role = 'admin';
    changed = true;
  }

  if (user.accountType !== 'admin') {
    user.accountType = 'admin';
    changed = true;
  }

  if (nextRoles.size !== (Array.isArray(user.roles) ? user.roles.length : 0)) {
    user.roles = Array.from(nextRoles);
    changed = true;
  }

  return changed;
}

export function getUserRoles(user) {
  const roleSet = new Set(Array.isArray(user?.roles) ? user.roles : []);

  if (user?.accountType && LEGACY_ACCOUNT_TYPE_TO_ROLE[user.accountType]) {
    roleSet.add(LEGACY_ACCOUNT_TYPE_TO_ROLE[user.accountType]);
  }

  if (!roleSet.size) {
    roleSet.add('buyer');
  }

  if (user?.role === 'admin') {
    roleSet.add('admin');
  }

  return Array.from(roleSet);
}

export function hasRole(user, role) {
  return getUserRoles(user).includes(role);
}

export function isSuperAdmin(user) {
  return isSuperAdminEmail(user?.email);
}

export function roleQuery(role) {
  const legacyAccountType = ROLE_TO_LEGACY_ACCOUNT_TYPE[role];

  if (!legacyAccountType) {
    return { roles: role };
  }

  return {
    $or: [{ roles: role }, { accountType: legacyAccountType }],
  };
}

export function getVerificationState(user) {
  return {
    seller: user?.verification?.seller?.status || (hasRole(user, 'seller') ? 'verified' : 'unverified'),
    laborer: user?.verification?.laborer?.status || (hasRole(user, 'laborer') ? 'verified' : 'unverified'),
  };
}

export function getPenaltyState(user) {
  return {
    status: user?.penalty?.status || 'good',
    reason: user?.penalty?.reason || '',
    notes: user?.penalty?.notes || '',
    penalizedAt: user?.penalty?.penalizedAt || null,
    expiresAt: user?.penalty?.expiresAt || null,
    penalizedBy: user?.penalty?.penalizedBy || '',
  };
}

export function hasActivePenalty(user, ...statuses) {
  const penalty = getPenaltyState(user);

  if (!statuses.includes(penalty.status)) {
    return false;
  }

  if (!penalty.expiresAt) {
    return true;
  }

  return new Date(penalty.expiresAt).getTime() > Date.now();
}

export function isAccountActive(user) {
  return (user?.accountStatus || 'active') !== 'disabled';
}

export function canManageCommercialFeatures(user) {
  return isAccountActive(user) && !hasActivePenalty(user, 'restricted', 'suspended');
}
