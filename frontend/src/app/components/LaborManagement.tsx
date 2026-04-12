import { useState } from 'react';
import { Calendar, Clock, MapPin, User, Plus, CheckCircle, XCircle } from 'lucide-react';

interface LaborManagementProps {
  onBookWorker: (worker: any) => void;
}

export function LaborManagement({ onBookWorker }: LaborManagementProps) {
  const [activeTab, setActiveTab] = useState<'book' | 'active' | 'history'>('book');

  const availableWorkers = [
    { id: 1, name: 'John Martinez', type: 'Harvester', rating: 4.8, experience: '8 years', rate: 25, availability: 'Available', skills: ['Wheat', 'Rice', 'Corn'], distance: '5 km' },
    { id: 2, name: 'Maria Santos', type: 'Irrigator', rating: 4.9, experience: '10 years', rate: 22, availability: 'Available', skills: ['Drip System', 'Sprinkler', 'Flood'], distance: '3 km' },
    { id: 3, name: 'Robert Chen', type: 'Planter', rating: 4.7, experience: '6 years', rate: 20, availability: 'Available', skills: ['Seeding', 'Transplanting'], distance: '8 km' },
    { id: 4, name: 'Ana Rodriguez', type: 'Pesticide Applicator', rating: 4.6, experience: '7 years', rate: 28, availability: 'Busy', skills: ['Spraying', 'Safety'], distance: '4 km' },
    { id: 5, name: 'David Kim', type: 'General Labor', rating: 4.5, experience: '4 years', rate: 18, availability: 'Available', skills: ['Weeding', 'Loading', 'Sorting'], distance: '6 km' },
    { id: 6, name: 'Lisa Thompson', type: 'Harvester', rating: 4.9, experience: '12 years', rate: 30, availability: 'Available', skills: ['Wheat', 'Barley', 'Oats'], distance: '7 km' },
  ];

  const activeBookings = [
    { id: 1, worker: 'John Martinez', type: 'Harvester', date: '2026-02-08', time: '06:00 AM', duration: '8 hours', location: 'Field A', rate: 25, status: 'confirmed' },
    { id: 2, worker: 'Maria Santos', type: 'Irrigator', date: '2026-02-09', time: '07:00 AM', duration: '6 hours', location: 'Field B', rate: 22, status: 'confirmed' },
    { id: 3, worker: 'David Kim', type: 'General Labor', date: '2026-02-10', time: '08:00 AM', duration: '4 hours', location: 'Storage', rate: 18, status: 'pending' },
  ];

  const bookingHistory = [
    { id: 1, worker: 'Lisa Thompson', type: 'Harvester', date: '2026-02-05', duration: '8 hours', location: 'Field C', cost: 240, status: 'completed', rating: 5 },
    { id: 2, worker: 'Robert Chen', type: 'Planter', date: '2026-02-03', duration: '6 hours', location: 'Field A', cost: 120, status: 'completed', rating: 4 },
    { id: 3, worker: 'John Martinez', type: 'Harvester', date: '2026-02-01', duration: '8 hours', location: 'Field B', cost: 200, status: 'completed', rating: 5 },
    { id: 4, worker: 'Maria Santos', type: 'Irrigator', date: '2026-01-28', duration: '4 hours', location: 'Field A', cost: 88, status: 'cancelled', rating: null },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow p-2 flex space-x-2">
        <button
          onClick={() => setActiveTab('book')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'book' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Book Workers
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'active' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Active Bookings ({activeBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'history' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          History
        </button>
      </div>

      {activeTab === 'book' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                <option>All Types</option>
                <option>Harvester</option>
                <option>Planter</option>
                <option>Irrigator</option>
                <option>General Labor</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                <option>All Availability</option>
                <option>Available</option>
                <option>Busy</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                <option>Sort by: Rating</option>
                <option>Sort by: Rate</option>
                <option>Sort by: Distance</option>
                <option>Sort by: Experience</option>
              </select>
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Quick Book Team</span>
              </button>
            </div>
          </div>

          {/* Available Workers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {availableWorkers.map((worker) => (
              <div key={worker.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{worker.name}</h3>
                      <p className="text-sm text-gray-600">{worker.type}</p>
                      <div className="flex items-center mt-1">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm ml-1">{worker.rating}</span>
                        <span className="text-sm text-gray-500 ml-2">• {worker.experience}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    worker.availability === 'Available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {worker.availability}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{worker.distance} away</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {worker.skills.map((skill, index) => (
                      <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-2xl font-bold text-green-600">${worker.rate}</p>
                    <p className="text-xs text-gray-500">per hour</p>
                  </div>
                  <button 
                    onClick={() => onBookWorker(worker)}
                    className={`px-6 py-2 rounded-lg transition-colors ${
                      worker.availability === 'Available'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={worker.availability !== 'Available'}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'active' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-6">Active Labor Bookings</h3>
            <div className="space-y-4">
              {activeBookings.map((booking) => (
                <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:border-green-500 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{booking.worker}</h4>
                          <p className="text-sm text-gray-600">{booking.type}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>{booking.date}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>{booking.time} ({booking.duration})</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span>{booking.location}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <span className="font-semibold text-green-600">${booking.rate}/hr</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 flex space-x-2">
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Contact
                      </button>
                      <button className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-6">Booking History</h3>
            <div className="space-y-4">
              {bookingHistory.map((booking) => (
                <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{booking.worker}</h4>
                          <p className="text-sm text-gray-600">{booking.type}</p>
                        </div>
                        {booking.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Date</p>
                          <p className="font-medium">{booking.date}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Duration</p>
                          <p className="font-medium">{booking.duration}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Location</p>
                          <p className="font-medium">{booking.location}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Cost</p>
                          <p className="font-medium text-green-600">${booking.cost}</p>
                        </div>
                      </div>
                    </div>
                    {booking.rating && (
                      <div className="ml-4 text-center">
                        <div className="flex items-center">
                          {[...Array(booking.rating)].map((_, i) => (
                            <span key={i} className="text-yellow-500">★</span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Your rating</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}