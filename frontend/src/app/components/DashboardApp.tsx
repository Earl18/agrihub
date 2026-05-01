import { useEffect, useState } from 'react';
import { LayoutDashboard, ShoppingBag, Users, Truck, Sprout, Menu, X, Bell, ShoppingCart as CartIcon, UserCircle, Wallet } from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { Dashboard } from './Dashboard';
import { Marketplace } from './Marketplace';
import { LaborManagement } from './LaborManagement';
import { LaborPaymentDashboard } from './LaborPaymentDashboard';
import { ServicesBooking } from './ServicesBooking';
import { Profile } from './Profile';
import { WalletModal } from './WalletModal';
import { getCurrentUserProfile, getLaborData, getLaborPaymentStatus } from '../../features/app/api';
import { Notifications } from './Notifications';
import { Cart, CartItem } from './Cart';
import { Receipt, ReceiptData } from './Receipt';
import { BookingModal } from './BookingModal';
import { SmoothedAvatarImage } from './ui/smoothed-avatar-image';
import {
  getAuthenticatedHomeRoute,
  getLogoHomeRoute,
  getSessionUpdatedEventName,
  getUserInitials,
  getSessionUser,
  isAuthenticated,
  persistSessionUser,
} from '../../shared/auth/session';
import {
  AppNotification,
  addStoredNotification,
  clearStoredNotifications,
  deleteStoredNotification,
  getNotificationsUpdatedEventName,
  getStoredNotifications,
  markStoredNotificationRead,
  upsertStoredNotifications,
} from '../../shared/notifications/store';
import { addStoredActivity } from '../../shared/activity/store';
import { formatPhpCurrency } from '../../shared/format/currency';

type TabType = 'dashboard' | 'marketplace' | 'labor' | 'services' | 'profile';

const validTabs: TabType[] = ['dashboard', 'marketplace', 'labor', 'services', 'profile'];

function getTabFromSearchParams(searchParams: URLSearchParams): TabType {
  const requestedTab = searchParams.get('tab');

  if (requestedTab && validTabs.includes(requestedTab as TabType)) {
    return requestedTab as TabType;
  }

  return 'dashboard';
}

