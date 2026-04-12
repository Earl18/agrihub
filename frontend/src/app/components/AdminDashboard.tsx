import { useState } from 'react';
import {
  Sprout, LayoutDashboard, Users, ShoppingBag, Package, CalendarCheck,
  ShieldCheck, Bell, Menu, X, UserCircle, TrendingUp, AlertTriangle,
  Eye, Ban, Trash2, CheckCircle, XCircle, Search, Filter,
  ChevronLeft, ChevronRight, MoreHorizontal, ArrowUpRight, ArrowDownRight,
  Wheat, DollarSign, ClipboardList, HardHat, Mail, MapPin, Star, Clock,
  FileText, FileImage, Download, ZoomIn, ExternalLink, File, ChevronDown, ChevronUp,
  BadgeCheck
} from 'lucide-react';
import { useNavigate, Link } from 'react-router';

type AdminTab = 'dashboard' | 'users' | 'products' | 'orders' | 'bookings' | 'verification';

// ─── Mock Data ────────────────────────────────────────────────────

const mockUsers = [
  { id: 1, name: 'Maria Santos', email: 'maria@farm.co', role: 'Farmer', status: 'Active' as const, joined: 'Jan 15, 2026', avatar: 'MS', location: 'Pampanga', verified: true },
  { id: 2, name: 'John Reyes', email: 'john.r@agri.ph', role: 'Buyer', status: 'Active' as const, joined: 'Feb 3, 2026', avatar: 'JR', location: 'Manila', verified: false },
  { id: 3, name: 'Ana Cruz', email: 'ana.cruz@mail.com', role: 'Laborer', status: 'Active' as const, joined: 'Feb 18, 2026', avatar: 'AC', location: 'Tarlac', verified: true },
  { id: 4, name: 'Pedro Garcia', email: 'pedro.g@farm.co', role: 'Farmer', status: 'Suspended' as const, joined: 'Mar 1, 2026', avatar: 'PG', location: 'Bulacan', verified: false },
  { id: 5, name: 'Lisa Mendoza', email: 'lisa.m@agri.ph', role: 'Buyer', status: 'Active' as const, joined: 'Mar 10, 2026', avatar: 'LM', location: 'Quezon City', verified: true },
  { id: 6, name: 'Carlos Tan', email: 'carlos.t@mail.com', role: 'Laborer', status: 'Active' as const, joined: 'Mar 12, 2026', avatar: 'CT', location: 'Laguna', verified: false },
  { id: 7, name: 'Rosa Lim', email: 'rosa.l@farm.co', role: 'Farmer', status: 'Active' as const, joined: 'Mar 15, 2026', avatar: 'RL', location: 'Pangasinan', verified: true },
  { id: 8, name: 'David Aquino', email: 'david.a@mail.com', role: 'Buyer', status: 'Suspended' as const, joined: 'Mar 20, 2026', avatar: 'DA', location: 'Cebu', verified: false },
];

const mockProducts = [
  { id: 1, name: 'Organic Rice (Jasmine)', seller: 'Maria Santos', price: 2.80, stock: 1200, category: 'Grains', status: 'Active' },
  { id: 2, name: 'Fresh Tomatoes', seller: 'Rosa Lim', price: 1.50, stock: 340, category: 'Vegetables', status: 'Active' },
  { id: 3, name: 'Carabao Mango', seller: 'Maria Santos', price: 3.20, stock: 580, category: 'Fruits', status: 'Active' },
  { id: 4, name: 'Free-Range Eggs (30pc)', seller: 'Pedro Garcia', price: 5.00, stock: 90, category: 'Poultry', status: 'Flagged' },
  { id: 5, name: 'Fresh Corn (Sweet)', seller: 'Rosa Lim', price: 0.80, stock: 750, category: 'Vegetables', status: 'Active' },
  { id: 6, name: 'Calamansi (1kg)', seller: 'Maria Santos', price: 1.20, stock: 200, category: 'Fruits', status: 'Active' },
  { id: 7, name: 'Dried Fish (Tuyo)', seller: 'Rosa Lim', price: 4.50, stock: 0, category: 'Seafood', status: 'Out of Stock' },
];

const mockOrders = [
  { id: 'ORD-20260301', buyer: 'John Reyes', items: 3, total: 156.00, status: 'Delivered', payment: 'Paid', date: 'Mar 25, 2026' },
  { id: 'ORD-20260302', buyer: 'Lisa Mendoza', items: 1, total: 84.00, status: 'Shipped', payment: 'Paid', date: 'Mar 27, 2026' },
  { id: 'ORD-20260303', buyer: 'David Aquino', items: 5, total: 312.50, status: 'Processing', payment: 'Escrow', date: 'Mar 28, 2026' },
  { id: 'ORD-20260304', buyer: 'John Reyes', items: 2, total: 67.20, status: 'Pending', payment: 'Pending', date: 'Mar 29, 2026' },
  { id: 'ORD-20260305', buyer: 'Lisa Mendoza', items: 4, total: 205.00, status: 'Delivered', payment: 'Paid', date: 'Mar 22, 2026' },
  { id: 'ORD-20260306', buyer: 'David Aquino', items: 1, total: 45.00, status: 'Cancelled', payment: 'Refunded', date: 'Mar 20, 2026' },
];

