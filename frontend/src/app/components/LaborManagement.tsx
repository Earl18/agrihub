import { useEffect, useRef, useState } from 'react';
import { Calendar, Clock, MapPin, User, Plus, CheckCircle, XCircle, Mail, Phone, Navigation, ChevronDown } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { cancelLaborBooking, getLaborData, markLaborBookingOnTheWay, upsertLaborOffer } from '../../features/app/api';
import { SessionUser } from '../../shared/auth/session';
import { formatPhpCurrency, formatPhpRate } from '../../shared/format/currency';
import { addStoredNotification } from '../../shared/notifications/store';

interface LaborManagementProps {
  onBookWorker: (worker: any) => void;
  currentUser: SessionUser | null;
}

const emptyOfferForm = {
  workerType: '',
  description: '',
  rate: '',
  availability: 'Available',
  location: '',
  experience: '',
  phone: '',
  workingHoursStart: '',
  workingHoursEnd: '',
};

const laborWorkingHourOptions = [
  '05:00',
  '05:30',
  '06:00',
  '06:30',
  '07:00',
  '07:30',
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
  '22:00',
  '22:30',
  '23:00',
  '23:30',
  '24:00',
];

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || '';
const GOOGLE_MAPS_SCRIPT_ID = 'agrihub-google-maps-live-tracking';

function normalizeExperienceYears(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function formatExperienceYears(value: string) {
  const normalized = normalizeExperienceYears(value);
  return normalized ? `${normalized} years` : '';
}

function formatSingleClockTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

function formatTwentyFourHourTime(value: string) {
  const [hours, minutes] = String(value || '').split(':').map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatBookingTimeLabel(value: string) {
  const trimmedValue = String(value || '').trim();

  if (!trimmedValue) {
    return '';
  }

  if (/^\d{1,2}:\d{2}$/.test(trimmedValue)) {
    return formatSingleClockTime(trimmedValue);
  }

  return trimmedValue;
}

function formatWorkingHoursLabel(start: string, end: string) {
  if (!start || !end) {
    return '';
  }

  return `${formatSingleClockTime(start)} - ${formatSingleClockTime(end)}`;
}

function getTodayDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatStatusLabel(value: string) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return '';
  }

  return normalized
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildTrackingMapUrl(originLat?: number | null, originLng?: number | null, destination?: string) {
  const trimmedDestination = String(destination || '').trim();

  if (!Number.isFinite(originLat) || !Number.isFinite(originLng) || !trimmedDestination) {
    return '';
  }

  if (googleMapsApiKey) {
    return `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(
      googleMapsApiKey,
    )}&origin=${originLat},${originLng}&destination=${encodeURIComponent(trimmedDestination)}&mode=driving`;
  }

  return `https://maps.google.com/maps?saddr=${originLat},${originLng}&daddr=${encodeURIComponent(
    trimmedDestination,
  )}&z=13&output=embed`;
}

function createMarkerSvgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function loadGoogleMapsScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps is only available in the browser.'));
  }

  const existingGoogle = (window as any).google;

  if (existingGoogle?.maps?.Map && existingGoogle?.maps?.DirectionsService) {
    return Promise.resolve(existingGoogle);
  }

  if (!googleMapsApiKey) {
    return Promise.reject(new Error('Google Maps API key is not configured.'));
  }

  const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;

  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve((window as any).google), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Unable to load Google Maps.')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}`;
    script.onload = () => resolve((window as any).google);
    script.onerror = () => reject(new Error('Unable to load Google Maps.'));
    document.head.appendChild(script);
  });
}