function buildSessionNotifications(sessionUser: ReturnType<typeof getSessionUser>) {
  if (!sessionUser?.id) {
    return [] as Array<{
      sourceKey: string;
      type: 'success' | 'warning' | 'info';
      title: string;
      message: string;
      createdAt?: string;
    }>;
  }

  const notifications: Array<{
    sourceKey: string;
    type: 'success' | 'warning' | 'info';
    title: string;
    message: string;
    createdAt?: string;
  }> = [];

  if (sessionUser.penalty?.status && sessionUser.penalty.status !== 'good') {
    notifications.push({
      sourceKey: `session-penalty-${sessionUser.penalty.status}-${sessionUser.penalty.reason || ''}-${sessionUser.penalty.expiresAt || ''}`,
      type: 'warning',
      title: `Account ${sessionUser.penalty.status}`,
      message: sessionUser.penalty.reason || 'An admin applied an account penalty that affects your access.',
      createdAt: sessionUser.penalty.penalizedAt || undefined,
    });
  }

  if (sessionUser.emailChangePending?.email) {
    notifications.push({
      sourceKey: `session-email-change-${sessionUser.emailChangePending.email}`,
      type: 'info',
      title: 'Email change pending',
      message: `Verify ${sessionUser.emailChangePending.email} to finish updating your account email.`,
      createdAt: sessionUser.emailChangePending.requestedAt || undefined,
    });
  }

  if (sessionUser.phoneChangePending?.phone) {
    notifications.push({
      sourceKey: `session-phone-change-${sessionUser.phoneChangePending.phone}`,
      type: 'info',
      title: 'Phone verification pending',
      message: `Enter the verification code sent for ${sessionUser.phoneChangePending.phone} to confirm your phone number.`,
      createdAt: sessionUser.phoneChangePending.requestedAt || undefined,
    });
  }

  if (sessionUser.phone && sessionUser.phoneVerification?.status !== 'verified') {
    notifications.push({
      sourceKey: `session-phone-unverified-${sessionUser.phone}`,
      type: 'warning',
      title: 'Phone number not verified',
      message: 'Verify your phone number in Profile before booking laborers.',
      createdAt: sessionUser.phoneVerification?.requestedAt || undefined,
    });
  }

  if (sessionUser.verification?.seller === 'pending') {
    notifications.push({
      sourceKey: 'session-seller-verification-pending',
      type: 'info',
      title: 'Seller verification pending',
      message: 'Your seller KYC submission is waiting for admin review.',
    });
  }

  if (sessionUser.verification?.seller === 'verified') {
    notifications.push({
      sourceKey: 'session-seller-verification-verified',
      type: 'success',
      title: 'Seller verified',
      message: 'Your seller account is verified and ready for marketplace listings.',
    });
  }

  if (sessionUser.verification?.seller === 'unverified' && sessionUser.verificationMeta?.seller?.reviewReason) {
    notifications.push({
      sourceKey: `session-seller-verification-rejected-${sessionUser.verificationMeta.seller.rejectedAt || sessionUser.verificationMeta.seller.reviewReason}`,
      type: 'warning',
      title: 'Seller verification needs attention',
      message: sessionUser.verificationMeta.seller.reviewReason,
      createdAt: sessionUser.verificationMeta.seller.rejectedAt || undefined,
    });
  }

  if (sessionUser.verification?.laborer === 'pending') {
    notifications.push({
      sourceKey: 'session-laborer-verification-pending',
      type: 'info',
      title: 'Laborer verification pending',
      message: 'Your laborer KYC submission is waiting for admin review.',
    });
  }

  if (sessionUser.verification?.laborer === 'verified') {
    notifications.push({
      sourceKey: 'session-laborer-verification-verified',
      type: 'success',
      title: 'Laborer verified',
      message: 'Your laborer account is verified and visible for booking.',
    });
  }

  if (sessionUser.verification?.laborer === 'unverified' && sessionUser.verificationMeta?.laborer?.reviewReason) {
    notifications.push({
      sourceKey: `session-laborer-verification-rejected-${sessionUser.verificationMeta.laborer.rejectedAt || sessionUser.verificationMeta.laborer.reviewReason}`,
      type: 'warning',
      title: 'Laborer verification needs attention',
      message: sessionUser.verificationMeta.laborer.reviewReason,
      createdAt: sessionUser.verificationMeta.laborer.rejectedAt || undefined,
    });
  }

  return notifications;
}