const mockBookings = [
  { id: 'BKG-0041', buyer: 'Maria Santos', laborer: 'Ana Cruz', service: 'Planting', status: 'Active' as const, date: 'Mar 29, 2026', duration: '8 hours' },
  { id: 'BKG-0042', buyer: 'Rosa Lim', laborer: 'Carlos Tan', service: 'Harvesting', status: 'Scheduled' as const, date: 'Mar 30, 2026', duration: '6 hours' },
  { id: 'BKG-0043', buyer: 'Maria Santos', laborer: 'Ana Cruz', service: 'Irrigation Setup', status: 'Completed' as const, date: 'Mar 26, 2026', duration: '4 hours' },
  { id: 'BKG-0044', buyer: 'Rosa Lim', laborer: 'Carlos Tan', service: 'Land Preparation', status: 'Pending' as const, date: 'Apr 1, 2026', duration: '10 hours' },
  { id: 'BKG-0045', buyer: 'Pedro Garcia', laborer: 'Ana Cruz', service: 'Spraying', status: 'Cancelled' as const, date: 'Mar 24, 2026', duration: '3 hours' },
];

interface VerificationDoc {
  id: string; name: string; type: string; fileType: string; size: string; uploaded: string; preview: string;
}

interface Verification {
  id: number; name: string; type: 'Seller' | 'Laborer'; email: string; submitted: string; docs: string; location: string; status: 'Pending'; documents: VerificationDoc[];
}

