import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  Briefcase,
  Calendar,
  ChartColumn,
  CheckCircle2,
  Clock,
  Gavel,
  LayoutDashboard,
  MapPin,
  Package,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Truck,
  Trash2,
  User,
  UserCog,
  Users,
  ExternalLink,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  disableAdminUser,
  deleteAdminMarketplaceListing,
  getAdminOverview,
  permanentlyDeleteAdminUser,
  restoreAdminUser,
  updateAdminLaborBooking,
  updateAdminServiceBooking,
  updateAdminUserAccess,
  updateAdminUserPenalty,
  updateAdminVerificationStatus,
} from '../../features/app/api';
import {
  getLogoHomeRoute,
  getSessionUpdatedEventName,
  getSessionUser,
  isAdminUser,
  isSuperAdminUser,
} from '../../shared/auth/session';
import { formatPhpRate } from '../../shared/format/currency';

type AdminTab = 'overview' | 'users' | 'marketplace' | 'labor' | 'services' | 'verification';

const tabs: { id: AdminTab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'marketplace', label: 'Marketplace', icon: Package },
  { id: 'labor', label: 'Labor', icon: Users },
  { id: 'services', label: 'Services', icon: Truck },
  { id: 'verification', label: 'Verification', icon: ShieldCheck },
];

const metricCards = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, tone: 'from-emerald-500 to-green-600' },
  { key: 'totalAdmins', label: 'Admins', icon: UserCog, tone: 'from-sky-500 to-blue-600' },
  { key: 'totalMarketplaceItems', label: 'Marketplace Items', icon: Package, tone: 'from-orange-500 to-amber-600' },
  { key: 'pendingVerifications', label: 'Pending KYC', icon: ShieldCheck, tone: 'from-rose-500 to-red-600' },
];

const validAdminTabs: AdminTab[] = ['overview', 'users', 'marketplace', 'labor', 'services', 'verification'];