function buildLaborNotifications(payload: any) {
  const notifications: Array<{
    sourceKey: string;
    type: 'success' | 'warning' | 'info';
    title: string;
    message: string;
    createdAt?: string;
  }> = [];

  const activeBookings = Array.isArray(payload?.activeBookings) ? payload.activeBookings : [];
  const bookingHistory = Array.isArray(payload?.bookingHistory) ? payload.bookingHistory : [];
  const myActiveJobs = Array.isArray(payload?.myActiveJobs) ? payload.myActiveJobs : [];
  const myJobHistory = Array.isArray(payload?.myJobHistory) ? payload.myJobHistory : [];

  activeBookings.forEach((booking: any) => {
    const bookingKey = String(booking?.bookingId || booking?.id || '').trim();

    if (!bookingKey) {
      return;
    }

    if (booking.status === 'on_the_way') {
      notifications.push({
        sourceKey: `labor-booking-${bookingKey}-on-the-way`,
        type: 'info',
        title: 'Worker is on the way',
        message: `${booking.worker} is travelling to your farm for ${booking.date} at ${booking.time}.`,
        createdAt: booking.travelTracking?.updatedAt || booking.travelTracking?.startedAt,
      });
      return;
    }

    notifications.push({
      sourceKey: `labor-booking-${bookingKey}-${booking.status || 'confirmed'}`,
      type: 'info',
      title: 'Active labor booking',
      message: `${booking.worker} is booked for ${booking.date} at ${booking.time}.`,
    });
  });

  bookingHistory.forEach((booking: any) => {
    const bookingKey = String(booking?.bookingId || booking?.id || '').trim();

    if (!bookingKey) {
      return;
    }

    if (booking.status === 'cancelled') {
      notifications.push({
        sourceKey: `labor-booking-history-${bookingKey}-cancelled`,
        type: 'warning',
        title: 'Labor booking cancelled',
        message: `${booking.worker} booking on ${booking.date} was cancelled.`,
        createdAt: booking.cancelledAt || undefined,
      });
    }

    if (booking.status === 'completed') {
      notifications.push({
        sourceKey: `labor-booking-history-${bookingKey}-completed`,
        type: 'success',
        title: 'Labor booking completed',
        message: `${booking.worker} completed the booking scheduled on ${booking.date}.`,
        createdAt: booking.completedAt || undefined,
      });
    }
  });

  myActiveJobs.forEach((job: any) => {
    const bookingKey = String(job?.bookingId || job?.id || '').trim();

    if (!bookingKey) {
      return;
    }

    notifications.push({
      sourceKey: `labor-job-${bookingKey}-${job.status || 'confirmed'}`,
      type: job.status === 'on_the_way' ? 'success' : 'info',
      title: job.status === 'on_the_way' ? 'Travel tracking is live' : 'Upcoming job assignment',
      message:
        job.status === 'on_the_way'
          ? `Your client can now track you for the ${job.date} booking.`
          : `${job.worker} booked you for ${job.date} at ${job.time}.`,
      createdAt: job.travelTracking?.updatedAt || job.travelTracking?.startedAt,
    });
  });

  myJobHistory.forEach((job: any) => {
    const bookingKey = String(job?.bookingId || job?.id || '').trim();

    if (!bookingKey) {
      return;
    }

    if (job.status === 'cancelled') {
      notifications.push({
        sourceKey: `labor-job-history-${bookingKey}-cancelled`,
        type: 'warning',
        title: 'Job assignment cancelled',
        message: `${job.worker} cancelled the ${job.date} booking.`,
        createdAt: job.cancelledAt || undefined,
      });
    }

    if (job.status === 'completed') {
      notifications.push({
        sourceKey: `labor-job-history-${bookingKey}-completed`,
        type: 'success',
        title: 'Job assignment completed',
        message: `You completed the ${job.date} labor booking successfully.`,
        createdAt: job.completedAt || undefined,
      });
    }
  });

  return notifications;
}