const mockVerifications: Verification[] = [
  {
    id: 1, name: 'Roberto Villanueva', type: 'Seller', email: 'roberto.v@farm.co', submitted: 'Mar 27, 2026', docs: 'Farm License, ID', location: 'Nueva Ecija', status: 'Pending',
    documents: [
      { id: 'd1', name: 'Farm License', type: 'license', fileType: 'PDF', size: '2.4 MB', uploaded: 'Mar 27, 2026', preview: 'https://images.unsplash.com/photo-1679653414116-561488e28e4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXJtJTIwYWdyaWN1bHR1cmUlMjBsYW5kJTIwYWVyaWFsfGVufDF8fHx8MTc3NDg3NzU5Mnww&ixlib=rb-4.1.0&q=80&w=1080' },
      { id: 'd2', name: 'Government ID (Front)', type: 'id', fileType: 'JPG', size: '1.1 MB', uploaded: 'Mar 27, 2026', preview: 'https://images.unsplash.com/photo-1613826488523-b537c0cab318?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb3Zlcm5tZW50JTIwSUQlMjBjYXJkJTIwZG9jdW1lbnR8ZW58MXx8fHwxNzc0ODc3NTkxfDA&ixlib=rb-4.1.0&q=80&w=1080' },
      { id: 'd3', name: 'Government ID (Back)', type: 'id', fileType: 'JPG', size: '1.0 MB', uploaded: 'Mar 27, 2026', preview: 'https://images.unsplash.com/photo-1612365922929-eb3b5b4bddb0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXNzcG9ydCUyMGlkZW50aWZpY2F0aW9uJTIwcGhvdG8lMjBwYWdlfGVufDF8fHx8MTc3NDg3NzU5N3ww&ixlib=rb-4.1.0&q=80&w=1080' },
    ],
  },
  {
    id: 2, name: 'Elena Pascual', type: 'Laborer', email: 'elena.p@mail.com', submitted: 'Mar 28, 2026', docs: 'Work Permit, ID, Certificate', location: 'Isabela', status: 'Pending',
    documents: [
      { id: 'd4', name: 'Work Permit', type: 'permit', fileType: 'PDF', size: '3.2 MB', uploaded: 'Mar 28, 2026', preview: 'https://images.unsplash.com/photo-1620887110499-d54ecf17cefb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b3JrJTIwcGVybWl0JTIwY2VydGlmaWNhdGUlMjBwYXBlcnxlbnwxfHx8fDE3NzQ4Nzc1OTN8MA&ixlib=rb-4.1.0&q=80&w=1080' },
      { id: 'd5', name: 'Government ID', type: 'id', fileType: 'JPG', size: '1.3 MB', uploaded: 'Mar 28, 2026', preview: 'https://images.unsplash.com/photo-1613826488523-b537c0cab318?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb3Zlcm5tZW50JTIwSUQlMjBjYXJkJTIwZG9jdW1lbnR8ZW58MXx8fHwxNzc0ODc3NTkxfDA&ixlib=rb-4.1.0&q=80&w=1080' },
      { id: 'd6', name: 'Skills Certificate - Agriculture', type: 'certificate', fileType: 'PDF', size: '1.8 MB', uploaded: 'Mar 28, 2026', preview: 'https://images.unsplash.com/photo-1715173679369-18006e84d6a8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGxpY2Vuc2UlMjBjZXJ0aWZpY2F0ZSUyMG9mZmljaWFsfGVufDF8fHx8MTc3NDg3NzU5Mnww&ixlib=rb-4.1.0&q=80&w=1080' },
      { id: 'd7', name: 'TESDA NC II - Farm Operations', type: 'certificate', fileType: 'PDF', size: '2.1 MB', uploaded: 'Mar 28, 2026', preview: 'https://images.unsplash.com/photo-1604235250721-0e4bc4a78213?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2lhbCUyMHN0YW1wJTIwbm90YXJpemVkJTIwZG9jdW1lbnQlMjBwYXBlcnxlbnwxfHx8fDE3NzQ4Nzc1OTd8MA&ixlib=rb-4.1.0&q=80&w=1080' },
    ],
  },
  {
    id: 3, name: 'Marco Dela Cruz', type: 'Seller', email: 'marco.dc@farm.co', submitted: 'Mar 28, 2026', docs: 'Farm License, Business Permit', location: 'Benguet', status: 'Pending',
    documents: [
      { id: 'd8', name: 'Farm License Certificate', type: 'license', fileType: 'PDF', size: '2.7 MB', uploaded: 'Mar 28, 2026', preview: 'https://images.unsplash.com/photo-1604235250721-0e4bc4a78213?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2lhbCUyMHN0YW1wJTIwbm90YXJpemVkJTIwZG9jdW1lbnQlMjBwYXBlcnxlbnwxfHx8fDE3NzQ4Nzc1OTd8MA&ixlib=rb-4.1.0&q=80&w=1080' },
      { id: 'd9', name: 'Business Permit 2026', type: 'permit', fileType: 'PDF', size: '1.9 MB', uploaded: 'Mar 28, 2026', preview: 'https://images.unsplash.com/photo-1715173679369-18006e84d6a8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGxpY2Vuc2UlMjBjZXJ0aWZpY2F0ZSUyMG9mZmljaWFsfGVufDF8fHx8MTc3NDg3NzU5Mnww&ixlib=rb-4.1.0&q=80&w=1080' },
      { id: 'd10', name: 'Farm Photo - Aerial View', type: 'photo', fileType: 'JPG', size: '4.5 MB', uploaded: 'Mar 28, 2026', preview: 'https://images.unsplash.com/photo-1679653414116-561488e28e4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXJtJTIwYWdyaWN1bHR1cmUlMjBsYW5kJTIwYWVyaWFsfGVufDF8fHx8MTc3NDg3NzU5Mnww&ixlib=rb-4.1.0&q=80&w=1080' },
    ],
  },
  {
    id: 4, name: 'Sophia Ramos', type: 'Laborer', email: 'sophia.r@mail.com', submitted: 'Mar 29, 2026', docs: 'ID, Skills Certificate', location: 'Cavite', status: 'Pending',
    documents: [
      { id: 'd11', name: 'Government ID', type: 'id', fileType: 'JPG', size: '1.2 MB', uploaded: 'Mar 29, 2026', preview: 'https://images.unsplash.com/photo-1612365922929-eb3b5b4bddb0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXNzcG9ydCUyMGlkZW50aWZpY2F0aW9uJTIwcGhvdG8lMjBwYWdlfGVufDF8fHx8MTc3NDg3NzU5N3ww&ixlib=rb-4.1.0&q=80&w=1080' },
      { id: 'd12', name: 'Skills Certificate - Harvesting', type: 'certificate', fileType: 'PDF', size: '1.6 MB', uploaded: 'Mar 29, 2026', preview: 'https://images.unsplash.com/photo-1620887110499-d54ecf17cefb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b3JrJTIwcGVybWl0JTIwY2VydGlmaWNhdGUlMjBwYXBlcnxlbnwxfHx8fDE3NzQ4Nzc1OTN8MA&ixlib=rb-4.1.0&q=80&w=1080' },
    ],
  },
  {
    id: 5, name: 'Antonio Bautista', type: 'Seller', email: 'antonio.b@farm.co', submitted: 'Mar 29, 2026', docs: 'Farm License, ID', location: 'Batangas', status: 'Pending',
    documents: [
      { id: 'd13', name: 'Farm License', type: 'license', fileType: 'PDF', size: '2.3 MB', uploaded: 'Mar 29, 2026', preview: 'https://images.unsplash.com/photo-1715173679369-18006e84d6a8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGxpY2Vuc2UlMjBjZXJ0aWZpY2F0ZSUyMG9mZmljaWFsfGVufDF8fHx8MTc3NDg3NzU5Mnww&ixlib=rb-4.1.0&q=80&w=1080' },
      { id: 'd14', name: 'Government ID (Front)', type: 'id', fileType: 'JPG', size: '1.0 MB', uploaded: 'Mar 29, 2026', preview: 'https://images.unsplash.com/photo-1613826488523-b537c0cab318?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb3Zlcm5tZW50JTIwSUQlMjBjYXJkJTIwZG9jdW1lbnR8ZW58MXx8fHwxNzc0ODc3NTkxfDA&ixlib=rb-4.1.0&q=80&w=1080' },
      { id: 'd15', name: 'Government ID (Back)', type: 'id', fileType: 'JPG', size: '0.9 MB', uploaded: 'Mar 29, 2026', preview: 'https://images.unsplash.com/photo-1612365922929-eb3b5b4bddb0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXNzcG9ydCUyMGlkZW50aWZpY2F0aW9uJTIwcGhvdG8lMjBwYWdlfGVufDF8fHx8MTc3NDg3NzU5N3ww&ixlib=rb-4.1.0&q=80&w=1080' },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, change, changeType, color }: {
  icon: any; label: string; value: string; change: string; changeType: 'up' | 'down'; color: string;
}) {
  const colorMap: Record<string, { bg: string; iconBg: string; iconText: string }> = {
    green: { bg: 'bg-green-50', iconBg: 'from-green-500 to-green-600', iconText: 'text-green-600' },
    blue: { bg: 'bg-blue-50', iconBg: 'from-blue-500 to-blue-600', iconText: 'text-blue-600' },
    orange: { bg: 'bg-orange-50', iconBg: 'from-orange-500 to-orange-600', iconText: 'text-orange-600' },
    red: { bg: 'bg-red-50', iconBg: 'from-red-500 to-red-600', iconText: 'text-red-600' },
  };
  const c = colorMap[color] || colorMap.green;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 bg-gradient-to-br ${c.iconBg} rounded-xl flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className={`flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded-full ${changeType === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {changeType === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          <span>{change}</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active: 'bg-green-100 text-green-700',
    Suspended: 'bg-red-100 text-red-700',
    Pending: 'bg-amber-100 text-amber-700',
    Delivered: 'bg-green-100 text-green-700',
    Shipped: 'bg-blue-100 text-blue-700',
    Processing: 'bg-indigo-100 text-indigo-700',
    Cancelled: 'bg-gray-200 text-gray-600',
    Paid: 'bg-green-100 text-green-700',
    Escrow: 'bg-amber-100 text-amber-700',
    Refunded: 'bg-gray-200 text-gray-600',
    Completed: 'bg-green-100 text-green-700',
    Scheduled: 'bg-blue-100 text-blue-700',
    Flagged: 'bg-red-100 text-red-700',
    'Out of Stock': 'bg-gray-200 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all"
      />
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────

function DetailModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────

export function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // State for each section
  const [users, setUsers] = useState(mockUsers);
  const [products, setProducts] = useState(mockProducts);
  const [orders] = useState(mockOrders);
  const [bookings, setBookings] = useState(mockBookings);
  const [verifications, setVerifications] = useState(mockVerifications);

  // Search
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');

  // Detail modals
  const [viewUser, setViewUser] = useState<typeof mockUsers[0] | null>(null);
  const [viewProduct, setViewProduct] = useState<typeof mockProducts[0] | null>(null);
  const [viewOrder, setViewOrder] = useState<typeof mockOrders[0] | null>(null);
  const [viewBooking, setViewBooking] = useState<typeof mockBookings[0] | null>(null);

  // Verification document viewer
  const [expandedVerification, setExpandedVerification] = useState<number | null>(null);
  const [viewingDoc, setViewingDoc] = useState<VerificationDoc | null>(null);

  // Notifications
  const [adminNotifications, setAdminNotifications] = useState([
    { id: 1, text: 'New seller verification request from Roberto Villanueva', time: '5 min ago', read: false },
    { id: 2, text: 'Order ORD-20260303 flagged for review', time: '1 hr ago', read: false },
    { id: 3, text: '3 new users registered today', time: '2 hrs ago', read: true },
    { id: 4, text: 'Product "Free-Range Eggs" reported by buyer', time: '3 hrs ago', read: false },
  ]);
  const unreadCount = adminNotifications.filter(n => !n.read).length;

  const tabs = [
    { id: 'dashboard' as AdminTab, name: 'Dashboard', icon: LayoutDashboard },
    { id: 'users' as AdminTab, name: 'Users', icon: Users },
    { id: 'products' as AdminTab, name: 'Products', icon: ShoppingBag },
    { id: 'orders' as AdminTab, name: 'Orders', icon: Package },
    { id: 'bookings' as AdminTab, name: 'Bookings', icon: CalendarCheck },
    { id: 'verification' as AdminTab, name: 'Verification', icon: ShieldCheck },
  ];

  // ─── Actions ─────────────────────────────────────────────────

  const toggleUserStatus = (id: number) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'Active' ? 'Suspended' as const : 'Active' as const } : u));
  };

  const removeProduct = (id: number) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const cancelBooking = (id: string) => {
    setBookings(bookings.map(b => b.id === id ? { ...b, status: 'Cancelled' as const } : b));
  };

  const approveVerification = (id: number) => {
    const v = verifications.find(ver => ver.id === id);
    if (v) {
      // Try to find matching user by name and mark as verified
      const matchIdx = users.findIndex(u => u.name === v.name);
      if (matchIdx !== -1) {
        setUsers(users.map(u => u.name === v.name ? { ...u, verified: true } : u));
      } else {
        // Add as new verified user
        setUsers([...users, {
          id: Date.now(), name: v.name, email: v.email, role: v.type === 'Seller' ? 'Farmer' : 'Laborer',
          status: 'Active' as const, joined: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          avatar: v.name.split(' ').map(n => n[0]).join(''), location: v.location, verified: true,
        }]);
      }
    }
    setVerifications(verifications.filter(ver => ver.id !== id));
  };

  const rejectVerification = (id: number) => {
    setVerifications(verifications.filter(v => v.id !== id));
  };

  // ─── Render Sections ────────────────────────────────────────

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Users} label="Total Users" value="2,547" change="12.5%" changeType="up" color="green" />
        <SummaryCard icon={Wheat} label="Total Products" value="15,320" change="8.2%" changeType="up" color="blue" />
        <SummaryCard icon={Package} label="Total Orders" value="4,812" change="3.1%" changeType="up" color="orange" />
        <SummaryCard icon={ShieldCheck} label="Pending Verifications" value={String(verifications.length)} change="2 new" changeType="up" color="red" />
      </div>

      {/* Quick Stats Row */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h4 className="text-sm text-gray-500 mb-3">Revenue This Month</h4>
          <p className="text-3xl font-bold text-gray-900">$48,250</p>
          <div className="flex items-center space-x-1 mt-1 text-green-600 text-sm">
            <ArrowUpRight className="w-4 h-4" />
            <span>+18.2% from last month</span>
          </div>
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full" style={{ width: '72%' }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">72% of monthly target</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h4 className="text-sm text-gray-500 mb-3">Active Bookings</h4>
          <p className="text-3xl font-bold text-gray-900">126</p>
          <div className="flex items-center space-x-1 mt-1 text-green-600 text-sm">
            <ArrowUpRight className="w-4 h-4" />
            <span>+5.4% from last week</span>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className="flex-1 text-center p-2 bg-green-50 rounded-lg">
              <p className="text-sm font-semibold text-green-700">84</p>
              <p className="text-xs text-green-600">Labor</p>
            </div>
            <div className="flex-1 text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold text-blue-700">42</p>
              <p className="text-xs text-blue-600">Services</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h4 className="text-sm text-gray-500 mb-3">Platform Health</h4>
          <div className="space-y-3 mt-1">
            {[
              { label: 'Uptime', value: '99.9%', color: 'bg-green-500' },
              { label: 'Avg Response', value: '142ms', color: 'bg-blue-500' },
              { label: 'Error Rate', value: '0.02%', color: 'bg-green-500' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.label}</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-sm font-medium text-gray-900">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity & Verification */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-4">Recent Activity</h4>
          <div className="space-y-3">
            {[
              { icon: Users, text: 'New user John Reyes registered', time: '5 min ago', color: 'text-green-600 bg-green-100' },
              { icon: Package, text: 'Order ORD-20260304 placed', time: '15 min ago', color: 'text-blue-600 bg-blue-100' },
              { icon: ShieldCheck, text: 'Seller verification submitted', time: '1 hr ago', color: 'text-orange-600 bg-orange-100' },
              { icon: AlertTriangle, text: 'Product flagged for review', time: '2 hrs ago', color: 'text-red-600 bg-red-100' },
              { icon: DollarSign, text: 'Payment of $312.50 in escrow', time: '3 hrs ago', color: 'text-indigo-600 bg-indigo-100' },
            ].map((item, i) => (
              <div key={i} className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{item.text}</p>
                  <p className="text-xs text-gray-400">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Pending Verifications</h4>
            <button onClick={() => setActiveTab('verification')} className="text-sm text-green-600 hover:text-green-700 font-medium">View All</button>
          </div>
          <div className="space-y-3">
            {verifications.slice(0, 4).map(v => (
              <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold ${v.type === 'Seller' ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-orange-500 to-orange-600'}`}>
                    {v.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{v.name}</p>
                    <p className="text-xs text-gray-500">{v.type} · {v.submitted}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button onClick={() => approveVerification(v.id)} className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button onClick={() => rejectVerification(v.id)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {verifications.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">All verifications processed</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => {
    const filtered = users.filter(u =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
    );
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-500">{users.length} registered users</p>
          </div>
          <SearchBar value={userSearch} onChange={setUserSearch} placeholder="Search users..." />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Verified</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                            {user.avatar}
                          </div>
                          {user.verified && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white" title="Verified">
                              <BadgeCheck className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            {user.verified && (
                              <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 sm:hidden">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 hidden sm:table-cell">{user.email}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-700 font-medium">{user.role}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {user.verified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          <BadgeCheck className="w-3.5 h-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={user.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button onClick={() => setViewUser(user)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleUserStatus(user.id)} className={`p-2 rounded-lg transition-colors ${user.status === 'Active' ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`} title={user.status === 'Active' ? 'Suspend' : 'Reactivate'}>
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No users found</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProducts = () => {
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.seller.toLowerCase().includes(productSearch.toLowerCase())
    );
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Product Management</h2>
            <p className="text-sm text-gray-500">{products.length} listed products</p>
          </div>
          <SearchBar value={productSearch} onChange={setProductSearch} placeholder="Search products..." />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Seller</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Stock</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-400">{product.category}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 hidden sm:table-cell">{product.seller}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">${product.price.toFixed(2)}/kg</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">{product.stock.toLocaleString()} kg</td>
                    <td className="px-5 py-3.5"><StatusBadge status={product.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button onClick={() => setViewProduct(product)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeProduct(product.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No products found</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderOrders = () => {
    const filtered = orders.filter(o =>
      o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.buyer.toLowerCase().includes(orderSearch.toLowerCase())
    );
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Order Management</h2>
            <p className="text-sm text-gray-500">{orders.length} total orders</p>
          </div>
          <SearchBar value={orderSearch} onChange={setOrderSearch} placeholder="Search orders..." />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Buyer</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Total</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Payment</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{order.id}</p>
                      <p className="text-xs text-gray-400">{order.date}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{order.buyer}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900 hidden sm:table-cell">${order.total.toFixed(2)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={order.status} /></td>
                    <td className="px-5 py-3.5 hidden md:table-cell"><StatusBadge status={order.payment} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => setViewOrder(order)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No orders found</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBookings = () => {
    const filtered = bookings.filter(b =>
      b.id.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.buyer.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.laborer.toLowerCase().includes(bookingSearch.toLowerCase())
    );
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Booking Management</h2>
            <p className="text-sm text-gray-500">{bookings.length} total bookings</p>
          </div>
          <SearchBar value={bookingSearch} onChange={setBookingSearch} placeholder="Search bookings..." />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking ID</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Buyer</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Laborer</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Service</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(booking => (
                  <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{booking.id}</p>
                      <p className="text-xs text-gray-400">{booking.date}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{booking.buyer}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 hidden sm:table-cell">{booking.laborer}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">{booking.service}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={booking.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button onClick={() => setViewBooking(booking)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        {(booking.status === 'Active' || booking.status === 'Scheduled' || booking.status === 'Pending') && (
                          <button onClick={() => cancelBooking(booking.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No bookings found</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'id': return FileImage;
      case 'license': case 'permit': return FileText;
      case 'certificate': return File;
      case 'photo': return FileImage;
      default: return FileText;
    }
  };

  const getDocColor = (type: string) => {
    switch (type) {
      case 'id': return 'bg-blue-100 text-blue-600';
      case 'license': return 'bg-green-100 text-green-600';
      case 'permit': return 'bg-purple-100 text-purple-600';
      case 'certificate': return 'bg-amber-100 text-amber-600';
      case 'photo': return 'bg-indigo-100 text-indigo-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const renderVerification = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Verification Management</h2>
        <p className="text-sm text-gray-500">{verifications.length} pending verifications</p>
      </div>

      {verifications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-lg font-medium text-gray-700">All Caught Up!</p>
          <p className="text-sm text-gray-400 mt-1">No pending verifications to review.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {verifications.map(v => {
            const isExpanded = expandedVerification === v.id;
            return (
              <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden">
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg ${v.type === 'Seller' ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-orange-500 to-orange-600'}`}>
                        {v.type === 'Seller' ? <Sprout className="w-6 h-6" /> : <HardHat className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{v.name}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${v.type === 'Seller' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {v.type}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" />{v.email}</span>
                          <span className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{v.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 sm:flex-shrink-0">
                      <button
                        onClick={() => approveVerification(v.id)}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-sm hover:shadow-md transition-all duration-200 text-sm font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => rejectVerification(v.id)}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all duration-200 text-sm font-medium"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Submitted: {v.submitted}</span>
                    <span className="flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" /> {v.documents.length} Documents Submitted</span>
                  </div>

                  {/* View Documents Toggle */}
                  <button
                    onClick={() => setExpandedVerification(isExpanded ? null : v.id)}
                    className="mt-3 w-full flex items-center justify-center space-x-2 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 text-sm font-medium text-gray-700"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{isExpanded ? 'Hide Documents' : `View ${v.documents.length} Documents`}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expandable Documents Section */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-5">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      Submitted Documents
                    </h4>

                    {/* Document Grid */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {v.documents.map(doc => {
                        const DocIcon = getDocIcon(doc.type);
                        const docColor = getDocColor(doc.type);
                        return (
                          <div key={doc.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 group">
                            {/* Document Preview Thumbnail */}
                            <div
                              className="relative h-36 bg-gray-100 cursor-pointer overflow-hidden"
                              onClick={() => setViewingDoc(doc)}
                            >
                              <img
                                src={doc.preview}
                                alt={doc.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg">
                                  <ZoomIn className="w-5 h-5 text-gray-700" />
                                </div>
                              </div>
                              {/* File type badge */}
                              <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-xs rounded-md font-medium">
                                {doc.fileType}
                              </div>
                            </div>

                            {/* Document Info */}
                            <div className="p-3">
                              <div className="flex items-start gap-2.5">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${docColor}`}>
                                  <DocIcon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">{doc.size} · {doc.uploaded}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 mt-2.5">
                                <button
                                  onClick={() => setViewingDoc(doc)}
                                  className="flex-1 flex items-center justify-center space-x-1 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </button>
                                <button
                                  className="flex-1 flex items-center justify-center space-x-1 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Document Summary Bar */}
                    <div className="mt-4 p-3 bg-white rounded-xl border border-gray-200 flex flex-wrap items-center gap-3">
                      <span className="text-xs font-medium text-gray-500">Summary:</span>
                      {(() => {
                        const typeCounts: Record<string, number> = {};
                        v.documents.forEach(d => {
                          const label = d.type === 'id' ? 'ID Documents' : d.type === 'license' ? 'Licenses' : d.type === 'permit' ? 'Permits' : d.type === 'certificate' ? 'Certificates' : 'Photos';
                          typeCounts[label] = (typeCounts[label] || 0) + 1;
                        });
                        return Object.entries(typeCounts).map(([label, count]) => (
                          <span key={label} className="inline-flex items-center px-2 py-1 bg-gray-50 rounded-md text-xs text-gray-600">
                            {count}x {label}
                          </span>
                        ));
                      })()}
                      <span className="text-xs text-gray-400 ml-auto">
                        Total: {v.documents.reduce((sum, d) => sum + parseFloat(d.size), 0).toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'users': return renderUsers();
      case 'products': return renderProducts();
      case 'orders': return renderOrders();
      case 'bookings': return renderBookings();
      case 'verification': return renderVerification();
      default: return renderDashboard();
    }
  };

  // ─── Main Layout ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30 backdrop-blur-lg bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">AgriHub</h1>
                <p className="text-xs text-gray-500">Admin Panel</p>
              </div>
            </div>

            <nav className="hidden lg:flex space-x-1 bg-gray-50 rounded-full p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-full transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white text-green-600 shadow-md'
                      : 'text-gray-600 hover:text-green-600 hover:bg-white/50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.name}</span>
                  {tab.id === 'verification' && verifications.length > 0 && (
                    <span className="w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                      {verifications.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-red-500 to-red-600 rounded-full text-xs flex items-center justify-center text-white font-medium shadow-lg shadow-red-500/30">
                    {unreadCount}
                  </span>
                )}
              </button>
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-md shadow-green-500/20">
                  <span className="text-sm font-semibold text-white">A</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 leading-tight">Admin</p>
                  <p className="text-xs text-green-600 leading-tight">Super Admin</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-all duration-200">
                {mobileMenuOpen ? <X className="w-6 h-6 text-gray-600" /> : <Menu className="w-6 h-6 text-gray-600" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-4 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === tab.id ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.name}</span>
                  </div>
                  {tab.id === 'verification' && verifications.length > 0 && (
                    <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium ${activeTab === tab.id ? 'bg-white/30 text-white' : 'bg-red-500 text-white'}`}>
                      {verifications.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Notification Dropdown */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)}>
          <div className="absolute top-16 right-4 sm:right-8 lg:right-[calc((100%-80rem)/2+2rem)] w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Notifications</h4>
              <button onClick={() => { setAdminNotifications(n => n.map(x => ({ ...x, read: true }))); }} className="text-xs text-green-600 font-medium hover:text-green-700">Mark all read</button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {adminNotifications.map(n => (
                <div key={n.id} className={`p-4 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-green-50/30' : ''}`}>
                  <p className="text-sm text-gray-700">{n.text}</p>
                  <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-lg border-t border-gray-100 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">&copy; 2026 AgriHub Admin. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-sm text-gray-500 hover:text-green-600 transition-colors">Support</a>
              <Link to="/privacy" className="text-sm text-gray-500 hover:text-green-600 transition-colors">Privacy</Link>
              <Link to="/terms" className="text-sm text-gray-500 hover:text-green-600 transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Detail Modals */}
      {viewUser && (
        <DetailModal title="User Details" onClose={() => setViewUser(null)}>
          <div className="text-center mb-5">
            <div className="relative inline-block">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {viewUser.avatar}
              </div>
              {viewUser.verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  <BadgeCheck className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <p className="text-lg font-semibold text-gray-900">{viewUser.name}</p>
              {viewUser.verified && <BadgeCheck className="w-5 h-5 text-blue-500" />}
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <StatusBadge status={viewUser.status} />
              {viewUser.verified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <BadgeCheck className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                  Unverified
                </span>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Email', value: viewUser.email },
              { label: 'Role', value: viewUser.role },
              { label: 'Verified', value: viewUser.verified ? 'Yes' : 'No' },
              { label: 'Location', value: viewUser.location },
              { label: 'Joined', value: viewUser.joined },
            ].map(item => (
              <div key={item.label} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => { toggleUserStatus(viewUser.id); setViewUser(null); }}
            className={`w-full mt-5 py-2.5 rounded-xl text-sm font-medium transition-all ${viewUser.status === 'Active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
          >
            {viewUser.status === 'Active' ? 'Suspend User' : 'Reactivate User'}
          </button>
        </DetailModal>
      )}

      {viewProduct && (
        <DetailModal title="Product Details" onClose={() => setViewProduct(null)}>
          <div className="space-y-3">
            {[
              { label: 'Product', value: viewProduct.name },
              { label: 'Category', value: viewProduct.category },
              { label: 'Seller', value: viewProduct.seller },
              { label: 'Price', value: `$${viewProduct.price.toFixed(2)}/kg` },
              { label: 'Stock', value: `${viewProduct.stock.toLocaleString()} kg` },
              { label: 'Status', value: viewProduct.status },
            ].map(item => (
              <div key={item.label} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => { removeProduct(viewProduct.id); setViewProduct(null); }}
            className="w-full mt-5 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-all"
          >
            Remove Product
          </button>
        </DetailModal>
      )}

      {viewOrder && (
        <DetailModal title="Order Details" onClose={() => setViewOrder(null)}>
          <div className="space-y-3">
            {[
              { label: 'Order ID', value: viewOrder.id },
              { label: 'Buyer', value: viewOrder.buyer },
              { label: 'Date', value: viewOrder.date },
              { label: 'Items', value: String(viewOrder.items) },
              { label: 'Total', value: `$${viewOrder.total.toFixed(2)}` },
              { label: 'Status', value: viewOrder.status },
              { label: 'Payment', value: viewOrder.payment },
            ].map(item => (
              <div key={item.label} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </DetailModal>
      )}

      {viewBooking && (
        <DetailModal title="Booking Details" onClose={() => setViewBooking(null)}>
          <div className="space-y-3">
            {[
              { label: 'Booking ID', value: viewBooking.id },
              { label: 'Buyer', value: viewBooking.buyer },
              { label: 'Laborer', value: viewBooking.laborer },
              { label: 'Service', value: viewBooking.service },
              { label: 'Date', value: viewBooking.date },
              { label: 'Duration', value: viewBooking.duration },
              { label: 'Status', value: viewBooking.status },
            ].map(item => (
              <div key={item.label} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
          {(viewBooking.status === 'Active' || viewBooking.status === 'Scheduled' || viewBooking.status === 'Pending') && (
            <button
              onClick={() => { cancelBooking(viewBooking.id); setViewBooking(null); }}
              className="w-full mt-5 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-all"
            >
              Cancel Booking
            </button>
          )}
        </DetailModal>
      )}

      {/* Full Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setViewingDoc(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white">
              <div className="flex items-center space-x-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getDocColor(viewingDoc.type)}`}>
                  {(() => { const Icon = getDocIcon(viewingDoc.type); return <Icon className="w-4.5 h-4.5" />; })()}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{viewingDoc.name}</h3>
                  <p className="text-xs text-gray-400">{viewingDoc.fileType} · {viewingDoc.size} · Uploaded {viewingDoc.uploaded}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Download">
                  <Download className="w-4.5 h-4.5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Open in new tab">
                  <ExternalLink className="w-4.5 h-4.5" />
                </button>
                <button onClick={() => setViewingDoc(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* Image Preview */}
            <div className="bg-gray-900 flex items-center justify-center overflow-auto" style={{ maxHeight: 'calc(90vh - 60px)' }}>
              <img
                src={viewingDoc.preview}
                alt={viewingDoc.name}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}