function getCompleteProfileAddress(currentUser: SessionUser | null) {
  const savedAddress = String(currentUser?.profile?.address || '').trim();

  if (savedAddress) {
    return savedAddress;
  }

  return [
    currentUser?.profile?.streetAddress,
    currentUser?.profile?.city,
    currentUser?.profile?.state,
    currentUser?.profile?.postalCode,
    currentUser?.profile?.country,
    currentUser?.profile?.location,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(', ');
}

function buildOfferForm(laborOffer: any, currentUser: SessionUser | null) {
  const profileAddress = getCompleteProfileAddress(currentUser);

  return {
    workerType: laborOffer?.workerType || '',
    description: laborOffer?.description || '',
    rate: laborOffer?.rate ? String(laborOffer.rate) : '',
    availability: laborOffer?.availability || 'Available',
    location: profileAddress,
    experience: formatExperienceYears(currentUser?.profile?.experience || laborOffer?.experience || ''),
    phone: currentUser?.phone || laborOffer?.phone || '',
    workingHoursStart: laborOffer?.workingHoursStart || '',
    workingHoursEnd: laborOffer?.workingHoursEnd || '',
  };
}

export function LaborManagement({ onBookWorker, currentUser }: LaborManagementProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const getInitialLaborTab = (): 'book' | 'active' | 'history' | 'work' => {
    const requestedTab = searchParams.get('laborTab');
    return requestedTab === 'active' || requestedTab === 'history' || requestedTab === 'work' ? requestedTab : 'book';
  };
  const [activeTab, setActiveTab] = useState<'book' | 'active' | 'history' | 'work'>(getInitialLaborTab);
  const [availableWorkers, setAvailableWorkers] = useState<any[]>([]);
  const [viewerProvince, setViewerProvince] = useState('');
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [canOfferLabor, setCanOfferLabor] = useState(false);
  const [myLaborProfile, setMyLaborProfile] = useState<any>(null);
  const [myActiveJobs, setMyActiveJobs] = useState<any[]>([]);
  const [myJobHistory, setMyJobHistory] = useState<any[]>([]);
  const [offerForm, setOfferForm] = useState(emptyOfferForm);
  const [offerError, setOfferError] = useState('');
  const [offerSuccess, setOfferSuccess] = useState('');
  const [isSavingOffer, setIsSavingOffer] = useState(false);
  const [selectedOfferType, setSelectedOfferType] = useState('');
  const [isOfferFormOpen, setIsOfferFormOpen] = useState(false);
  const [openWorkHoursField, setOpenWorkHoursField] = useState<'start' | 'end' | null>(null);
  const [expandedContactBookingId, setExpandedContactBookingId] = useState('');
  const [detailModal, setDetailModal] = useState<{ kind: 'booking' | 'job'; data: any } | null>(null);
  const [trackingBookingId, setTrackingBookingId] = useState('');
  const [cancelingBookingId, setCancelingBookingId] = useState('');
  const [travelStatusMessage, setTravelStatusMessage] = useState('');
  const [travelStatusError, setTravelStatusError] = useState('');
  const [trackingMapError, setTrackingMapError] = useState('');
  const trackingMapRef = useRef<HTMLDivElement | null>(null);
  const workHoursPickerRef = useRef<HTMLDivElement | null>(null);

  const isLaborer = currentUser?.roles?.includes('laborer') || canOfferLabor;
  const isCommerciallyRestricted = currentUser?.canManageCommercialFeatures === false;
  const hasVerifiedBookingPhone =
    currentUser?.phoneVerification?.status === 'verified' && Boolean(String(currentUser?.phone || '').trim());
  const todayDateValue = getTodayDateValue();

  const listings = Array.isArray(myLaborProfile?.listings) ? myLaborProfile.listings : [];
  const verifiedSkills = Array.isArray(myLaborProfile?.verifiedSkills) ? myLaborProfile.verifiedSkills : [];
  const selectedListing = listings.find((listing: any) => listing.workerType === selectedOfferType) || null;
  const selectedListingExists = Boolean(selectedListing);

  const availableSkillOptions = verifiedSkills;

  const loadLaborData = () => {
    getLaborData()
        .then((payload) => {
          const laborProfile = payload.myLaborProfile || null;
          const nextListings = Array.isArray(laborProfile?.listings) ? laborProfile.listings : [];
          setAvailableWorkers(payload.availableWorkers || []);
          setViewerProvince(String(payload.viewerProvince || '').trim());
          setActiveBookings(payload.activeBookings || []);
        setBookingHistory(payload.bookingHistory || []);
        setCanOfferLabor(Boolean(payload.canOfferLabor));
        setMyLaborProfile(laborProfile);
        setMyActiveJobs(payload.myActiveJobs || []);
        setMyJobHistory(payload.myJobHistory || []);

        if (nextListings.length > 0) {
          setSelectedOfferType((current) =>
            current && nextListings.some((listing: any) => listing.workerType === current)
              ? current
              : nextListings[0].workerType,
          );
        } else {
          setSelectedOfferType((current) => current || '');
        }
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    loadLaborData();
  }, []);

  useEffect(() => {
    const requestedTab = searchParams.get('laborTab');
    const nextTab = requestedTab === 'active' || requestedTab === 'history' || requestedTab === 'work' ? requestedTab : 'book';

    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, searchParams]);

  useEffect(() => {
    const handleLaborBookingsUpdated = () => {
      loadLaborData();
    };

    window.addEventListener('agrihub:labor-bookings-updated', handleLaborBookingsUpdated);
    return () => window.removeEventListener('agrihub:labor-bookings-updated', handleLaborBookingsUpdated);
  }, []);

  useEffect(() => {
    if (!openWorkHoursField) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!workHoursPickerRef.current?.contains(event.target as Node)) {
        setOpenWorkHoursField(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openWorkHoursField]);

  useEffect(() => {
    if (selectedListing) {
      setOfferForm(buildOfferForm(selectedListing, currentUser));
      return;
    }

    if (selectedOfferType) {
      setOfferForm((current) => ({
        ...buildOfferForm(null, currentUser),
        workerType: selectedOfferType,
      }));
      return;
    }

    setOfferForm(buildOfferForm(null, currentUser));
  }, [selectedListing, selectedOfferType, currentUser]);

  useEffect(() => {
    const activeTrackingBooking =
      (detailModal?.kind === 'booking' || detailModal?.kind === 'job') &&
      detailModal.data?.date === todayDateValue &&
      detailModal.data?.travelTracking?.isOnTheWay
        ? detailModal.data
        : null;

    if (!activeTrackingBooking || !trackingMapRef.current) {
      setTrackingMapError('');
      return;
    }

    const originLat = activeTrackingBooking.travelTracking?.currentLocation?.lat;
    const originLng = activeTrackingBooking.travelTracking?.currentLocation?.lng;
    const destination = String(activeTrackingBooking.location || '').trim();

    if (!Number.isFinite(originLat) || !Number.isFinite(originLng) || !destination) {
      setTrackingMapError('Live route data is incomplete right now.');
      return;
    }

    let isCancelled = false;
    setTrackingMapError('');

    loadGoogleMapsScript()
      .then((google) => {
        if (isCancelled || !trackingMapRef.current) {
          return;
        }

        const map = new google.maps.Map(trackingMapRef.current, {
          center: { lat: originLat, lng: originLng },
          zoom: 13,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          clickableIcons: false,
        });

        const directionsRenderer = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          preserveViewport: false,
          polylineOptions: {
            strokeColor: '#16a34a',
            strokeOpacity: 0.95,
            strokeWeight: 6,
          },
        });

        const directionsService = new google.maps.DirectionsService();

        directionsService.route(
          {
            origin: { lat: originLat, lng: originLng },
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
            provideRouteAlternatives: false,
          },
          (result: any, status: any) => {
            if (isCancelled || !trackingMapRef.current) {
              return;
            }

            if (status !== 'OK' || !result?.routes?.length) {
              setTrackingMapError('Unable to draw the live route right now.');
              return;
            }

            directionsRenderer.setDirections(result);

            const leg = result.routes[0]?.legs?.[0];
            const workerMarker = new google.maps.Marker({
              map,
              position: { lat: originLat, lng: originLng },
              title: `${activeTrackingBooking.worker} current location`,
              icon: {
                url: createMarkerSvgDataUrl(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="20" fill="#16a34a" />
                    <path d="M27.6 13.8c-5.8.4-10.8 4.4-12 10-.7 3.2 0 6.2 1.8 8.7 2-1.8 4.5-3.1 7.3-3.6 5.7-1.2 9.5-5.9 10.2-11.7-2.1-2.1-4.7-3.4-7.3-3.4Zm-7.2 15.3c1.5-3.7 4.4-6.7 8-8.4-2.4 2.1-4.3 4.9-5.5 8.1-.8.1-1.7.2-2.5.3Z" fill="#ffffff"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(30, 30),
                anchor: new google.maps.Point(15, 15),
              },
            });

            const clientMarker = new google.maps.Marker({
              map,
              position: leg?.end_location,
              title: `${currentUser?.name || 'Client'} destination`,
              icon: {
                url: createMarkerSvgDataUrl(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="42" height="52" viewBox="0 0 42 52">
                    <path d="M21 2C11.1 2 3 10 3 19.9c0 12.7 14.7 27.2 17.1 29.5a1.3 1.3 0 0 0 1.8 0C24.3 47.1 39 32.6 39 19.9 39 10 30.9 2 21 2Z" fill="#0f766e"/>
                    <circle cx="21" cy="20" r="7.5" fill="#ffffff"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(28, 36),
                anchor: new google.maps.Point(14, 34),
              },
            });

            const bounds = new google.maps.LatLngBounds();
            bounds.extend(workerMarker.getPosition() as any);
            if (clientMarker.getPosition()) {
              bounds.extend(clientMarker.getPosition() as any);
            }
            map.fitBounds(bounds, 72);
          },
        );
      })
      .catch((error) => {
        if (!isCancelled) {
          setTrackingMapError(error instanceof Error ? error.message : 'Unable to load the live map.');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.name, detailModal, todayDateValue]);

  const updateOfferField = (field: keyof typeof emptyOfferForm, value: string) => {
    setOfferForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSelectOfferType = (value: string) => {
    setOfferError('');
    setOfferSuccess('');
    setSelectedOfferType(value);
    setIsOfferFormOpen(Boolean(value));
  };

  const handleSetActiveTab = (tab: 'book' | 'active' | 'history' | 'work') => {
    setActiveTab(tab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tab', 'labor');

      if (tab === 'book') {
        next.delete('laborTab');
      } else {
        next.set('laborTab', tab);
      }

      return next;
    });
  };

  const handleOpenCreateForm = () => {
    setOfferError('');
    setOfferSuccess('');
    setSelectedOfferType('');
    setOfferForm(buildOfferForm(null, currentUser));
    setIsOfferFormOpen(true);
  };

  const handleCloseOfferForm = () => {
    setOfferError('');
    setOfferSuccess('');
    setIsOfferFormOpen(false);
  };

  const handleToggleContactDetails = (bookingId: string) => {
    setExpandedContactBookingId((current) => (current === bookingId ? '' : bookingId));
  };

  const handleOpenBookingDetails = (booking: any) => {
    setDetailModal({ kind: 'booking', data: booking });
  };

  const handleOpenJobDetails = (job: any) => {
    setDetailModal({ kind: 'job', data: job });
  };

  const handleMarkOnTheWay = async (booking: any) => {
    if (!booking?.bookingId || trackingBookingId) {
      return;
    }

    setTravelStatusError('');
    setTravelStatusMessage('');
    setTrackingBookingId(booking.bookingId);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Location access is not available in this browser.'));
          return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      await markLaborBookingOnTheWay(booking.bookingId, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });

      setTravelStatusMessage(`Travel tracking is now live for ${booking.worker}.`);
      if (currentUser?.id) {
        addStoredNotification(currentUser.id, {
          sourceKey: `labor-tracking-live-${booking.bookingId}`,
          type: 'success',
          title: 'Travel tracking is live',
          message: `Your live route to the client is now visible for the ${booking.date} booking.`,
        });
      }
      loadLaborData();
      window.dispatchEvent(new Event('agrihub:labor-bookings-updated'));
    } catch (error) {
      setTravelStatusError(
        error instanceof Error ? error.message : 'Unable to start travel tracking right now.',
      );
    } finally {
      setTrackingBookingId('');
    }
  };

  const handleCancelBooking = async (booking: any) => {
    const bookingId = String(booking?.bookingId || '').trim();

    if (!bookingId || cancelingBookingId) {
      return;
    }

    setTravelStatusError('');
    setTravelStatusMessage('');
    setCancelingBookingId(bookingId);

    try {
      const response = await cancelLaborBooking(bookingId);
      setExpandedContactBookingId((current) => (current === booking.id ? '' : current));
      setDetailModal((current) =>
        current?.data?.bookingId === bookingId ? null : current,
      );
      setTravelStatusMessage(response.message || 'Labor booking cancelled successfully.');
      if (currentUser?.id) {
        addStoredNotification(currentUser.id, {
          sourceKey: `labor-booking-cancelled-${bookingId}`,
          type: 'warning',
          title: 'Labor booking cancelled',
          message: `${booking.worker} booking on ${booking.date} has been cancelled.`,
        });
      }
      loadLaborData();
      window.dispatchEvent(new Event('agrihub:labor-bookings-updated'));
    } catch (error) {
      setTravelStatusError(
        error instanceof Error ? error.message : 'Unable to cancel this labor booking right now.',
      );
    } finally {
      setCancelingBookingId('');
    }
  };

  const handleSaveOffer = async (event: React.FormEvent) => {
    event.preventDefault();
    setOfferError('');
    setOfferSuccess('');
    setIsSavingOffer(true);

    try {
      const payload = {
        title: '',
        workerType: selectedOfferType.trim(),
        description: offerForm.description.trim(),
        rate: Number(offerForm.rate),
        availability: offerForm.availability.trim(),
        skills: verifiedSkills,
        location: offerForm.location.trim(),
        experience: normalizeExperienceYears(String(currentUser?.profile?.experience || offerForm.experience || '')),
        phone: String(currentUser?.phone || offerForm.phone || '').trim(),
        workingHoursStart: offerForm.workingHoursStart,
        workingHoursEnd: offerForm.workingHoursEnd,
      };

      const response = await upsertLaborOffer(payload);
      setMyLaborProfile(response.laborOffer || null);
      setOfferSuccess(
        selectedListingExists
          ? `${selectedOfferType} labor listing updated successfully.`
          : `${selectedOfferType} labor listing created successfully.`,
      );
      loadLaborData();
      setIsOfferFormOpen(false);
    } catch (error) {
      setOfferError(error instanceof Error ? error.message : 'Unable to save your labor listing right now.');
    } finally {
      setIsSavingOffer(false);
    }
  };

  const handleSelectWorkingHour = (field: 'workingHoursStart' | 'workingHoursEnd', value: string) => {
    updateOfferField(field, value);
    setOpenWorkHoursField(null);
  };

  return (
    <div className="space-y-6">
      {isCommerciallyRestricted && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Your account is currently restricted. Labor bookings and laborer access are limited until an admin clears the penalty.
        </div>
      )}
        {currentUser && !isCommerciallyRestricted && !hasVerifiedBookingPhone && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            Verify your phone number in your profile first before booking a laborer.
          </div>
        )}

      <div className="bg-white rounded-lg shadow p-2 flex space-x-2">
        <button
          onClick={() => handleSetActiveTab('book')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'book' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Book Workers
        </button>
        <button
          onClick={() => handleSetActiveTab('active')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'active' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Active Bookings ({activeBookings.length})
        </button>
        <button
          onClick={() => handleSetActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'history' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          History
        </button>
        {isLaborer && (
          <button
            onClick={() => handleSetActiveTab('work')}
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {availableWorkers.map((worker) => (
              <div
                key={worker.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-green-500"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                      <User className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{worker.name}</h3>
                      <p className="text-sm text-gray-600">{worker.title || worker.type}</p>
                      <div className="mt-1 flex items-center">
                        <span className="text-yellow-500">*</span>
                        <span className="ml-1 text-sm">{worker.rating}</span>
                        <span className="ml-2 text-sm text-gray-500">- {formatExperienceYears(worker.experience)}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    worker.availability === 'Available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {worker.availability}
                  </span>
                </div>

                <div className="mb-4 space-y-3">
                  <p className="text-sm text-gray-600">{worker.description}</p>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>{worker.location}</span>
                  </div>
                  {worker.workingHoursLabel ? (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="mr-2 h-4 w-4" />
                      <span>Working hours: {worker.workingHoursLabel}</span>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {worker.skills.map((skill: string, index: number) => (
                      <span key={index} className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <div>
                      <p className="text-2xl font-bold text-green-600">{formatPhpCurrency(worker.rate)}</p>
                    <p className="text-xs text-gray-500">per hour</p>
                  </div>
                    <button
                      onClick={() => onBookWorker(worker)}
                      className={`rounded-lg px-6 py-2 transition-colors ${
                        worker.availability === 'Available' && (!currentUser || hasVerifiedBookingPhone)
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      disabled={
                        worker.availability !== 'Available'
                        || isCommerciallyRestricted
                        || Boolean(currentUser && !hasVerifiedBookingPhone)
                      }
                    >
                      Book Now
                    </button>
                </div>
              </div>
            ))}
              {availableWorkers.length === 0 && (
                  <div className="lg:col-span-2 rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                    {!currentUser
                      ? 'No labor offers are available to book right now.'
                      : viewerProvince
                      ? `No labor offers are available to book in ${viewerProvince} right now. Only laborers from your province are shown here.`
                      : 'No labor offers are available to book right now. Add your province in Profile so we can show laborers from the same area.'}
                  </div>
                )}
          </div>
        </>
      )}

      {activeTab === 'active' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-6">Active Labor Bookings</h3>
            {travelStatusError ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {travelStatusError}
              </div>
            ) : null}
            {travelStatusMessage ? (
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {travelStatusMessage}
              </div>
            ) : null}
            <div className="space-y-4">
              {activeBookings.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                  Your confirmed labor bookings will appear here once you book a worker from this account.
                </div>
              )}
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
                          {formatStatusLabel(booking.status)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>{booking.date}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>{formatBookingTimeLabel(booking.time)} ({booking.duration})</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span>{booking.location}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <span className="font-semibold text-green-600">{formatPhpRate(booking.rate, 'hour', { shortHour: true })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenBookingDetails(booking)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleContactDetails(booking.id)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Contact
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelBooking(booking)}
                        disabled={cancelingBookingId === booking.bookingId}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cancelingBookingId === booking.bookingId ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                  {expandedContactBookingId === booking.id ? (
                    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <h5 className="text-sm font-semibold text-gray-900">Laborer contact details</h5>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3">
                          <Mail className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Email</p>
                            <p className="text-sm font-medium text-gray-900">{booking.workerEmail || 'No email available'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3">
                          <Phone className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Phone</p>
                            <p className="text-sm font-medium text-gray-900">{booking.workerPhone || 'No phone available'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {booking.date === todayDateValue && booking.travelTracking?.isOnTheWay ? (
                    <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-green-900">Worker is on the way</p>
                          <p className="text-xs text-green-700">
                            Last updated {booking.travelTracking?.updatedAt
                              ? new Date(booking.travelTracking.updatedAt).toLocaleTimeString([], {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'just now'}
                          </p>
                          <p className="mt-1 text-xs text-green-700">
                            Open View Details to track {booking.worker} on the route to your location.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenBookingDetails(booking)}
                          className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-green-700 shadow-sm hover:bg-green-100"
                        >
                          <Navigation className="h-4 w-4" />
                          Open Tracking
                        </button>
                      </div>
                    </div>
                  ) : null}
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
              {bookingHistory.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                  Completed and cancelled labor bookings from this account will appear here.
                </div>
              )}
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
                        ) : booking.status === 'cancelled' ? (
                          <XCircle className="w-5 h-5 text-amber-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          booking.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : booking.status === 'cancelled'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {formatStatusLabel(booking.status)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-5">
                        <div>
                          <p className="text-gray-500">Date</p>
                          <p className="font-medium">{booking.date}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Time</p>
                          <p className="font-medium">{formatBookingTimeLabel(booking.time)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Duration</p>
                          <p className="font-medium">{booking.duration}</p>
                        </div>
                        <div className="xl:col-span-2">
                          <p className="text-gray-500">Location</p>
                          <p className="font-medium">{booking.location}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Cost</p>
                          <p className="font-medium text-green-600">{formatPhpCurrency(booking.cost)}</p>
                        </div>
                      </div>
                    </div>
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
              You can create one listing per verified labor category. The same category can exist on other accounts, but this account cannot create duplicates of the same labor type.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Selected Labor</p>
                <p className="mt-1 font-semibold text-gray-900">{selectedOfferType || 'Not selected'}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Verified Skills</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {verifiedSkills.length ? verifiedSkills.join(', ') : 'No verified skills found'}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Created Listings</p>
                <p className="mt-1 font-semibold text-gray-900">{listings.length}</p>
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
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold">My Existing Labor Listings</h3>
              <button
                type="button"
                onClick={handleOpenCreateForm}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
                <span>Create labor listing</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {listings.map((listing: any) => (
                <button
                  key={listing.workerType}
                  type="button"
                  onClick={() => handleSelectOfferType(listing.workerType)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    selectedOfferType === listing.workerType
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <p className="font-semibold text-gray-900">{listing.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{listing.description}</p>
                  <p className="mt-3 text-sm font-medium text-green-700">{formatPhpRate(listing.rate, 'hour', { shortHour: true })}</p>
                  {listing.workingHoursStart && listing.workingHoursEnd ? (
                    <p className="mt-2 text-xs text-gray-500">
                      Hours: {formatWorkingHoursLabel(listing.workingHoursStart, listing.workingHoursEnd)}
                    </p>
                  ) : null}
                </button>
              ))}
              {listings.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                  No labor listings created yet.
                </div>
              )}
            </div>
          </div>

          {isOfferFormOpen && (
            <form onSubmit={handleSaveOffer} className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedListingExists ? 'Edit Labor Listing' : 'Create Labor Listing'}</h3>
                  <p className="text-sm text-gray-500">
                    Choose a verified skill to create or edit that labor category.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    selectedListingExists ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedListingExists ? 'Existing category' : 'New category'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCloseOfferForm}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>

              {offerError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {offerError}
                </div>
              )}
              {offerSuccess && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {offerSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Labor type</label>
                  <select
                    value={selectedOfferType}
                    onChange={(event) => handleSelectOfferType(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Choose a verified skill</option>
                    {availableSkillOptions.map((skill: string) => (
                      <option key={skill} value={skill}>
                        {skill}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    You can only have one listing per labor type on this account.
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Hourly rate</label>
                  <input
                    type="number"
                    min="1"
                    value={offerForm.rate}
                    onChange={(event) => updateOfferField('rate', event.target.value)}
                    placeholder="Example: 25"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Availability</label>
                  <select
                    value={offerForm.availability}
                    onChange={(event) => updateOfferField('availability', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Available">Available</option>
                    <option value="Busy">Busy</option>
                    <option value="On Call">On Call</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Address</label>
                  <input
                    type="text"
                    value={offerForm.location}
                    readOnly
                    placeholder="Fetched from your profile address"
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-600 focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-gray-500">This address is pulled from your profile information and can only be updated from the Profile page.</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Contact number</label>
                  <input
                    type="text"
                    value={offerForm.phone}
                    readOnly
                    placeholder="No phone number on profile"
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-700 focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-gray-500">This number is pulled from your profile and can only be updated from the Profile page.</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Work starts</label>
                  <div className="relative" ref={openWorkHoursField === 'start' ? workHoursPickerRef : undefined}>
                    <button
                      type="button"
                      onClick={() => setOpenWorkHoursField((current) => (current === 'start' ? null : 'start'))}
                      className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-4 py-2 text-left transition-colors hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <span className={offerForm.workingHoursStart ? 'text-gray-900' : 'text-gray-400'}>
                        {offerForm.workingHoursStart ? formatSingleClockTime(offerForm.workingHoursStart) : 'Select start time'}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-gray-500 transition-transform ${
                          openWorkHoursField === 'start' ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openWorkHoursField === 'start' ? (
                      <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-green-100 bg-white shadow-xl">
                        <div className="border-b border-green-100 bg-green-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-green-700">Choose start time</p>
                          <p className="mt-1 text-xs text-green-700">Pick the earliest time you accept bookings.</p>
                        </div>
                        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto p-3">
                          {laborWorkingHourOptions.map((timeOption) => (
                            <button
                              key={`start-${timeOption}`}
                              type="button"
                              onClick={() => handleSelectWorkingHour('workingHoursStart', timeOption)}
                              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                                offerForm.workingHoursStart === timeOption
                                  ? 'bg-green-600 text-white shadow-sm'
                                  : 'bg-green-50 text-green-800 hover:bg-green-100'
                              }`}
                            >
                              {formatSingleClockTime(timeOption)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Work ends</label>
                  <div className="relative" ref={openWorkHoursField === 'end' ? workHoursPickerRef : undefined}>
                    <button
                      type="button"
                      onClick={() => setOpenWorkHoursField((current) => (current === 'end' ? null : 'end'))}
                      className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-4 py-2 text-left transition-colors hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <span className={offerForm.workingHoursEnd ? 'text-gray-900' : 'text-gray-400'}>
                        {offerForm.workingHoursEnd ? formatSingleClockTime(offerForm.workingHoursEnd) : 'Select end time'}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-gray-500 transition-transform ${
                          openWorkHoursField === 'end' ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openWorkHoursField === 'end' ? (
                      <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-green-100 bg-white shadow-xl">
                        <div className="border-b border-green-100 bg-green-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-green-700">Choose end time</p>
                          <p className="mt-1 text-xs text-green-700">Set the latest hour a client can still hire you.</p>
                        </div>
                        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto p-3">
                          {laborWorkingHourOptions.map((timeOption) => (
                            <button
                              key={`end-${timeOption}`}
                              type="button"
                              onClick={() => handleSelectWorkingHour('workingHoursEnd', timeOption)}
                              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                                offerForm.workingHoursEnd === timeOption
                                  ? 'bg-green-600 text-white shadow-sm'
                                  : 'bg-green-50 text-green-800 hover:bg-green-100'
                              }`}
                            >
                              {formatSingleClockTime(timeOption)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Customers can only book you within this daily time span.</p>
                </div>
              </div>

              {offerForm.workingHoursStart && offerForm.workingHoursEnd ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  Working hours: {formatWorkingHoursLabel(offerForm.workingHoursStart, offerForm.workingHoursEnd)}
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Listing skills</label>
                <div className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {verifiedSkills.length > 0 ? (
                      verifiedSkills.map((skill: string) => (
                        <span key={skill} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No verified skills found</span>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">These skills come from the laborer KYC verification.</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Experience</label>
                <input
                  type="text"
                  value={offerForm.experience}
                  readOnly
                  placeholder="No experience on profile"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-700 focus:outline-none"
                />
                <p className="mt-2 text-xs text-gray-500">This experience is pulled from your profile and shown in a standard years format.</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={offerForm.description}
                  onChange={(event) => updateOfferField('description', event.target.value)}
                  placeholder="Describe your labor service, schedule, tools, and what customers can expect."
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingOffer || !selectedOfferType}
                  className="rounded-lg bg-green-600 px-5 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
                >
                  {isSavingOffer ? 'Saving...' : selectedListingExists ? 'Update labor listing' : 'Create labor listing'}
                </button>
              </div>
            </form>
          )}

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
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">{job.worker}</p>
                      <p className="text-sm text-gray-500">{job.date} at {formatBookingTimeLabel(job.time)}</p>
                      <p className="mt-1 text-sm text-gray-500">{job.location}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleOpenJobDetails(job)}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        View Details
                      </button>
                      {job.date === todayDateValue && job.status !== 'on_the_way' ? (
                        <button
                          type="button"
                          onClick={() => handleMarkOnTheWay(job)}
                          disabled={trackingBookingId === job.bookingId}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
                        >
                          {trackingBookingId === job.bookingId ? 'Starting...' : 'I am on the way'}
                        </button>
                      ) : null}
                      <span className={`text-sm font-medium ${job.status === 'on_the_way' ? 'text-green-700' : 'text-green-600'}`}>
                        {formatStatusLabel(job.status)}
                      </span>
                    </div>
                  </div>
                  {job.date === todayDateValue && job.status === 'on_the_way' ? (
                    <p className="mt-3 text-sm text-green-700">
                      Your client can now view your live travel location for today&apos;s booking.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">My Job History</h3>
            <div className="space-y-4">
              {myJobHistory.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                  Completed and cancelled client bookings assigned to you will appear here.
                </div>
              )}
              {myJobHistory.map((job, index) => (
                <div key={`${job.bookingId || job.worker}-${index}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-3 flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{job.worker}</h4>
                          <p className="text-sm text-gray-600">{job.type || 'Labor booking'}</p>
                        </div>
                        {job.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : job.status === 'cancelled' ? (
                          <XCircle className="w-5 h-5 text-amber-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          job.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : job.status === 'cancelled'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {formatStatusLabel(job.status)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-gray-500">Date</p>
                          <p className="font-medium">{job.date}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Time</p>
                          <p className="font-medium">{formatBookingTimeLabel(job.time)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Duration</p>
                          <p className="font-medium">{job.duration}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Location</p>
                          <p className="font-medium">{job.location}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {detailModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6">
          <button
            type="button"
            aria-label="Close booking details"
            className="absolute inset-0 cursor-default"
            onClick={() => setDetailModal(null)}
          />
          <div className="relative z-10 flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="rounded-t-3xl bg-gradient-to-r from-green-600 to-green-500 px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-green-100">
                    {detailModal.kind === 'booking' ? 'Booked worker details' : 'Job assignment details'}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold">
                    {detailModal.kind === 'booking' ? detailModal.data.worker : detailModal.data.worker}
                  </h3>
                  <p className="mt-1 text-sm text-green-50">
                    {detailModal.kind === 'booking' ? detailModal.data.type : detailModal.data.type || 'Labor booking'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailModal(null)}
                  className="rounded-xl border border-white/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="space-y-6 overflow-y-auto px-6 py-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    {detailModal.kind === 'booking' ? 'Laborer' : 'Client'}
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{detailModal.data.worker}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Status</p>
                  <p className="mt-1 text-sm font-medium capitalize text-gray-900">
                    {formatStatusLabel(detailModal.data.status)}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Labor type</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {detailModal.data.type || 'Labor booking'}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Date</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{detailModal.data.date}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Time</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {formatBookingTimeLabel(detailModal.data.time)}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Duration</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{detailModal.data.duration}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Hourly rate</p>
                  <p className="mt-1 text-sm font-medium text-green-700">{formatPhpRate(detailModal.data.rate, 'hour', { shortHour: true })}</p>
                </div>
                {detailModal.kind === 'booking' && detailModal.data.cost ? (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Estimated cost</p>
                    <p className="mt-1 text-sm font-medium text-green-700">{formatPhpCurrency(detailModal.data.cost)}</p>
                  </div>
                ) : null}
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2 xl:col-span-1">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Work location</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{detailModal.data.location}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-green-100 bg-green-50/70 p-5">
                <h4 className="text-sm font-semibold text-gray-900">
                  {detailModal.kind === 'booking' ? 'Laborer contact details' : 'Client contact details'}
                </h4>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                    <Mail className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Email</p>
                      <p className="text-sm font-medium text-gray-900">
                        {detailModal.kind === 'booking'
                          ? detailModal.data.workerEmail || 'No email available'
                          : detailModal.data.bookedByEmail || 'No email available'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                    <Phone className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Phone</p>
                      <p className="text-sm font-medium text-gray-900">
                        {detailModal.kind === 'booking'
                          ? detailModal.data.workerPhone || 'No phone available'
                          : detailModal.data.bookedByPhone || 'No phone available'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {(detailModal.kind === 'booking' || detailModal.kind === 'job') &&
              detailModal.data.date === todayDateValue &&
              detailModal.data.travelTracking?.isOnTheWay ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Live travel tracking</h4>
                      <p className="mt-1 text-xs text-green-700">
                        {detailModal.kind === 'booking'
                          ? `${detailModal.data.worker} is on the way to your location.`
                          : `You are on the way to ${detailModal.data.worker}.`}
                      </p>
                      <p className="mt-1 text-xs text-green-700">
                        Last updated {detailModal.data.travelTracking?.updatedAt
                          ? new Date(detailModal.data.travelTracking.updatedAt).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : 'just now'}
                      </p>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${detailModal.data.travelTracking?.currentLocation?.lat},${detailModal.data.travelTracking?.currentLocation?.lng}&destination=${encodeURIComponent(detailModal.data.location || '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-green-700 shadow-sm hover:bg-green-100"
                    >
                      <Navigation className="h-4 w-4" />
                      Open Directions
                    </a>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-green-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-green-600">
                        {detailModal.kind === 'booking' ? 'Booked worker' : 'You'}
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {detailModal.kind === 'booking'
                          ? `${detailModal.data.worker} current live location`
                          : 'Your live location from this device'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-emerald-600">
                        {detailModal.kind === 'booking' ? 'You' : 'Client destination'}
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {detailModal.kind === 'booking'
                          ? detailModal.data.location
                          : detailModal.data.location}
                      </p>
                    </div>
                  </div>
                  {googleMapsApiKey ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-green-100">
                      <div
                        ref={trackingMapRef}
                        className="h-80 w-full bg-green-50"
                        aria-label={`Live route map for ${detailModal.data.worker}`}
                      />
                    </div>
                  ) : buildTrackingMapUrl(
                      detailModal.data.travelTracking?.currentLocation?.lat,
                      detailModal.data.travelTracking?.currentLocation?.lng,
                      detailModal.data.location,
                    ) ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-green-100">
                      <iframe
                        title={`Tracking map for ${detailModal.data.worker}`}
                        src={buildTrackingMapUrl(
                          detailModal.data.travelTracking?.currentLocation?.lat,
                          detailModal.data.travelTracking?.currentLocation?.lng,
                          detailModal.data.location,
                        )}
                        className="h-80 w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  ) : null}
                  {trackingMapError ? (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {trackingMapError}
                    </div>
                  ) : null}
                </div>
              ) : detailModal.kind === 'job' && detailModal.data.date === todayDateValue ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <h4 className="text-sm font-semibold text-gray-900">Client navigation</h4>
                  <p className="mt-2 text-sm text-amber-800">
                    Tap <span className="font-semibold">I am on the way</span> on your job card to start live navigation to the client and open the real-time route map here.
                  </p>
                </div>
              ) : null}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetailModal(null)}
                  className="rounded-2xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