export function DashboardApp() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() => getTabFromSearchParams(searchParams));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [laborPaymentOpen, setLaborPaymentOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [bookingType, setBookingType] = useState<'labor' | 'service'>('labor');
  const [bookingItem, setBookingItem] = useState<any>(null);
  const [pendingLaborBooking, setPendingLaborBooking] = useState<any>(null);
  const [sessionUser, setSessionUser] = useState(getSessionUser());
  const loggedIn = isAuthenticated();
  const canUseCommercialFeatures = sessionUser?.canManageCommercialFeatures !== false;
  const walletBalance = Number(sessionUser?.wallet?.balance || 0);

  const tabs = [
    { id: 'dashboard' as TabType, name: 'Dashboard', icon: LayoutDashboard },
    { id: 'marketplace' as TabType, name: 'Marketplace', icon: ShoppingBag },
    { id: 'labor' as TabType, name: 'Labor', icon: Users },
    { id: 'services' as TabType, name: 'Services', icon: Truck },
  ];

  useEffect(() => {
    const nextTab = getTabFromSearchParams(searchParams);

    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, searchParams]);

  useEffect(() => {
    setNotifications(sessionUser?.id ? getStoredNotifications(sessionUser.id) : []);

    const handleNotificationsUpdated = () => {
      const nextUser = getSessionUser();
      setNotifications(nextUser?.id ? getStoredNotifications(nextUser.id) : []);
    };

    window.addEventListener(getNotificationsUpdatedEventName(), handleNotificationsUpdated);

    return () => {
      window.removeEventListener(getNotificationsUpdatedEventName(), handleNotificationsUpdated);
    };
  }, [sessionUser?.id]);

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
    if (!sessionUser?.id) {
      setNotifications([]);
      return;
    }

    upsertStoredNotifications(sessionUser.id, buildSessionNotifications(sessionUser));
  }, [sessionUser]);

  useEffect(() => {
    if (!sessionUser?.id) {
      return;
    }

    const syncLaborNotifications = () => {
      getLaborData()
        .then((payload) => {
          upsertStoredNotifications(sessionUser.id, buildLaborNotifications(payload));
        })
        .catch(() => undefined);
    };

    syncLaborNotifications();
    window.addEventListener('agrihub:labor-bookings-updated', syncLaborNotifications);

    return () => {
      window.removeEventListener('agrihub:labor-bookings-updated', syncLaborNotifications);
    };
  }, [sessionUser?.id]);

  useEffect(() => {
    if (!sessionUser?.id) {
      return;
    }

    const syncWalletAndSession = () => {
      getCurrentUserProfile()
        .then(({ user }) => {
          persistSessionUser(user);
          setSessionUser(user);
        })
        .catch(() => undefined);
    };

    window.addEventListener('agrihub:labor-bookings-updated', syncWalletAndSession);

    return () => {
      window.removeEventListener('agrihub:labor-bookings-updated', syncWalletAndSession);
    };
  }, [sessionUser?.id]);

  useEffect(() => {
    const laborPaymentRef = searchParams.get('laborPaymentRef');
    const laborPaymentState = searchParams.get('laborPaymentState');

    if (!laborPaymentRef || !sessionUser?.id) {
      return;
    }

    getLaborPaymentStatus(laborPaymentRef)
      .then((payload) => {
        const payment = payload.payment;

        if (payment?.status === 'booking_created' || payment?.status === 'ready_for_release' || payment?.status === 'released') {
          addStoredNotification(sessionUser.id, {
            sourceKey: `labor-payment-${laborPaymentRef}`,
            type: 'success',
            title: 'Labor payment confirmed',
            message: `${payment.workerName} booking for ${payment.bookingDate} at ${payment.bookingTime} is now active and paid securely through Xendit.`,
          });
          window.dispatchEvent(new Event('agrihub:labor-bookings-updated'));
        } else if (laborPaymentState === 'failure' || payment?.status === 'failed' || payment?.status === 'expired') {
          addStoredNotification(sessionUser.id, {
            sourceKey: `labor-payment-${laborPaymentRef}`,
            type: 'warning',
            title: 'Labor payment not completed',
            message: 'The Xendit payment was not completed, so the labor booking was not activated.',
          });
        } else {
          addStoredNotification(sessionUser.id, {
            sourceKey: `labor-payment-${laborPaymentRef}`,
            type: 'info',
            title: 'Payment is being confirmed',
            message: 'Xendit is still confirming your labor payment. Your booking will appear once the payment is finalized.',
          });
        }
      })
      .catch(() => {
        addStoredNotification(sessionUser.id, {
          sourceKey: `labor-payment-${laborPaymentRef}`,
          type: 'warning',
          title: 'Unable to load payment status',
          message: 'We could not verify the latest labor payment status right now.',
        });
      })
      .finally(() => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('laborPaymentRef');
        nextParams.delete('laborPaymentState');
        nextParams.set('tab', 'labor');
        setSearchParams(nextParams, { replace: true });
      });
  }, [searchParams, sessionUser?.id, setSearchParams]);

  const updateActiveTab = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams(tab === 'dashboard' ? {} : { tab });
  };

  const requireLogin = (tab: 'marketplace' | 'labor' | 'services') => {
    if (loggedIn) {
      if (!canUseCommercialFeatures) {
        updateActiveTab('profile');
        return false;
      }

      return true;
    }

    navigate(`/login?redirect=${encodeURIComponent(`/app?tab=${tab}`)}`);
    return false;
  };

  const handleMarkAsRead = (id: string) => {
    if (!sessionUser?.id) {
      return;
    }

    markStoredNotificationRead(sessionUser.id, id);
  };

  const handleDeleteNotification = (id: string) => {
    if (!sessionUser?.id) {
      return;
    }

    deleteStoredNotification(sessionUser.id, id);
  };

  const handleClearAllNotifications = () => {
    if (!sessionUser?.id) {
      return;
    }

    clearStoredNotifications(sessionUser.id);
  };

  const handleWalletUserUpdated = (user: any) => {
    persistSessionUser(user);
    setSessionUser(user);
  };

  const addNotification = (notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'> & { createdAt?: string; sourceKey?: string }) => {
    if (!sessionUser?.id) {
      return;
    }

    addStoredNotification(sessionUser.id, notification);
  };

  const handleAddToCart = (product: any) => {
    if (!requireLogin('marketplace')) {
      return;
    }

    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCartItems([...cartItems, {
        id: product.id, name: product.name, category: product.category,
        price: product.price, unit: product.unit, seller: product.seller,
        quantity: 1, image: product.image,
      }]);
    }
    addNotification({ type: 'success', title: 'Added to Cart', message: `${product.name} has been added to your cart` });
    logActivity(`Added ${product.name} to cart`, 'confirmed');
    setCartOpen(true);
  };

  const handleUpdateQuantity = (id: number, quantity: number) => {
    setCartItems(cartItems.map(item => item.id === id ? { ...item, quantity } : item));
  };

  const handleRemoveItem = (id: number) => {
    const item = cartItems.find((cartItem) => cartItem.id === id);
    setCartItems(cartItems.filter(item => item.id !== id));
    addNotification({ type: 'info', title: 'Item Removed', message: 'Item has been removed from your cart' });
    if (item) {
      logActivity(`Removed ${item.name} from cart`, 'confirmed');
    }
  };

  const handleCheckout = () => {
    if (!requireLogin('marketplace')) {
      return;
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.08;
    const shipping = 15;
    const total = subtotal + tax + shipping;
    const receipt: ReceiptData = {
      id: `PUR-${Date.now()}`, type: 'purchase',
      date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString(),
      items: cartItems.map(item => ({ name: item.name, quantity: item.quantity, unit: item.unit, price: item.price, total: item.price * item.quantity })),
      subtotal, tax, shipping, total, paymentMethod: 'Credit Card', seller: 'Multiple Sellers', buyer: sessionUser?.name || 'Authenticated User',
    };
    setCurrentReceipt(receipt);
    setCartOpen(false);
    setReceiptOpen(true);
    setCartItems([]);
    addNotification({ type: 'success', title: 'Order Placed Successfully', message: `Your order of ${formatPhpCurrency(total)} has been placed` });
    logActivity(`Placed a marketplace order worth ${formatPhpCurrency(total)}`, 'completed');
  };

  const handleBookWorker = (worker: any) => {
    if (!requireLogin('labor')) {
      return;
    }

    if (
      sessionUser?.phoneVerification?.status !== 'verified'
      || !String(sessionUser?.phone || '').trim()
    ) {
      addNotification({
        type: 'warning',
        title: 'Phone Verification Required',
        message: 'Verify your phone number in your profile before booking a laborer.',
      });
      updateActiveTab('profile');
      return;
    }

    setBookingType('labor');
    setBookingItem(worker);
    setBookingModalOpen(true);
  };

  const handleBookService = (service: any) => {
    if (!requireLogin('services')) {
      return;
    }

    setBookingType('service');
    setBookingItem(service);
    setBookingModalOpen(true);
  };

  const handleConfirmBooking = async (bookingData: any) => {
    if (!requireLogin(bookingType === 'labor' ? 'labor' : 'services')) {
      return;
    }

    try {
      if (bookingType === 'labor') {
        setPendingLaborBooking(bookingData);
        setBookingModalOpen(false);
        setLaborPaymentOpen(true);
        return;
      }

      const rate = bookingItem.rate || bookingItem.price;
      const durationHours = parseInt(bookingData.duration) || 8;
      const total = rate * durationHours;
      const tax = total * 0.08;
      const totalWithTax = total + tax;
      const receipt: ReceiptData = {
        id: `SRV-${Date.now()}`,
        type: 'service',
        date: bookingData.date, time: bookingData.time,
        items: [{ name: bookingData.itemName, quantity: durationHours, unit: 'hours', price: rate, total }],
        subtotal: total, tax, total: totalWithTax, paymentMethod: 'Credit Card', provider: bookingData.provider, buyer: sessionUser?.name || 'Authenticated User',
      };
      setCurrentReceipt(receipt);
      setBookingModalOpen(false);
      setReceiptOpen(true);
      addNotification({ type: 'success', title: 'Service Booked', message: `${bookingData.itemName} booked for ${bookingData.date} at ${bookingData.time}` });
      logActivity(
        `Booked service ${bookingData.itemName} for ${bookingData.date}`,
        'completed',
      );
    } catch (error) {
      addNotification({
        type: 'warning',
        title: bookingType === 'labor' ? 'Booking Failed' : 'Service Booking Failed',
        message: error instanceof Error ? error.message : 'Unable to complete the booking right now.',
      });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'marketplace': return <Marketplace onAddToCart={handleAddToCart} currentUser={sessionUser} />;
      case 'labor': return <LaborManagement onBookWorker={handleBookWorker} currentUser={sessionUser} />;
      case 'services': return <ServicesBooking onBookService={handleBookService} currentUser={sessionUser} />;
      case 'profile': return <Profile />;
      default: return <Dashboard />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const logActivity = (description: string, status: 'completed' | 'confirmed' | 'pending' = 'confirmed') => {
    if (!sessionUser?.id) {
      return;
    }

    addStoredActivity(sessionUser.id, { description, status });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30 backdrop-blur-lg bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate(getLogoHomeRoute(sessionUser))}>
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">AgriHub</h1>
                <p className="text-xs text-gray-500">Farm Management</p>
              </div>
            </div>

            <nav className="hidden md:flex space-x-1 bg-gray-50 rounded-full p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => updateActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white text-green-600 shadow-md'
                      : 'text-gray-600 hover:text-green-600 hover:bg-white/50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.name}</span>
                </button>
              ))}
            </nav>

            <div className="flex items-center space-x-2">
              <button onClick={() => setCartOpen(true)} className="relative p-2 hover:bg-gray-100 rounded-xl transition-all duration-200">
                <CartIcon className="w-5 h-5 text-gray-600" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-green-500 to-green-600 rounded-full text-xs flex items-center justify-center text-white font-medium shadow-lg shadow-green-500/30">
                    {cartItems.length}
                  </span>
                )}
              </button>
              {loggedIn ? (
                <>
                  <button onClick={() => setNotificationsOpen(true)} className="relative p-2 hover:bg-gray-100 rounded-xl transition-all duration-200">
                    <Bell className="w-5 h-5 text-gray-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-red-500 to-red-600 rounded-full text-xs flex items-center justify-center text-white font-medium shadow-lg shadow-red-500/30">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setWalletOpen(true)}
                    className="hidden md:flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 transition-all duration-200 hover:bg-emerald-100"
                  >
                    <Wallet className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">{formatPhpCurrency(walletBalance)}</span>
                  </button>
                  <button onClick={() => updateActiveTab('profile')} className="hidden md:flex items-center space-x-2 hover:bg-gray-100 rounded-xl px-3 py-2 transition-all duration-200">
                    <div className="w-8 h-8 overflow-hidden rounded-full bg-white flex items-center justify-center ring-1 ring-gray-200 shadow-sm">
                      {sessionUser?.profile?.avatarUrl ? (
                        <SmoothedAvatarImage
                          src={sessionUser.profile.avatarUrl}
                          alt={sessionUser.name || 'Profile'}
                          className="block h-full w-full object-cover object-center"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-500 to-green-600 text-xs font-semibold text-white">
                          {getUserInitials(sessionUser?.name)}
                        </div>
                      )}
                    </div>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login?redirect=%2Fapp')}
                    className="hidden md:inline-flex items-center px-4 py-2 text-sm text-green-600 border border-green-200 rounded-xl hover:bg-green-50 transition-all duration-200"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate('/register?redirect=%2Fapp')}
                    className="hidden md:inline-flex items-center px-4 py-2 text-sm text-white bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all duration-200"
                  >
                    Register
                  </button>
                </>
              )}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-all duration-200">
                {mobileMenuOpen ? <X className="w-6 h-6 text-gray-600" /> : <Menu className="w-6 h-6 text-gray-600" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-4 space-y-1">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => { updateActiveTab(tab.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === tab.id ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.name}</span>
                </button>
              ))}
              {loggedIn ? (
                <>
                  <button
                    onClick={() => { setWalletOpen(true); setMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-700 transition-all duration-200 hover:bg-emerald-100"
                  >
                    <span className="flex items-center space-x-3">
                      <Wallet className="w-5 h-5" />
                      <span className="font-medium">Wallet</span>
                    </span>
                    <span className="text-sm font-semibold">{formatPhpCurrency(walletBalance)}</span>
                  </button>
                  <button onClick={() => { updateActiveTab('profile'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      activeTab === 'profile' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30' : 'text-gray-600 hover:bg-gray-50'
                    }`}>
                    <UserCircle className="w-5 h-5" />
                    <span className="font-medium">Profile</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { navigate('/login?redirect=%2Fapp'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-center px-4 py-3 rounded-xl border border-green-200 text-green-600 hover:bg-green-50 transition-all duration-200"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => { navigate('/register?redirect=%2Fapp'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 transition-all duration-200"
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      <footer className="bg-white/80 backdrop-blur-lg border-t border-gray-100 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">&copy; 2026 AgriHub. Empowering farmers with technology.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-sm text-gray-500 hover:text-green-600 transition-colors">Support</a>
              <Link to="/privacy" className="text-sm text-gray-500 hover:text-green-600 transition-colors">Privacy</Link>
              <Link to="/terms" className="text-sm text-gray-500 hover:text-green-600 transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>

      <Notifications isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} notifications={notifications} onMarkAsRead={handleMarkAsRead} onDelete={handleDeleteNotification} onClearAll={handleClearAllNotifications} />
      <Cart isOpen={cartOpen} onClose={() => setCartOpen(false)} items={cartItems} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveItem} onCheckout={handleCheckout} />
      <Receipt isOpen={receiptOpen} onClose={() => setReceiptOpen(false)} receipt={currentReceipt} />
      <BookingModal isOpen={bookingModalOpen} onClose={() => setBookingModalOpen(false)} type={bookingType} item={bookingItem} onConfirm={handleConfirmBooking} />
      <LaborPaymentDashboard
        isOpen={laborPaymentOpen}
        onClose={() => setLaborPaymentOpen(false)}
        bookingDraft={pendingLaborBooking}
        worker={bookingItem}
      />
      <WalletModal
        isOpen={walletOpen}
        onClose={() => setWalletOpen(false)}
        sessionUser={sessionUser}
        onUserUpdated={handleWalletUserUpdated}
      />
    </div>
  );
}
