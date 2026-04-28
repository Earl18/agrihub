import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, User, Plus, CheckCircle, XCircle } from 'lucide-react';
import { getLaborData } from '../../features/app/api';
import { SessionUser } from '../../shared/auth/session';

interface LaborManagementProps {
  onBookWorker: (worker: any) => void;
  currentUser: SessionUser | null;
}

export function LaborManagement({ onBookWorker, currentUser }: LaborManagementProps) {
  const [activeTab, setActiveTab] = useState<'book' | 'active' | 'history' | 'work'>('book');
  const [availableWorkers, setAvailableWorkers] = useState<any[]>([]);
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [canOfferLabor, setCanOfferLabor] = useState(false);
  const [myLaborProfile, setMyLaborProfile] = useState<any>(null);
  const [myActiveJobs, setMyActiveJobs] = useState<any[]>([]);
  const [myJobHistory, setMyJobHistory] = useState<any[]>([]);

  const isLaborer = currentUser?.roles?.includes('laborer') || canOfferLabor;
  const isCommerciallyRestricted = currentUser?.canManageCommercialFeatures === false;

  const loadLaborData = () => {
    getLaborData()
      .then((payload) => {
        setAvailableWorkers(payload.availableWorkers || []);
        setActiveBookings(payload.activeBookings || []);
        setBookingHistory(payload.bookingHistory || []);
        setCanOfferLabor(Boolean(payload.canOfferLabor));
        setMyLaborProfile(payload.myLaborProfile || null);
        setMyActiveJobs(payload.myActiveJobs || []);
        setMyJobHistory(payload.myJobHistory || []);
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    loadLaborData();
  }, []);

  useEffect(() => {
    const handleLaborBookingsUpdated = () => {
      loadLaborData();
    };

    window.addEventListener('agrihub:labor-bookings-updated', handleLaborBookingsUpdated);
    return () => window.removeEventListener('agrihub:labor-bookings-updated', handleLaborBookingsUpdated);
  }, []);

  const displayWorkers = availableWorkers;
  const displayActiveBookings = activeBookings;
  const displayBookingHistory = bookingHistory;

  return (
    <div className="space-y-6">
      {isCommerciallyRestricted && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Your account is currently restricted. Labor bookings and laborer access are limited until an admin clears the penalty.
        </div>
      )}
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
          Active Bookings ({displayActiveBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'history' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          History
        </button>
        {isLaborer && (
          <button
            onClick={() => setActiveTab('work')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === 'work' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            My Labor Dashboard
          </button>
        )}
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
            {displayWorkers.map((worker) => (
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
                    disabled={worker.availability !== 'Available' || isCommerciallyRestricted}
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
              {displayActiveBookings.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                  Your confirmed labor bookings will appear here once you book a worker from this account.
                </div>
              )}
              {displayActiveBookings.map((booking) => (
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
              {displayBookingHistory.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                  Only completed or past labor bookings from this account will appear here.
                </div>
              )}
              {displayBookingHistory.map((booking) => (
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

      {activeTab === 'work' && isLaborer && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">My Laborer Profile</h3>
            <p className="text-sm text-gray-500 mb-4">
              Role details buyers use when reviewing your labor profile and deciding whether to book you.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Primary Role</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {myLaborProfile?.workerType || currentUser?.profile?.specialization || 'Laborer'}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Experience</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {currentUser?.profile?.experience || 'Add your work experience in Profile'}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Coverage Area</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {currentUser?.profile?.location || myLaborProfile?.distance || 'Set your work location in Profile'}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Verification</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {currentUser?.verification?.laborer === 'verified'
                    ? 'Verified laborer'
                    : currentUser?.verification?.laborer === 'pending'
                      ? 'Pending review'
                      : 'Not verified'}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {(myLaborProfile?.skills || []).map((skill: string, index: number) => (
                <span key={index} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">My Active Job Assignments</h3>
            <div className="space-y-4">
              {myActiveJobs.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                  Laborer verification is active. Your upcoming job assignments will appear here.
                </div>
              )}
              {myActiveJobs.map((job, index) => (
                <div key={`${job.worker}-${index}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{job.worker}</p>
                      <p className="text-sm text-gray-500">{job.date} at {job.time}</p>
                    </div>
                    <span className="text-sm font-medium text-green-600">{job.status}</span>
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