function getAdminTabFromSearchParams(searchParams: URLSearchParams): AdminTab {
  const requestedTab = searchParams.get('tab');

  if (requestedTab && validAdminTabs.includes(requestedTab as AdminTab)) {
    return requestedTab as AdminTab;
  }

  return 'overview';
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: any;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-xl bg-gradient-to-br ${tone} p-3 shadow-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-5">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function MiniTrendCard({
  title,
  value,
  subtitle,
  tone,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  tone: string;
  icon: any;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-xl bg-gradient-to-br ${tone} p-2.5 shadow-md`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

function HorizontalBars({
  items,
  colorClass,
}: {
  items: { label: string; value: number }[];
  colorClass: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-gray-600">{item.label}</span>
            <span className="font-medium text-gray-900">{item.value}</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100">
            <div
              className={`h-2.5 rounded-full ${colorClass}`}
              style={{ width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 12 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SparkBars({
  items,
  colorClass,
}: {
  items: { label: string; value: number }[];
  colorClass: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="flex h-44 items-end gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-xs font-medium text-gray-700">{item.value}</span>
          <div className="flex h-32 w-full items-end rounded-2xl bg-gray-50 px-2 py-2">
            <div
              className={`w-full rounded-xl ${colorClass}`}
              style={{ height: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 10 : 0)}%` }}
            />
          </div>
          <span className="text-center text-xs text-gray-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessionUser, setSessionUser] = useState(getSessionUser());
  const [activeTab, setActiveTab] = useState<AdminTab>(() => getAdminTabFromSearchParams(searchParams));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [adminData, setAdminData] = useState<any>(null);
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'verified'>('pending');
  const [selectedVerificationId, setSelectedVerificationId] = useState<string | null>(null);
  const [selectedPenaltyUser, setSelectedPenaltyUser] = useState<any | null>(null);
  const [selectedAccountActionUser, setSelectedAccountActionUser] = useState<any | null>(null);
  const [accountActionReason, setAccountActionReason] = useState('');
  const [verificationReviewDrafts, setVerificationReviewDrafts] = useState<Record<string, { reason: string }>>({});
  const [userPenaltyDrafts, setUserPenaltyDrafts] = useState<Record<string, {
    status: 'good' | 'warned' | 'restricted' | 'suspended';
    reason: string;
    expiresAt: string;
  }>>({});

  const loadAdminOverview = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setErrorMessage('');

    try {
      const payload = await getAdminOverview();
      setAdminData(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load the admin center.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const syncSession = () => {
      setSessionUser(getSessionUser());
    };

    window.addEventListener(getSessionUpdatedEventName(), syncSession);

    return () => {
      window.removeEventListener(getSessionUpdatedEventName(), syncSession);
    };
  }, []);

  useEffect(() => {
    const nextTab = getAdminTabFromSearchParams(searchParams);

    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, searchParams]);

  useEffect(() => {
    if (!sessionUser) {
      navigate('/login?redirect=%2Fadmin');
      return;
    }

    if (!isAdminUser(sessionUser)) {
      navigate('/app');
      return;
    }

    void loadAdminOverview();
  }, [navigate, sessionUser]);

  const handleAction = async (work: () => Promise<any>, successMessage: string) => {
    setActionMessage('');

    try {
      await work();
      setActionMessage(successMessage);
      await loadAdminOverview(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The admin action could not be completed.');
    }
  };

  const updateActiveTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'overview' ? {} : { tab });
  };

  const getPenaltyDraft = (user: any) => {
    const existingDraft = userPenaltyDrafts[user.id];

    if (existingDraft) {
      return existingDraft;
    }

    return {
      status: (user.penalty?.status || 'good') as 'good' | 'warned' | 'restricted' | 'suspended',
      reason: user.penalty?.reason || '',
      expiresAt: user.penalty?.expiresAt ? new Date(user.penalty.expiresAt).toISOString().slice(0, 16) : '',
    };
  };

  const updatePenaltyDraft = (userId: string, patch: Partial<{
    status: 'good' | 'warned' | 'restricted' | 'suspended';
    reason: string;
    expiresAt: string;
  }>) => {
    setUserPenaltyDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] || {
          status: 'good',
          reason: '',
          expiresAt: '',
        }),
        ...patch,
      },
    }));
  };

  const getVerificationReviewDraft = (item: any) => {
    return verificationReviewDrafts[item.id] || { reason: item.reviewReason || '' };
  };

  const updateVerificationReviewDraft = (verificationId: string, reason: string) => {
    setVerificationReviewDrafts((current) => ({
      ...current,
      [verificationId]: { reason },
    }));
  };

  const filteredUsers = useMemo(() => {
    const users = Array.isArray(adminData?.users) ? adminData.users : [];
    const query = userSearch.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user: any) =>
      [user.name, user.email, user.accountType, ...(user.roles || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [adminData?.users, userSearch]);

  const filteredListings = useMemo(() => {
    const listings = Array.isArray(adminData?.marketplaceListings) ? adminData.marketplaceListings : [];
    const query = productSearch.trim().toLowerCase();

    if (!query) {
      return listings;
    }

    return listings.filter((listing: any) =>
      [listing.name, listing.category, listing.seller, listing.sellerEmail]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [adminData?.marketplaceListings, productSearch]);

  const filteredVerifications = useMemo(() => {
    const items = Array.isArray(adminData?.verifications) ? adminData.verifications : [];

    if (verificationFilter === 'all') {
      return items;
    }

    return items.filter((item: any) => item.status === verificationFilter);
  }, [adminData?.verifications, verificationFilter]);

  const selectedVerification = useMemo(() => {
    if (!selectedVerificationId) {
      return null;
    }

    return filteredVerifications.find((item: any) => item.id === selectedVerificationId) || null;
  }, [filteredVerifications, selectedVerificationId]);

  const adminInsights = useMemo(() => {
    const users = Array.isArray(adminData?.users) ? adminData.users : [];
    const listings = Array.isArray(adminData?.marketplaceListings) ? adminData.marketplaceListings : [];
    const laborBookings = Array.isArray(adminData?.laborBookings) ? adminData.laborBookings : [];
    const providers = Array.isArray(adminData?.serviceProviders) ? adminData.serviceProviders : [];
    const verifications = Array.isArray(adminData?.verifications) ? adminData.verifications : [];

    const roleBreakdown = [
      { label: 'Buyers', value: users.filter((user: any) => user.roles?.includes('buyer')).length },
      { label: 'Sellers', value: users.filter((user: any) => user.roles?.includes('seller')).length },
      { label: 'Laborers', value: users.filter((user: any) => user.roles?.includes('laborer')).length },
      { label: 'Service', value: users.filter((user: any) => user.roles?.includes('service')).length },
      { label: 'Admins', value: users.filter((user: any) => user.roles?.includes('admin')).length },
    ];

    const verificationBreakdown = [
      { label: 'Pending', value: verifications.filter((item: any) => item.status === 'pending').length },
      { label: 'Verified', value: verifications.filter((item: any) => item.status === 'verified').length },
      { label: 'Unverified', value: verifications.filter((item: any) => item.status === 'unverified').length },
    ];

    const listingCategories = Object.entries(
      listings.reduce((acc: Record<string, number>, listing: any) => {
        const key = listing.category || 'uncategorized';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    )
      .map(([label, value]) => ({ label, value: Number(value) }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);

    const laborStatus = Object.entries(
      laborBookings.reduce((acc: Record<string, number>, booking: any) => {
        const key = booking.status || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    )
      .map(([label, value]) => ({ label, value: Number(value) }))
      .sort((left, right) => right.value - left.value);

    const serviceStatus = Object.entries(
      providers.flatMap((provider: any) => provider.bookings || []).reduce((acc: Record<string, number>, booking: any) => {
        const key = booking.status || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    )
      .map(([label, value]) => ({ label, value: Number(value) }))
      .sort((left, right) => right.value - left.value);

    const providerCapacity = providers
      .map((provider: any) => ({
        label: provider.name,
        value: (provider.services || []).filter((service: any) => service.available).length,
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);

    return {
      roleBreakdown,
      verificationBreakdown,
      listingCategories,
      laborStatus,
      serviceStatus,
      providerCapacity,
      lowStockListings: listings.filter((listing: any) => Number(listing.stock || 0) > 0 && Number(listing.stock || 0) <= 10).length,
      unavailableServices: providers.flatMap((provider: any) => provider.services || []).filter((service: any) => !service.available).length,
      activeLaborNow: laborBookings.filter((booking: any) => booking.status === 'confirmed' || booking.status === 'Active').length,
    };
  }, [adminData]);

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={adminData?.metrics?.[card.key] ?? 0}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Operations Snapshot"
          subtitle="Quick health indicators for platform workload and fulfillment."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MiniTrendCard
              title="Low Stock Listings"
              value={adminInsights.lowStockListings}
              subtitle="Marketplace items that may need seller attention soon."
              tone="from-amber-500 to-orange-600"
              icon={Package}
            />
            <MiniTrendCard
              title="Unavailable Services"
              value={adminInsights.unavailableServices}
              subtitle="Service entries currently offline or unavailable."
              tone="from-rose-500 to-red-600"
              icon={Truck}
            />
            <MiniTrendCard
              title="Active Labor Now"
              value={adminInsights.activeLaborNow}
              subtitle="Bookings still in progress or confirmed right now."
              tone="from-emerald-500 to-green-600"
              icon={Briefcase}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Platform Coverage"
          subtitle="Live totals across the marketplace, labor, and services features."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Verified Sellers</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{adminData?.metrics?.totalSellers ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Verified Laborers</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{adminData?.metrics?.totalLaborers ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Service Providers</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{adminData?.metrics?.totalServiceProviders ?? 0}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard
          title="Role Distribution"
          subtitle="How user access is currently spread across the platform."
        >
          <SparkBars items={adminInsights.roleBreakdown} colorClass="bg-gradient-to-t from-green-500 to-emerald-400" />
        </SectionCard>

        <SectionCard
          title="Marketplace Category Mix"
          subtitle="Where listing volume is currently concentrated."
        >
          <HorizontalBars
            items={adminInsights.listingCategories.length ? adminInsights.listingCategories : [{ label: 'No listings yet', value: 0 }]}
            colorClass="bg-gradient-to-r from-orange-500 to-amber-500"
          />
        </SectionCard>

        <SectionCard
          title="Verification Health"
          subtitle="Current review queue balance for approval work."
        >
          <HorizontalBars
            items={adminInsights.verificationBreakdown}
            colorClass="bg-gradient-to-r from-rose-500 to-red-500"
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Booking Status Monitor"
          subtitle="Live operational breakdown across labor and service workflows."
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="hidden">
              <div className="mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-gray-900">Labor bookings</p>
              </div>
              <HorizontalBars
                items={adminInsights.laborStatus.length ? adminInsights.laborStatus : [{ label: 'No labor data', value: 0 }]}
                colorClass="bg-gradient-to-r from-green-500 to-emerald-500"
              />
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2">
                <ChartColumn className="h-4 w-4 text-orange-600" />
                <p className="text-sm font-medium text-gray-900">Service bookings</p>
              </div>
              <HorizontalBars
                items={adminInsights.serviceStatus.length ? adminInsights.serviceStatus : [{ label: 'No service data', value: 0 }]}
                colorClass="bg-gradient-to-r from-orange-500 to-red-500"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Pending Verification Queue"
          subtitle="Fast access to users waiting for admin review."
        >
          <div className="space-y-3">
            {(adminData?.verifications || [])
              .filter((item: any) => item.status === 'pending')
              .slice(0, 5)
              .map((item: any) => (
                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{item.userName}</p>
                    <p className="text-sm text-gray-500">
                      {item.role} verification • {item.documents.length} documents
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      updateActiveTab('verification');
                      setSelectedVerificationId(item.id);
                    }}
                    className="rounded-xl bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
                  >
                    Review
                  </button>
                </div>
              ))}
            {(!adminData?.verifications || adminData.verifications.filter((item: any) => item.status === 'pending').length === 0) ? (
              <p className="text-sm text-gray-500">No pending verification requests right now.</p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title="Provider Capacity"
          subtitle="Which service providers currently expose the most available offerings."
        >
          <div className="space-y-4">
            {adminInsights.providerCapacity.length ? (
              adminInsights.providerCapacity.map((provider) => (
                <div key={provider.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="truncate pr-4 text-gray-600">{provider.label}</span>
                    <span className="font-medium text-gray-900">{provider.value} live services</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-500"
                      style={{ width: `${Math.max((provider.value / Math.max(...adminInsights.providerCapacity.map((item) => item.value), 1)) * 100, provider.value > 0 ? 12 : 0)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No service provider capacity data is available yet.</p>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );

  const renderUsers = () => (
    <SectionCard title="Users" subtitle="Manage access, visibility, and platform roles.">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          value={userSearch}
          onChange={(event) => setUserSearch(event.target.value)}
          placeholder="Search users, roles, or email"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 md:max-w-sm"
        />
        <p className="text-sm text-gray-500">
          Super admin controls are enabled for privileged accounts only.
        </p>
      </div>
      <div className="space-y-4">
        {filteredUsers.map((user: any) => (
          <div key={user.id} className="rounded-2xl border border-gray-100 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(user.roles || []).map((role: string) => (
                    <span key={role} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {role}
                    </span>
                  ))}
                  {user.penalty?.status && user.penalty.status !== 'good' ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        user.penalty.status === 'warned'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.penalty.status}
                    </span>
                  ) : null}
                  {user.accountStatus === 'disabled' ? (
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                      disabled
                    </span>
                  ) : null}
                  {user.pendingDisableAt ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                      disable queued
                    </span>
                  ) : null}
                  {user.pendingDeleteAt ? (
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
                      delete queued
                    </span>
                  ) : null}
                  {user.isSuperAdmin ? (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      super admin
                    </span>
                  ) : null}
                </div>
                {user.penalty?.status && user.penalty.status !== 'good' ? (
                  <p className="mt-3 text-sm text-gray-500">
                    Penalty reason: {user.penalty.reason || 'No reason provided'}
                  </p>
                ) : null}
                {user.accountStatus === 'disabled' ? (
                  <p className="mt-3 text-sm text-gray-500">
                    Disabled account{user.disabledReason ? `: ${user.disabledReason}` : '.'}
                  </p>
                ) : null}
                {user.pendingDisableAt ? (
                  <p className="mt-3 text-sm text-gray-500">
                    Disable will take effect after active bookings finish
                    {user.pendingDisableReason ? `: ${user.pendingDisableReason}` : '.'}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-3 lg:w-auto lg:flex-none lg:items-end">
                <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                  <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    Seller: <span className="font-medium text-gray-900">{user.verification?.seller || 'unverified'}</span>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    Laborer: <span className="font-medium text-gray-900">{user.verification?.laborer || 'unverified'}</span>
                  </div>
                  {sessionUser?.isSuperAdmin && !user.isSuperAdmin ? (
                    <button
                      disabled={Boolean(user.pendingDeleteAt)}
                      onClick={() =>
                        void handleAction(
                          () => updateAdminUserAccess(user.id, !user.isAdmin),
                          !user.isAdmin ? 'Admin access granted.' : 'Admin access removed.',
                        )
                      }
                      className={`rounded-xl px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                        user.isAdmin
                          ? 'bg-red-50 text-red-700 hover:bg-red-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {user.isAdmin ? 'Remove Admin' : 'Grant Admin'}
                    </button>
                  ) : null}
                  {!user.isSuperAdmin ? (
                    <button
                      disabled={Boolean(user.pendingDeleteAt)}
                      onClick={() => setSelectedPenaltyUser(user)}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Gavel className="h-4 w-4" />
                      <span>Penalty</span>
                    </button>
                  ) : null}
                  {isSuperAdminUser(sessionUser) && !user.isSuperAdmin ? (
                    <button
                      disabled={Boolean(user.pendingDeleteAt)}
                      onClick={() => {
                        setSelectedAccountActionUser(user);
                        setAccountActionReason(user.disabledReason || '');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Account Actions</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            {user.pendingDeleteAt ? (
              <p className="mt-3 text-sm text-gray-500">
                Permanent delete will take effect after all active booking links are cleared.
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </SectionCard>
  );

  const renderMarketplace = () => (
    <SectionCard title="Marketplace" subtitle="Control seller listings that are visible across the site.">
      <div className="mb-4">
        <input
          value={productSearch}
          onChange={(event) => setProductSearch(event.target.value)}
          placeholder="Search product, seller, category, or email"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 md:max-w-sm"
        />
      </div>
      <div className="space-y-4">
        {filteredListings.map((listing: any) => (
          <div key={listing.id} className="flex flex-col gap-4 rounded-2xl border border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold text-gray-900">{listing.name}</p>
              <p className="text-sm text-gray-500">
                {listing.seller} • {listing.category} • {listing.stock} {listing.unit} in stock
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Seller email: {listing.sellerEmail} • Rating: {listing.rating ?? 0}
              </p>
            </div>
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  {formatPhpRate(listing.price, listing.unit, { shortHour: true })}
                </div>
              <button
                onClick={() =>
                  void handleAction(
                    () => deleteAdminMarketplaceListing(listing.userId, listing.listingIndex),
                    'Marketplace listing removed.',
                  )
                }
                className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                Remove Listing
              </button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );

  const renderLabor = () => (
    <SectionCard title="Labor Bookings" subtitle="Review and update active or historical worker bookings.">
      <div className="space-y-4">
        {(adminData?.laborBookings || []).map((booking: any) => (
          <div
            key={booking.id}
            className="grid gap-4 rounded-2xl border border-gray-200 p-4 transition-colors hover:border-green-500 lg:grid-cols-[minmax(0,1.45fr)_minmax(220px,0.8fr)_220px] lg:items-center"
          >
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900">{booking.workerName}</h4>
                  <p className="text-sm text-gray-600">{booking.type || 'Farm task'}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    booking.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : booking.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {booking.status}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 md:grid-cols-2">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>{booking.date || 'No date set'}</span>
                </div>
                <div className="flex items-start">
                  <MapPin className="mr-2 mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0">{booking.location || 'No location'}</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                Buyer/worker ref: {booking.worker || booking.workerName}
              </p>
            </div>
            <div className="grid min-w-0 gap-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
              <div className="rounded-xl border border-white/70 bg-white/90 px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">Schedule</p>
                <div className="mt-2 flex items-center">
                  <Clock className="mr-2 h-4 w-4 shrink-0" />
                  <span>{booking.time || 'No time set'}{booking.duration ? ` (${booking.duration})` : ''}</span>
                </div>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/90 px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">Rate</p>
                <p className="mt-2 font-medium text-green-600">
                  {Number.isFinite(Number(booking.rate))
                    ? formatPhpRate(booking.rate, 'hour', { shortHour: true })
                    : 'Rate unavailable'}
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-3 lg:items-stretch">
              {booking.status !== 'completed' ? (
                <button
                  onClick={() =>
                    void handleAction(
                        () =>
                          updateAdminLaborBooking(
                            booking.userId,
                            booking.bookingType,
                            booking.bookingIndex,
                            'completed',
                    ),
                    'Labor booking marked completed.',
                  )
                  }
                  className="min-h-[52px] w-full rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-100"
                >
                  Mark Completed
                </button>
              ) : (
                <div className="hidden min-h-[52px] lg:block" />
              )}
              {booking.status !== 'cancelled' ? (
                <button
                  onClick={() =>
                      void handleAction(
                        () =>
                          updateAdminLaborBooking(
                            booking.userId,
                            booking.bookingType,
                            booking.bookingIndex,
                            'cancelled',
                    ),
                    'Labor booking cancelled.',
                  )
                  }
                  className="min-h-[52px] w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              ) : (
                <div className="hidden min-h-[52px] lg:block" />
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );

  const renderServices = () => (
    <SectionCard title="Services" subtitle="Manage service providers and booking statuses.">
      <div className="space-y-6">
        {(adminData?.serviceProviders || []).map((provider: any) => (
          <div key={provider.id} className="rounded-2xl border border-gray-100 p-5">
            <div className="mb-4">
              <p className="font-semibold text-gray-900">{provider.name}</p>
              <p className="text-sm text-gray-500">{provider.email} • {provider.category || 'No category'}</p>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {(provider.services || []).map((service: any) => (
                <span key={service.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {service.name} • {service.available ? 'available' : 'offline'}
                </span>
              ))}
            </div>
            <div className="space-y-3">
              {(provider.bookings || []).map((booking: any) => (
                <div key={booking.id} className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{booking.service}</p>
                    <p className="text-sm text-gray-500">
                      {booking.date} • {booking.time} • {booking.location}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">Status: {booking.status}</p>
                  </div>
                  <div className="flex gap-3">
                    {booking.status !== 'confirmed' ? (
                      <button
                        onClick={() =>
                          void handleAction(
                            () => updateAdminServiceBooking(provider.id, booking.bookingIndex, 'confirmed'),
                            'Service booking confirmed.',
                          )
                        }
                        className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-100"
                      >
                        Confirm
                      </button>
                    ) : null}
                    {booking.status !== 'cancelled' ? (
                      <button
                        onClick={() =>
                          void handleAction(
                            () => updateAdminServiceBooking(provider.id, booking.bookingIndex, 'cancelled'),
                            'Service booking cancelled.',
                          )
                        }
                        className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              {provider.bookings.length === 0 ? (
                <p className="text-sm text-gray-500">No service bookings under this provider yet.</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );

  const renderVerification = () => (
    <SectionCard title="Verification Center" subtitle="Approve or reject seller and laborer KYC submissions.">
      <div className="mb-4 flex flex-wrap gap-2">
        {(['pending', 'verified', 'all'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setVerificationFilter(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              verificationFilter === value
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>
      {selectedVerification ? (
        <div className="mb-6 rounded-2xl border border-green-100 bg-green-50/60 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">Reviewing Submission</p>
                <h4 className="mt-1 text-xl font-semibold text-gray-900">{selectedVerification.userName}</h4>
                <p className="text-sm text-gray-600">
                  {selectedVerification.userEmail} • {selectedVerification.role} • {selectedVerification.status}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-medium uppercase text-gray-500">Submitted</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedVerification.submittedAt
                      ? new Date(selectedVerification.submittedAt).toLocaleString()
                      : 'Not available'}
                  </p>
                </div>
                <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-medium uppercase text-gray-500">ID Type</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedVerification.details?.idType || 'Not provided'}</p>
                </div>
                <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-medium uppercase text-gray-500">ID Number</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedVerification.details?.idNumber || 'Not provided'}</p>
                </div>
                {selectedVerification.details?.profileAddress ? (
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm md:col-span-2 xl:col-span-3">
                    <p className="text-xs font-medium uppercase text-gray-500">Profile Address</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedVerification.details.profileAddress}</p>
                  </div>
                ) : null}
                {selectedVerification.details?.farmProofType ? (
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-medium uppercase text-gray-500">Farm Proof Type</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedVerification.details.farmProofType}</p>
                  </div>
                ) : null}
                {selectedVerification.details?.laborProofType ? (
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-medium uppercase text-gray-500">Labor Proof Type</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedVerification.details.laborProofType}</p>
                  </div>
                ) : null}
                {selectedVerification.details?.experience ? (
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-medium uppercase text-gray-500">Experience</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedVerification.details.experience}</p>
                  </div>
                ) : null}
              </div>

              {selectedVerification.details?.skills?.length ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-900">Skills Submitted</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedVerification.details.skills.map((skill: string) => (
                      <span key={skill} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedVerification.details?.description ? (
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-gray-900">Applicant Notes</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{selectedVerification.details.description}</p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  { label: 'Address confirmed', value: selectedVerification.details?.addressConfirmed },
                  { label: 'Selfie confirmed', value: selectedVerification.details?.selfieConfirmed },
                  { label: 'Risk accepted', value: selectedVerification.details?.riskAccepted },
                  { label: 'Consent accepted', value: selectedVerification.details?.consentAccepted },
                ].map((entry) => (
                  <div key={entry.label} className="rounded-xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-medium uppercase text-gray-500">{entry.label}</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{entry.value ? 'Yes' : 'No'}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-900">Uploaded Documents</p>
                <div className="space-y-3">
                  {(selectedVerification.documents || []).map((document: any) => (
                    <div key={document.id} className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{document.type}</p>
                        <p className="text-sm text-gray-600">{document.originalName}</p>
                        <p className="text-xs text-gray-500">
                          {document.uploadedAt ? new Date(document.uploadedAt).toLocaleString() : 'Upload time unavailable'}
                        </p>
                      </div>
                      {document.signedUrl ? (
                        <a
                          href={document.signedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-green-200 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Open document</span>
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500">Document preview unavailable</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-900">Rejection Reason</p>
                <textarea
                  value={getVerificationReviewDraft(selectedVerification).reason}
                  onChange={(event) =>
                    updateVerificationReviewDraft(selectedVerification.id, event.target.value)
                  }
                  placeholder="Explain what the user needs to fix, for example: upload a clearer copy of the ID front and ensure all corners are visible."
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
                {selectedVerification.reviewReason ? (
                  <p className="mt-2 text-xs text-gray-500">
                    Last rejection reason: {selectedVerification.reviewReason}
                  </p>
                ) : null}
                {!getVerificationReviewDraft(selectedVerification).reason.trim() ? (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    A rejection reason is required before rejecting this KYC submission.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:min-w-40">
              {selectedVerification.status !== 'verified' ? (
                <button
                  onClick={() =>
                    void handleAction(
                      () => updateAdminVerificationStatus(selectedVerification.userId, selectedVerification.role, 'verified'),
                      `${selectedVerification.role} verification approved.`,
                    )
                  }
                  className="rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700"
                >
                  Approve Submission
                </button>
              ) : null}
              {selectedVerification.status !== 'unverified' ? (
                <button
                  onClick={() => {
                    const reason = getVerificationReviewDraft(selectedVerification).reason.trim();

                    if (!reason) {
                      setErrorMessage('Add a rejection reason before rejecting this KYC submission.');
                      return;
                    }

                    void handleAction(
                      () =>
                        updateAdminVerificationStatus(
                          selectedVerification.userId,
                          selectedVerification.role,
                          'unverified',
                          reason,
                        ),
                      `${selectedVerification.role} verification rejected.`,
                    );
                  }}
                  className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  Reject Submission
                </button>
              ) : null}
              <button
                onClick={() => setSelectedVerificationId(null)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-white"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
        ) : null}
        <div className="space-y-4">
          {filteredVerifications.map((item: any) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-2xl border border-gray-100 px-4 py-3 transition-colors hover:border-green-200 xl:grid-cols-[minmax(0,1.7fr)_220px_220px_180px] xl:items-stretch"
            >
              <div className="min-w-0 self-center">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{item.userName}</p>
                    <p className="text-sm text-gray-500">
                      {item.userEmail} • {item.role} • status: {item.status}
                    </p>
                  </div>
                </div>
                {item.reviewReason ? (
                  <p className="mt-2 text-sm text-red-600">
                    Rejection reason: {item.reviewReason}
                  </p>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-col justify-center rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">Identity</p>
                <p className="mt-1 text-sm text-gray-700">
                  {item.details?.idType ? `ID: ${item.details.idType}` : 'ID not provided'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {item.details?.idNumber ? `No. ${item.details.idNumber}` : 'ID number not provided'}
                </p>
              </div>
              <div className="flex min-w-0 flex-col justify-center rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">Submitted</p>
                <p className="mt-1 text-sm text-gray-700">
                  {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : 'Not available'}
                </p>
              </div>
              <div className="flex flex-col justify-center gap-1.5 self-center">
                <button
                  onClick={() => setSelectedVerificationId(selectedVerificationId === item.id ? null : item.id)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {selectedVerificationId === item.id ? 'Hide Details' : 'View Details'}
                </button>
                {item.status !== 'verified' ? (
                  <button
                    onClick={() =>
                      void handleAction(
                        () => updateAdminVerificationStatus(item.userId, item.role, 'verified'),
                        `${item.role} verification approved.`,
                        )
                      }
                      className="min-h-[44px] w-full rounded-xl bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-100"
                    >
                      Approve
                    </button>
                  ) : (
                    <div className="hidden lg:block" />
                  )}
                  {item.status !== 'unverified' ? (
                    <button
                      onClick={() => setSelectedVerificationId(item.id)}
                      className="min-h-[44px] w-full rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100"
                    >
                      Reject
                    </button>
                  ) : (
                    <div className="hidden lg:block" />
                  )}
                </div>
            </div>
          ))}
        </div>
      </SectionCard>
  );

  const content = {
    overview: renderOverview(),
    users: renderUsers(),
    marketplace: renderMarketplace(),
    labor: renderLabor(),
    services: renderServices(),
    verification: renderVerification(),
  }[activeTab];

  if (!sessionUser || !isAdminUser(sessionUser)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate(getLogoHomeRoute(sessionUser))}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/30">
              <Sprout className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-xl font-bold text-transparent">
                AgriHub
              </h1>
              <p className="text-xs text-gray-500">Admin Control Center</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center space-x-1 rounded-full bg-gray-50 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => updateActiveTab(tab.id)}
                className={`flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-green-600 shadow-md'
                    : 'text-gray-600 hover:bg-white/70 hover:text-green-600'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadAdminOverview(true)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <div className="hidden md:flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
              <Bell className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">{sessionUser.name}</p>
                <p className="text-xs text-green-700">
                  {isSuperAdminUser(sessionUser) ? 'Super Admin' : 'Admin'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap gap-2 lg:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => updateActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {actionMessage ? (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {actionMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-gray-500">Loading admin controls...</p>
          </div>
        ) : (
          content
        )}

        {selectedPenaltyUser ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedPenaltyUser(null)}
            />
            <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Gavel className="h-5 w-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Account Penalty</h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedPenaltyUser.name} · {selectedPenaltyUser.email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPenaltyUser(null)}
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <select
                    value={getPenaltyDraft(selectedPenaltyUser).status}
                    onChange={(event) =>
                      updatePenaltyDraft(selectedPenaltyUser.id, {
                        status: event.target.value as 'good' | 'warned' | 'restricted' | 'suspended',
                      })
                    }
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  >
                    <option value="good">Clear penalty</option>
                    <option value="warned">Warned</option>
                    <option value="restricted">Restricted</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <input
                    type="datetime-local"
                    value={getPenaltyDraft(selectedPenaltyUser).expiresAt}
                    onChange={(event) =>
                      updatePenaltyDraft(selectedPenaltyUser.id, { expiresAt: event.target.value })
                    }
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                  <button
                    onClick={() => {
                      const draft = getPenaltyDraft(selectedPenaltyUser);
                      void handleAction(
                        () =>
                          updateAdminUserPenalty(selectedPenaltyUser.id, {
                            status: draft.status,
                            reason: draft.reason,
                            expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
                          }),
                        draft.status === 'good'
                          ? 'User penalty cleared.'
                          : `User account updated to ${draft.status}.`,
                      );
                      setSelectedPenaltyUser(null);
                    }}
                    className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    Apply Penalty
                  </button>
                </div>
                <textarea
                  value={getPenaltyDraft(selectedPenaltyUser).reason}
                  onChange={(event) =>
                    updatePenaltyDraft(selectedPenaltyUser.id, { reason: event.target.value })
                  }
                  placeholder="Reason for the penalty"
                  className="mt-3 min-h-24 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
                <p className="mt-2 text-xs text-gray-500">
                  `warned` shows a notice, while `restricted` and `suspended` remove marketplace, labor, and service access.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {selectedAccountActionUser ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedAccountActionUser(null)}
            />
            <div className="relative z-10 w-full max-w-xl rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-slate-700" />
                    <h3 className="text-lg font-semibold text-gray-900">Account Actions</h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedAccountActionUser.name} · {selectedAccountActionUser.email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAccountActionUser(null)}
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                {selectedAccountActionUser.accountStatus !== 'disabled'
                && !selectedAccountActionUser.pendingDisableAt ? (
                  <textarea
                    value={accountActionReason}
                    onChange={(event) => setAccountActionReason(event.target.value)}
                    placeholder="Optional reason for disabling the account"
                    className="min-h-24 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => {
                      const isDisabledAccount =
                        selectedAccountActionUser.accountStatus === 'disabled';
                      const isPendingDisable = Boolean(selectedAccountActionUser.pendingDisableAt);

                      void handleAction(
                        () =>
                          isDisabledAccount || isPendingDisable
                            ? restoreAdminUser(selectedAccountActionUser.id)
                            : disableAdminUser(selectedAccountActionUser.id, accountActionReason),
                        isDisabledAccount || isPendingDisable
                          ? 'User account restored.'
                          : 'User account disabled.',
                      );
                      setSelectedAccountActionUser(null);
                    }}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium ${
                      selectedAccountActionUser.accountStatus === 'disabled' || selectedAccountActionUser.pendingDisableAt
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    {selectedAccountActionUser.accountStatus === 'disabled' || selectedAccountActionUser.pendingDisableAt
                      ? 'Lift Disable'
                      : 'Disable Account'}
                  </button>
                  <button
                    onClick={() => {
                      void handleAction(
                        () => permanentlyDeleteAdminUser(selectedAccountActionUser.id),
                        'User account permanently deleted.',
                      );
                      setSelectedAccountActionUser(null);
                    }}
                    className="flex-1 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    Permanently Delete
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {selectedAccountActionUser.accountStatus === 'disabled'
                    ? 'Restore makes the account active again, and its marketplace, labor, and service visibility will return automatically.'
                    : selectedAccountActionUser.pendingDisableAt
                      ? 'Lift Disable cancels the queued disable before it takes effect.'
                      : 'Disable keeps the user record in the database and blocks access. Permanently delete removes the account record from the database.'}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-100 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-gray-500 sm:px-6 lg:flex-row lg:px-8">
          <p>&copy; 2026 AgriHub Admin. Platform-wide controls are available from this dashboard.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-green-600">Privacy</Link>
            <Link to="/terms" className="hover:text-green-600">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
