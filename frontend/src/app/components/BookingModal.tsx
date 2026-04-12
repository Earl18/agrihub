import { useState } from 'react';
import { X, Calendar, Clock, MapPin, User } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'labor' | 'service';
  item: any;
  onConfirm: (bookingData: any) => void;
}

export function BookingModal({ isOpen, onClose, type, item, onConfirm }: BookingModalProps) {
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    duration: '',
    location: '',
    notes: '',
  });

  if (!isOpen || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const bookingData = {
      ...formData,
      itemName: item.name,
      itemType: item.type || item.category,
      rate: item.rate || item.price,
      provider: item.provider || item.seller,
    };

    onConfirm(bookingData);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-white/30 z-50 flex items-center justify-center p-4 backdrop-blur-md"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {type === 'labor' ? 'Book Worker' : 'Book Service'}
                </h2>
                <p className="text-green-100 text-sm mt-1">{item.name}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Item Details */}
            <div className="bg-gradient-to-br from-gray-50 to-green-50 rounded-2xl p-6 mb-6 border border-gray-100">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                  {type === 'labor' ? <User className="w-6 h-6 text-white" /> : <div className="text-2xl">{item.image}</div>}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">{item.provider || item.seller}</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">Rate</span>
                <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                  ${item.rate || item.price}/{item.unit || 'hour'}
                </span>
              </div>
            </div>

            {/* Date */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Time */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Time
              </label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Duration */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration
              </label>
              <select
                required
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              >
                <option value="">Select duration</option>
                <option value="2 hours">2 hours</option>
                <option value="4 hours">4 hours</option>
                <option value="6 hours">6 hours</option>
                <option value="8 hours">8 hours (Full day)</option>
                <option value="2 days">2 days</option>
                <option value="3 days">3 days</option>
                <option value="1 week">1 week</option>
              </select>
            </div>

            {/* Location */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Location
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Field A, Storage Area"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any special requirements or instructions..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all duration-200 font-semibold"
              >
                Confirm Booking
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}