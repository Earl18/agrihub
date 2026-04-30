import { useEffect, useState } from 'react';
import { Truck, Wrench, Droplet, Scissors, Calendar, Clock, MapPin, ArrowLeft, Eye, XCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { getServicesData } from '../../features/app/api';
import { SessionUser } from '../../shared/auth/session';
import { addStoredActivity } from '../../shared/activity/store';
import { formatPhpCurrency } from '../../shared/format/currency';
import { addStoredNotification } from '../../shared/notifications/store';

interface ServicesBookingProps {
  onBookService: (service: any) => void;
  currentUser: SessionUser | null;
}

interface Booking {
  id: number;
  service: string;
  provider: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  description: string;
  rate: string;
  contact: string;
  bookingRef: string;
}

export function ServicesBooking({ onBookService, currentUser }: ServicesBookingProps) {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);
  const [liveProviders, setLiveProviders] = useState<any[]>([]);
  const [liveBookings, setLiveBookings] = useState<Booking[]>([]);
  const isCommerciallyRestricted = currentUser?.canManageCommercialFeatures === false;

  const serviceCategories = [
    { id: 'equipment', name: 'Equipment Rental', icon: Truck, color: 'bg-blue-500' },
    { id: 'maintenance', name: 'Maintenance', icon: Wrench, color: 'bg-orange-500' },
    { id: 'irrigation', name: 'Irrigation Services', icon: Droplet, color: 'bg-cyan-500' },
    { id: 'harvesting', name: 'Harvesting Services', icon: Scissors, color: 'bg-green-500' },
  ];

  useEffect(() => {
    getServicesData()
      .then((payload) => {
        setLiveProviders(payload.providers || []);
        setLiveBookings(payload.bookings || []);
      })
      .catch(() => undefined);
  }, []);

  const handleCancelBooking = (id: number) => {
    const cancelledBooking = liveBookings.find((booking) => booking.id === id);

    setLiveBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b));
    if (currentUser?.id && cancelledBooking) {
      addStoredActivity(currentUser.id, {
        description: `Cancelled service booking for ${cancelledBooking.service}`,
        status: 'confirmed',
      });
      addStoredNotification(currentUser.id, {
        sourceKey: `service-booking-cancelled-${cancelledBooking.bookingRef || cancelledBooking.id}`,
        type: 'warning',
        title: 'Service booking cancelled',
        message: `${cancelledBooking.service} on ${cancelledBooking.date} has been cancelled.`,
      });
    }
    setCancelConfirmId(null);
  };

  const currentServices = selectedService ? liveProviders.filter((provider: any) => provider.categoryId === selectedService).flatMap((provider: any) => provider.services) : [];
  const displayBookings = liveBookings;

  // ==================== BOOKING DETAILS VIEW ====================
  if (viewingBooking) {
    const booking = displayBookings.find(b => b.id === viewingBooking.id) || viewingBooking;
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Back button */}
        <button
          onClick={() => setViewingBooking(null)}
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors active:scale-[0.98]"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Bookings</span>
        </button>

        {/* Details Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-8 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-green-100 text-sm mb-1">Booking Reference</p>
                <p className="font-mono text-lg mb-3">{booking.bookingRef}</p>
                <h2 className="text-2xl font-bold">{booking.service}</h2>
                <p className="text-green-100 mt-1">{booking.provider}</p>
              </div>
              <StatusBadgeLarge status={booking.status} />
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Booking Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <DetailRow icon={<Calendar className="w-5 h-5 text-green-600" />} label="Date" value={booking.date} />
              <DetailRow icon={<Clock className="w-5 h-5 text-green-600" />} label="Time" value={`${booking.time} (${booking.duration})`} />
              <DetailRow icon={<MapPin className="w-5 h-5 text-green-600" />} label="Location" value={booking.location} />
              <DetailRow icon={<Info className="w-5 h-5 text-green-600" />} label="Rate" value={formatServiceRateLabel(booking.rate)} />
            </div>

            {/* Description */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Service Description</h3>
              <p className="text-gray-700 bg-gray-50 rounded-xl p-4">{booking.description}</p>
            </div>

            {/* Provider Contact */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Provider Contact</h3>
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{booking.provider}</p>
                  <p className="text-sm text-gray-500">{booking.contact}</p>
                </div>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-[0.98] transition-all text-sm">
                  Contact
                </button>
              </div>
            </div>

            {/* Cancelled Message */}
            {booking.status === 'cancelled' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
                <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-red-800">This booking has been cancelled</p>
                  <p className="text-sm text-red-600 mt-0.5">If you need this service, please create a new booking.</p>
                </div>
              </div>
            )}

            {/* Actions */}
            {booking.status !== 'cancelled' && (
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setViewingBooking(null);
                    setCancelConfirmId(booking.id);
                  }}
                  className="px-6 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 active:scale-[0.98] transition-all font-medium"
                >
                  Cancel Booking
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN VIEW ====================
  return (
    <div className="space-y-6">
      {isCommerciallyRestricted && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Your account is currently restricted. Service booking actions are limited until an admin clears the penalty.
        </div>
      )}
      {/* Cancel Confirmation Modal */}
      {cancelConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCancelConfirmId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Booking?</h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to cancel this booking? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirmId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all font-medium"
              >
                Keep Booking
              </button>
              <button
                onClick={() => handleCancelBooking(cancelConfirmId)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-[0.98] transition-all font-medium"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {serviceCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedService(category.id)}
            className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-all active:scale-[0.98] ${
              selectedService === category.id ? 'ring-2 ring-green-500' : ''
            }`}
          >
            <div className={`${category.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
              <category.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold">{category.name}</h3>
          </button>
        ))}
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Upcoming Service Bookings</h3>
        <div className="space-y-4">
          {displayBookings.map((booking) => (
            <div
              key={booking.id}
              className={`border rounded-lg p-4 transition-all duration-200 ${
                booking.status === 'cancelled'
                  ? 'border-gray-200 bg-gray-50/50 opacity-75'
                  : 'border-gray-200 hover:border-green-500'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h4 className={`font-semibold ${booking.status === 'cancelled' ? 'text-gray-400 line-through' : ''}`}>
                      {booking.service}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {booking.status === 'confirmed' ? '✓ Confirmed' :
                       booking.status === 'pending' ? '⏳ Pending' :
                       '✕ Cancelled'}
                    </span>
                  </div>
                  <p className={`text-sm mb-2 ${booking.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {booking.provider}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className={`flex items-center ${booking.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{booking.date}</span>
                    </div>
                    <div className={`flex items-center ${booking.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{booking.time}</span>
                    </div>
                    <div className={`flex items-center ${booking.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{booking.location}</span>
                    </div>
                  </div>
                  {booking.status === 'cancelled' && (
                    <p className="text-xs text-red-400 mt-2 flex items-center space-x-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>This booking has been cancelled</span>
                    </p>
                  )}
                </div>
                <div className="mt-4 md:mt-0 flex space-x-2">
                  {booking.status === 'cancelled' ? (
                    <>
                      <button
                        onClick={() => setViewingBooking(booking)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-100 active:scale-[0.98] transition-all text-sm"
                      >
                        <Eye className="w-4 h-4 inline mr-1.5" />
                        View Details
                      </button>
                      <button
                        disabled
                        className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed text-sm"
                      >
                        Cancelled
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setViewingBooking(booking)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-green-400 active:scale-[0.98] transition-all text-sm font-medium"
                      >
                        <Eye className="w-4 h-4 inline mr-1.5" />
                        View Details
                      </button>
                      <button
                        onClick={() => setCancelConfirmId(booking.id)}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 active:scale-[0.98] transition-all text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Services */}
      {selectedService && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-6">
            Available {serviceCategories.find(c => c.id === selectedService)?.name}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentServices.map((service) => (
              <div key={service.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                <div className="text-center mb-4">
                  <div className="text-5xl mb-2">{service.image}</div>
                  <h4 className="font-semibold mb-1">{service.name}</h4>
                  <p className="text-sm text-gray-600">{service.provider}</p>
                </div>
                <div className="mb-4">
                  <p className="text-2xl font-bold text-green-600 text-center">{formatPhpCurrency(service.rate)}</p>
                  <p className="text-xs text-gray-500 text-center">per {service.unit}</p>
                </div>
                <button
                  onClick={() => onBookService(service)}
                  className={`w-full py-2 rounded-lg transition-all active:scale-[0.98] ${
                    service.available && !isCommerciallyRestricted
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!service.available || isCommerciallyRestricted}
                >
                  {service.available ? 'Book Now' : 'Unavailable'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedService && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Select a Service Category</h3>
          <p className="text-sm text-gray-500">Choose a category above to browse available services</p>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start space-x-3">
      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function StatusBadgeLarge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    confirmed: { bg: 'bg-white/20', text: 'text-white', icon: <CheckCircle2 className="w-5 h-5" />, label: 'Confirmed' },
    pending: { bg: 'bg-yellow-400/30', text: 'text-yellow-100', icon: <Clock className="w-5 h-5" />, label: 'Pending' },
    cancelled: { bg: 'bg-red-400/30', text: 'text-red-100', icon: <XCircle className="w-5 h-5" />, label: 'Cancelled' },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${c.bg} ${c.text}`}>
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
}

function formatServiceRateLabel(value: string | number) {
  const normalized = String(value || '').trim();
  const amount = normalized.match(/-?\d+(?:\.\d+)?/)?.[0];

  if (!amount) {
    return normalized || 'Rate unavailable';
  }

  const unitMatch = normalized.match(/\/\s*([a-zA-Z]+)/);
  const unit = unitMatch?.[1] || 'hour';

  return `${formatPhpCurrency(Number(amount))}/${unit}`;
}

