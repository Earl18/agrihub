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
