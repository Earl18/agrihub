import { useEffect, useState } from 'react';
import { LayoutDashboard, ShoppingBag, Users, Truck, Sprout, Menu, X, Bell, ShoppingCart as CartIcon, UserCircle } from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { Dashboard } from './Dashboard';
import { Marketplace } from './Marketplace';
import { LaborManagement } from './LaborManagement';
import { ServicesBooking } from './ServicesBooking';
import { Operations } from './Operations';
import { Profile } from './Profile';
import { Notifications } from './Notifications';
import { Cart, CartItem } from './Cart';
import { Receipt, ReceiptData } from './Receipt';
import { BookingModal } from './BookingModal';
import { getSessionUser, getUserInitials, isAuthenticated } from '../../shared/auth/session';

type TabType = 'dashboard' | 'marketplace' | 'labor' | 'services' | 'operations' | 'profile';

interface Notification {
  id: number;
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export function DashboardApp() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, type: 'success', title: 'Order Confirmed', message: 'Your order of 500kg Rice has been confirmed', time: '5 minutes ago', read: false },
    { id: 2, type: 'info', title: 'Worker Available', message: 'John Martinez is now available for booking', time: '1 hour ago', read: false },
    { id: 3, type: 'warning', title: 'Service Reminder', message: 'Tractor service scheduled for tomorrow at 8 AM', time: '2 hours ago', read: true },
    { id: 4, type: 'success', title: 'Payment Received', message: 'Payment of $240 received for wheat harvest', time: '5 hours ago', read: true },
  ]);

  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingType, setBookingType] = useState<'labor' | 'service'>('labor');
  const [bookingItem, setBookingItem] = useState<any>(null);
  const sessionUser = getSessionUser();
  const loggedIn = isAuthenticated();

  const tabs = [
    { id: 'dashboard' as TabType, name: 'Dashboard', icon: LayoutDashboard },
    { id: 'marketplace' as TabType, name: 'Marketplace', icon: ShoppingBag },
    { id: 'labor' as TabType, name: 'Labor', icon: Users },
    { id: 'services' as TabType, name: 'Services', icon: Truck },
    { id: 'operations' as TabType, name: 'Operations', icon: Sprout },
  ];

  useEffect(() => {
    const requestedTab = searchParams.get('tab') as TabType | null;

    if (
      requestedTab &&
      ['dashboard', 'marketplace', 'labor', 'services', 'operations', 'profile'].includes(requestedTab)
    ) {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  const updateActiveTab = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams(tab === 'dashboard' ? {} : { tab });
  };

  const requireLogin = (tab: 'marketplace' | 'labor' | 'services') => {
    if (loggedIn) {
      return true;
    }

    navigate(`/login?redirect=${encodeURIComponent(`/app?tab=${tab}`)}`);
    return false;
  };

  const handleMarkAsRead = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleDeleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'read' | 'time'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now(),
      read: false,
      time: 'Just now',
    };
    setNotifications([newNotification, ...notifications]);
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
    setCartOpen(true);
  };

  const handleUpdateQuantity = (id: number, quantity: number) => {
    setCartItems(cartItems.map(item => item.id === id ? { ...item, quantity } : item));
  };

  const handleRemoveItem = (id: number) => {
    setCartItems(cartItems.filter(item => item.id !== id));
    addNotification({ type: 'info', title: 'Item Removed', message: 'Item has been removed from your cart' });
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
    addNotification({ type: 'success', title: 'Order Placed Successfully', message: `Your order of $${total.toFixed(2)} has been placed` });
  };

  const handleBookWorker = (worker: any) => {
    if (!requireLogin('labor')) {
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

  const handleConfirmBooking = (bookingData: any) => {
    if (!requireLogin(bookingType === 'labor' ? 'labor' : 'services')) {
      return;
    }

    const rate = bookingItem.rate || bookingItem.price;
    const durationHours = parseInt(bookingData.duration) || 8;
    const total = rate * durationHours;
    const tax = total * 0.08;
    const totalWithTax = total + tax;
    const receipt: ReceiptData = {
      id: `${bookingType === 'labor' ? 'LAB' : 'SRV'}-${Date.now()}`,
      type: bookingType === 'labor' ? 'labor' : 'service',
      date: bookingData.date, time: bookingData.time,
      items: [{ name: bookingData.itemName, quantity: durationHours, unit: 'hours', price: rate, total }],
      subtotal: total, tax, total: totalWithTax, paymentMethod: 'Credit Card', provider: bookingData.provider, buyer: sessionUser?.name || 'Authenticated User',
    };
    setCurrentReceipt(receipt);
    setBookingModalOpen(false);
    setReceiptOpen(true);
    addNotification({ type: 'success', title: `${bookingType === 'labor' ? 'Worker' : 'Service'} Booked`, message: `${bookingData.itemName} booked for ${bookingData.date} at ${bookingData.time}` });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'marketplace': return <Marketplace onAddToCart={handleAddToCart} />;
      case 'labor': return <LaborManagement onBookWorker={handleBookWorker} />;
      case 'services': return <ServicesBooking onBookService={handleBookService} />;
      case 'operations': return <Operations />;
      case 'profile': return <Profile />;
      default: return <Dashboard />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30 backdrop-blur-lg bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
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
                  <button onClick={() => updateActiveTab('profile')} className="hidden md:flex items-center space-x-2 hover:bg-gray-100 rounded-xl px-3 py-2 transition-all duration-200">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-md shadow-green-500/20">
                      <span className="text-sm font-semibold text-white">{getUserInitials(sessionUser?.name)}</span>
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
                <button onClick={() => { updateActiveTab('profile'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === 'profile' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  <UserCircle className="w-5 h-5" />
                  <span className="font-medium">Profile</span>
                </button>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      <footer className="bg-white/80 backdrop-blur-lg border-t border-gray-100 mt-12">
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
    </div>
  );
}
