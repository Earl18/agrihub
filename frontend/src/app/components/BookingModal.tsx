import { useEffect, useRef, useState } from 'react';
import { X, Calendar, Clock, ChevronDown, MapPin, User } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { formatPhpRate } from '../../shared/format/currency';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'labor' | 'service';
  item: any;
  onConfirm: (bookingData: any) => void;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || '';
const GOOGLE_MAPS_SCRIPT_ID = 'agrihub-google-maps-places';

const emptyBookingForm = {
  date: '',
  time: '',
  duration: '',
  location: '',
  notes: '',
};

const emptyCustomTimeParts = {
  hour: '',
  minute: '',
  period: '',
};

const bookingTimeOptions = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
  '24:00',
];

function normalizeClockTime(value: string) {
  const normalized = String(value || '').trim();
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : '';
}

function convertClockTimeToMinutes(value: string) {
  const normalized = normalizeClockTime(value);

  if (!normalized) {
    return null;
  }

  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
}

function isTimeWithinRange(value: string, start: string, end: string) {
  const targetMinutes = convertClockTimeToMinutes(value);
  const startMinutes = convertClockTimeToMinutes(start);
  const endMinutes = convertClockTimeToMinutes(end);

  if (targetMinutes === null || startMinutes === null || endMinutes === null) {
    return false;
  }

  return targetMinutes >= startMinutes && targetMinutes <= endMinutes;
}

function getCustomTimeParts(value: string) {
  const normalized = normalizeClockTime(value);

  if (!normalized) {
    return {
      hour: '',
      minute: '',
      period: '',
    };
  }

  const [hours, minutes] = normalized.split(':').map(Number);
  return {
    hour: String(hours % 12 || 12).padStart(2, '0'),
    minute: String(minutes).padStart(2, '0'),
    period: hours >= 12 ? 'PM' : 'AM',
  };
}

function buildCustomTimeValue(hour: string, minute: string, period: string) {
  if (!hour || !minute || !period) {
    return '';
  }

  const parsedHour = Number(hour);
  const parsedMinute = Number(minute);

  if (!Number.isInteger(parsedHour) || parsedHour < 1 || parsedHour > 12) {
    return '';
  }

  if (!Number.isInteger(parsedMinute) || parsedMinute < 0 || parsedMinute > 59) {
    return '';
  }

  const isPm = period === 'PM';
  const normalizedHour = parsedHour % 12 + (isPm ? 12 : 0);

  return `${String(normalizedHour).padStart(2, '0')}:${String(parsedMinute).padStart(2, '0')}`;
}

function createCustomTimeDisplayKey(hour: string, minute: string, period: string) {
  return `${hour}-${minute}-${period}`;
}

function getCustomTimePartsFromMinutes(totalMinutes: number) {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
    return null;
  }

  if (totalMinutes === 1440) {
    return {
      hour: '12',
      minute: '00',
      period: 'AM',
      value: '24:00',
    };
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return {
    hour: String(hours % 12 || 12).padStart(2, '0'),
    minute: String(minutes).padStart(2, '0'),
    period: hours >= 12 ? 'PM' : 'AM',
    value: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
  };
}

function formatDurationLabel(hours: number) {
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

function getDurationHours(value: string) {
  const match = String(value || '').trim().match(/^(\d+)\s*hour/i);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getLocalDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayAtLocalMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getCurrentLocalTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function parseDateInputValue(value: string) {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function formatCalendarButtonLabel(value: string) {
  const date = parseDateInputValue(value);

  if (!date) {
    return 'Select booking date';
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatBookingTimeLabel(value: string) {
  if (!value) {
    return 'Select booking time';
  }

  const [hours, minutes] = value.split(':').map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  if (hours === 24 && minutes === 0) {
    return '12:00 AM';
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

function hasBookedTimeConflict(
  bookedSlots: any[],
  date: string,
  requestedStartMinutes: number,
  requestedDurationHours: number,
) {
  const normalizedDate = String(date || '').trim();
  const requestedEndMinutes = requestedStartMinutes + requestedDurationHours * 60;

  return bookedSlots.some((slot) => {
    if (!slot || String(slot.date || '').trim() !== normalizedDate) {
      return false;
    }

    if (String(slot.status || '').trim().toLowerCase() === 'cancelled') {
      return false;
    }

    const existingStartMinutes = convertClockTimeToMinutes(String(slot.time || '').trim());
    const existingDurationHours = getDurationHours(String(slot.duration || '').trim());

    if (existingStartMinutes === null || existingDurationHours === null) {
      return false;
    }

    const existingEndMinutes = existingStartMinutes + existingDurationHours * 60;
    return requestedStartMinutes <= existingEndMinutes && existingStartMinutes <= requestedEndMinutes;
  });
}

function formatPlaceLocation(
  place: { name?: string; formatted_address?: string } | null | undefined,
  typedQuery?: string,
) {
  const placeName = String(place?.name || '').trim();
  const formattedAddress = String(place?.formatted_address || '').trim();
  const preservedQuery = String(typedQuery || '').trim();

  if (!placeName && !formattedAddress) {
    return preservedQuery;
  }

  if (!placeName) {
    return formattedAddress;
  }

  if (!formattedAddress) {
    return placeName;
  }

  const normalizedName = placeName.toLowerCase();
  const normalizedAddress = formattedAddress.toLowerCase();
  const normalizedQuery = preservedQuery.toLowerCase();

  if (
    preservedQuery &&
    !normalizedName.includes(normalizedQuery) &&
    !normalizedAddress.includes(normalizedQuery)
  ) {
    return `${preservedQuery}, ${formattedAddress}`;
  }

  if (normalizedAddress.includes(normalizedName)) {
    return formattedAddress;
  }

  return `${placeName}, ${formattedAddress}`;
}

function getPlaceDetails(googleApi: any, placeId: string) {
  return new Promise<{ name?: string; formatted_address?: string } | null>((resolve) => {
    if (!googleApi?.maps?.places?.PlacesService || !placeId) {
      resolve(null);
      return;
    }

    const service = new googleApi.maps.places.PlacesService(document.createElement('div'));
    service.getDetails(
      {
        placeId,
        fields: ['name', 'formatted_address'],
      },
      (result: any, status: any) => {
        if (status === googleApi.maps.places.PlacesServiceStatus.OK && result) {
          resolve(result);
          return;
        }

        resolve(null);
      },
    );
  });
}

function loadGoogleMapsPlacesScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps is only available in the browser.'));
  }

  const existingGoogle = (window as any).google;

  if (existingGoogle?.maps?.places?.Autocomplete) {
    return Promise.resolve(existingGoogle);
  }

  if (!GOOGLE_MAPS_API_KEY) {
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places`;
    script.onload = () => resolve((window as any).google);
    script.onerror = () => reject(new Error('Unable to load Google Maps.'));
    document.head.appendChild(script);
  });
}

export function BookingModal({ isOpen, onClose, type, item, onConfirm }: BookingModalProps) {
  const isLaborBooking = type === 'labor';
  const today = getLocalDateInputValue();
  const todayDate = getTodayAtLocalMidnight();
  const workingHoursStart = normalizeClockTime(item?.workingHoursStart || '');
  const workingHoursEnd = normalizeClockTime(item?.workingHoursEnd || '');
  const workingHoursStartMinutes = convertClockTimeToMinutes(workingHoursStart);
  const workingHoursEndMinutes = convertClockTimeToMinutes(workingHoursEnd);
  const bookedSlots = Array.isArray(item?.bookedSlots) ? item.bookedSlots : [];
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteInstanceRef = useRef<any>(null);
  const latestLocationQueryRef = useRef('');
  const [formData, setFormData] = useState(emptyBookingForm);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(todayDate);
  const [locationMode, setLocationMode] = useState<'loading' | 'ready' | 'fallback'>(
    isLaborBooking ? 'loading' : 'fallback',
  );
  const [customTimeParts, setCustomTimeParts] = useState(emptyCustomTimeParts);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const currentLocalTimeMinutes = getCurrentLocalTimeMinutes();
  const isSelectedDateToday = formData.date === today;
  const canBookStartAtTime = (startMinutes: number) => {
    if (
      !isLaborBooking
      || workingHoursEndMinutes === null
      || !formData.date
      || startMinutes >= workingHoursEndMinutes
    ) {
      return false;
    }

    const maxDurationHours = Math.floor((workingHoursEndMinutes - startMinutes) / 60);

    if (maxDurationHours <= 0) {
      return false;
    }

    return Array.from({ length: maxDurationHours }, (_, index) => index + 1).some(
      (durationHours) => !hasBookedTimeConflict(bookedSlots, formData.date, startMinutes, durationHours),
    );
  };
  const availableTimeOptions = isLaborBooking && workingHoursStart && workingHoursEnd
    ? bookingTimeOptions.filter((timeOption) => {
        const optionMinutes = convertClockTimeToMinutes(timeOption);

        return (
          optionMinutes !== null &&
          workingHoursStartMinutes !== null &&
          workingHoursEndMinutes !== null &&
          optionMinutes >= workingHoursStartMinutes &&
          optionMinutes <= workingHoursEndMinutes &&
          (!isSelectedDateToday || optionMinutes > currentLocalTimeMinutes) &&
          canBookStartAtTime(optionMinutes)
        );
      })
    : bookingTimeOptions;
  const validCustomTimeEntries =
    isLaborBooking && workingHoursStartMinutes !== null && workingHoursEndMinutes !== null
      ? Array.from(
          { length: Math.max(0, workingHoursEndMinutes - workingHoursStartMinutes) + 1 },
          (_, offset) => workingHoursStartMinutes + offset,
        )
          .filter((totalMinutes) => !isSelectedDateToday || totalMinutes > currentLocalTimeMinutes)
          .filter((totalMinutes) => canBookStartAtTime(totalMinutes))
          .map((totalMinutes) => getCustomTimePartsFromMinutes(totalMinutes))
          .filter((entry): entry is NonNullable<ReturnType<typeof getCustomTimePartsFromMinutes>> => Boolean(entry))
      : [];
  const validCustomTimeMap = validCustomTimeEntries.reduce<Map<string, string>>((map, entry) => {
    map.set(createCustomTimeDisplayKey(entry.hour, entry.minute, entry.period), entry.value);
    return map;
  }, new Map<string, string>());
  const availableCustomPeriods = Array.from(new Set(validCustomTimeEntries.map((entry) => entry.period)));
  const availableCustomHours = Array.from(
    new Set(
      validCustomTimeEntries
        .filter((entry) => !customTimeParts.period || entry.period === customTimeParts.period)
        .map((entry) => entry.hour),
    ),
  );
  const availableCustomMinutes = Array.from(
    new Set(
      validCustomTimeEntries
        .filter(
          (entry) =>
            (!customTimeParts.period || entry.period === customTimeParts.period) &&
            (!customTimeParts.hour || entry.hour === customTimeParts.hour),
        )
        .map((entry) => entry.minute),
    ),
  );
  const selectedTimeMinutes = convertClockTimeToMinutes(formData.time);
  const laborDurationBaseMinutes = selectedTimeMinutes ?? workingHoursStartMinutes;
  const availableLaborDurationOptions =
    isLaborBooking && workingHoursEndMinutes !== null && laborDurationBaseMinutes !== null
      ? Array.from(
          {
            length: Math.max(0, Math.floor((workingHoursEndMinutes - laborDurationBaseMinutes) / 60)),
          },
          (_, index) => index + 1,
        )
          .filter((hours) => formData.date && !hasBookedTimeConflict(bookedSlots, formData.date, laborDurationBaseMinutes, hours))
      : [];
  const hasUnsavedBookingChanges = Object.values(formData).some((value) => String(value || '').trim().length > 0);
  const customTimePickerClassName =
    'w-full rounded-2xl border border-green-200 bg-white/90 px-3 py-3 text-sm font-semibold text-green-900 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-green-500';

  const updateCustomTimePart = (part: 'hour' | 'minute' | 'period', value: string) => {
    setCustomTimeParts((current) => {
      const nextParts = {
        ...current,
        [part]: value,
      };
      const matchingTimeValue = validCustomTimeMap.get(
        createCustomTimeDisplayKey(nextParts.hour, nextParts.minute, nextParts.period),
      );

      setFormData((currentForm) => ({
        ...currentForm,
        time: matchingTimeValue || '',
      }));

      return nextParts;
    });
  };

  useEffect(() => {
    setLocationMode(isLaborBooking ? 'loading' : 'fallback');
    autocompleteInstanceRef.current = null;
  }, [isLaborBooking, item?.id, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    autocompleteInstanceRef.current = null;
    setFormData(emptyBookingForm);
    setCustomTimeParts(emptyCustomTimeParts);
    setIsCalendarOpen(false);
    setIsTimeMenuOpen(false);
    setIsCloseConfirmOpen(false);
    setCalendarMonth(todayDate);
  }, [isOpen, item?.id, type]);

  useEffect(() => {
    setCustomTimeParts(getCustomTimeParts(formData.time));
  }, [formData.time]);

  useEffect(() => {
    if (!formData.time) {
      return;
    }

    if (
      availableTimeOptions.includes(formData.time) ||
      (
        isLaborBooking &&
        workingHoursStart &&
        workingHoursEnd &&
        isTimeWithinRange(formData.time, workingHoursStart, workingHoursEnd) &&
        (!isSelectedDateToday || (selectedTimeMinutes !== null && selectedTimeMinutes > currentLocalTimeMinutes))
      )
    ) {
      return;
    }

    setFormData((current) => ({
      ...current,
      time: '',
    }));
  }, [availableTimeOptions, currentLocalTimeMinutes, formData.time, isLaborBooking, isSelectedDateToday, selectedTimeMinutes, workingHoursEnd, workingHoursStart]);

  useEffect(() => {
    if (!isLaborBooking || !formData.duration) {
      return;
    }

    const durationIsStillAvailable = availableLaborDurationOptions.some(
      (hours) => formData.duration === formatDurationLabel(hours),
    );

    if (durationIsStillAvailable) {
      return;
    }

    setFormData((current) => ({
      ...current,
      duration: '',
    }));
  }, [availableLaborDurationOptions, formData.duration, isLaborBooking]);

  useEffect(() => {
    if (!isOpen || !isLaborBooking) {
      return undefined;
    }

    let cancelled = false;

    loadGoogleMapsPlacesScript()
      .then((googleApi: any) => {
        if (cancelled || !locationInputRef.current || autocompleteInstanceRef.current) {
          return;
        }

        const autocomplete = new googleApi.maps.places.Autocomplete(locationInputRef.current, {
          fields: ['formatted_address', 'name', 'place_id'],
          componentRestrictions: { country: 'ph' },
        });

        autocomplete.addListener('place_changed', async () => {
          const place = autocomplete.getPlace();
          const detailedPlace =
            !String(place?.name || '').trim() && String(place?.place_id || '').trim()
              ? await getPlaceDetails(googleApi, String(place.place_id).trim())
              : null;
          const nextLocation = formatPlaceLocation(detailedPlace || place, latestLocationQueryRef.current);

          if (nextLocation) {
            setFormData((current) => ({
              ...current,
              location: nextLocation,
            }));
          }
        });

        autocompleteInstanceRef.current = autocomplete;
        setLocationMode('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setLocationMode('fallback');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLaborBooking, isOpen]);

  if (!isOpen || !item) return null;

  const handleRequestClose = () => {
    if (hasUnsavedBookingChanges) {
      setIsCloseConfirmOpen(true);
      return;
    }

    onClose();
  };

  const handleKeepEditing = () => {
    setIsCloseConfirmOpen(false);
  };

  const handleConfirmClose = () => {
    setIsCloseConfirmOpen(false);
    onClose();
  };

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
        onClick={handleRequestClose}
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
                  {isLaborBooking ? 'Book Worker' : 'Book Service'}
                </h2>
                <p className="text-green-100 text-sm mt-1">{item.name}</p>
              </div>
              <button
                onClick={handleRequestClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="relative p-6">
            {isCloseConfirmOpen ? (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900">Cancel this booking?</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Your current booking details will be discarded if you close this form now.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={handleKeepEditing}
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Keep Editing
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmClose}
                    className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
                  >
                    Discard Booking
                  </button>
                </div>
              </div>
            ) : null}
            {/* Item Details */}
            <div className="bg-gradient-to-br from-gray-50 to-green-50 rounded-2xl p-6 mb-6 border border-gray-100">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                  {isLaborBooking ? <User className="w-6 h-6 text-white" /> : <div className="text-2xl">{item.image}</div>}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    {isLaborBooking ? item.type || item.title || 'Labor booking' : item.provider || item.seller}
                  </p>
                </div>
              </div>
              {isLaborBooking ? (
                <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Labor Type</p>
                    <p className="mt-1 font-medium text-gray-900">{item.type || item.title || 'Worker'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Rate</p>
                    <p className="mt-1 text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                      {formatPhpRate(item.rate || item.price, item.unit || 'hour', { shortHour: true })}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Rate</span>
                  <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                    {formatPhpRate(item.rate || item.price, item.unit || 'hour', { shortHour: true })}
                  </span>
                </div>
              )}
              {isLaborBooking && item.workingHoursLabel ? (
                <div className="mt-4 rounded-xl border border-green-100 bg-white/80 px-4 py-3 text-sm text-green-800">
                  <span className="font-medium">Working hours:</span> {item.workingHoursLabel}
                </div>
              ) : null}
            </div>

            {/* Date */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsTimeMenuOpen(false);
                    setIsCalendarOpen((current) => !current);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <span className={formData.date ? 'text-gray-900' : 'text-gray-400'}>
                    {formatCalendarButtonLabel(formData.date)}
                  </span>
                  <Calendar className="h-4 w-4 text-gray-500" />
                </button>
                <input type="hidden" required value={formData.date} onChange={() => undefined} />
                {isCalendarOpen ? (
                  <div className="absolute left-0 top-full z-20 mt-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
                    <DayPicker
                      mode="single"
                      selected={parseDateInputValue(formData.date)}
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      onSelect={(date) => {
                        if (!date) {
                          return;
                        }

                        const normalizedDate = new Date(
                          date.getFullYear(),
                          date.getMonth(),
                          date.getDate(),
                        );

                        setFormData((current) => ({
                          ...current,
                          date: `${normalizedDate.getFullYear()}-${String(normalizedDate.getMonth() + 1).padStart(2, '0')}-${String(normalizedDate.getDate()).padStart(2, '0')}`,
                        }));
                        setCalendarMonth(normalizedDate);
                        setIsCalendarOpen(false);
                      }}
                      disabled={{ before: todayDate }}
                      captionLayout="dropdown"
                      fromYear={todayDate.getFullYear()}
                      toYear={todayDate.getFullYear() + 2}
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsCalendarOpen(false)}
                        className="text-sm font-medium text-green-700 hover:text-green-800"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Time */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Time
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsCalendarOpen(false);
                    setIsTimeMenuOpen((current) => !current);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <span className={formData.time ? 'text-gray-900' : 'text-gray-400'}>
                    {formatBookingTimeLabel(formData.time)}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-green-600 transition-transform ${isTimeMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                <input type="hidden" required value={formData.time} onChange={() => undefined} />
                {isTimeMenuOpen ? (
                  <div className="absolute left-0 top-full z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                    {availableTimeOptions.length > 0 ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {availableTimeOptions.map((timeOption) => (
                            <button
                              key={timeOption}
                              type="button"
                              onClick={() => {
                                setFormData((current) => ({
                                  ...current,
                                  time: timeOption,
                                }));
                                setIsTimeMenuOpen(false);
                              }}
                              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                                formData.time === timeOption
                                  ? 'bg-green-600 text-white'
                                  : 'bg-green-50 text-green-700 hover:bg-green-100'
                              }`}
                            >
                              {formatBookingTimeLabel(timeOption)}
                            </button>
                          ))}
                        </div>
                        {isLaborBooking ? (
                          <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 via-emerald-50 to-white px-4 py-4 shadow-sm">
                            <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-green-800">
                              Custom Time
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-green-700">
                                  Hour
                                </span>
                                <select
                                  value={customTimeParts.hour}
                                  onChange={(event) => updateCustomTimePart('hour', event.target.value)}
                                  className={customTimePickerClassName}
                                >
                                  <option value="">HH</option>
                                  {availableCustomHours.map((hour) => (
                                    <option key={`custom-hour-${hour}`} value={hour}>
                                      {hour}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-green-700">
                                  Minute
                                </span>
                                <select
                                  value={customTimeParts.minute}
                                  onChange={(event) => updateCustomTimePart('minute', event.target.value)}
                                  className={customTimePickerClassName}
                                >
                                  <option value="">MM</option>
                                  {availableCustomMinutes.map((minute) => (
                                    <option key={`custom-minute-${minute}`} value={minute}>
                                      {minute}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-green-700">
                                  Period
                                </span>
                                <select
                                  value={customTimeParts.period}
                                  onChange={(event) => updateCustomTimePart('period', event.target.value)}
                                  className={customTimePickerClassName}
                                >
                                  <option value="">AM/PM</option>
                                  {availableCustomPeriods.map((period) => (
                                    <option key={`custom-period-${period}`} value={period}>
                                      {period}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="mt-3 rounded-xl border border-green-100 bg-white/80 px-3 py-2 text-sm font-medium text-green-900">
                              {formData.time ? `Selected: ${formatBookingTimeLabel(formData.time)}` : 'Choose an hour, minute, and period.'}
                            </div>
                            <p className="mt-2 text-xs text-green-800">
                              Need a different time? Enter one manually within {item.workingHoursLabel || 'the laborer’s working hours'}.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                        No booking times are available until this laborer sets working hours on their listing.
                      </div>
                    )}
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsTimeMenuOpen(false)}
                        className="text-sm font-medium text-green-700 hover:text-green-800"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
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
                disabled={isLaborBooking && !formData.time}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">Select duration</option>
                {isLaborBooking
                  ? availableLaborDurationOptions.map((hours) => (
                      <option key={`labor-duration-${hours}`} value={formatDurationLabel(hours)}>
                        {formatDurationLabel(hours)}
                      </option>
                    ))
                  : (
                    <>
                      <option value="2 hours">2 hours</option>
                      <option value="4 hours">4 hours</option>
                      <option value="6 hours">6 hours</option>
                      <option value="8 hours">8 hours (Full day)</option>
                      <option value="2 days">2 days</option>
                      <option value="3 days">3 days</option>
                      <option value="1 week">1 week</option>
                    </>
                  )}
              </select>
              {isLaborBooking ? (
                <p className="mt-2 text-xs text-gray-500">
                  {formData.time
                    ? availableLaborDurationOptions.length > 0
                      ? `Available durations are based on the selected start time and the worker's hours of ${item.workingHoursLabel || 'the listed schedule'}.`
                      : `No hourly duration fits after ${formatBookingTimeLabel(formData.time)} within ${item.workingHoursLabel || "the worker's schedule"}. Choose an earlier time.`
                    : `Choose a start time first, then the duration will update to match the worker's hours of ${item.workingHoursLabel || 'the listed schedule'}.`}
                </p>
              ) : null}
            </div>

            {/* Location */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                {isLaborBooking ? 'Where is your farm located?' : 'Location'}
              </label>
              <input
                ref={locationInputRef}
                type="text"
                required
                placeholder={
                  isLaborBooking
                    ? 'Search your farm, sitio, purok, or nearby landmark'
                    : 'e.g., Field A, Storage Area'
                }
                value={formData.location}
                onChange={(e) => {
                  latestLocationQueryRef.current = e.target.value;
                  setFormData({ ...formData, location: e.target.value });
                }}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
              {isLaborBooking ? (
                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  <p>
                    {locationMode === 'ready'
                      ? 'Use Google Maps suggestions for your farm, sitio, purok, barangay, or a nearby landmark.'
                      : locationMode === 'loading'
                        ? 'Loading Google Maps suggestions...'
                        : 'Google Maps suggestions are unavailable right now, so you can type the farm, sitio, purok, or landmark manually.'}
                  </p>
                  {item.workingHoursLabel ? <p>Bookings for this laborer are only accepted during {item.workingHoursLabel}.</p> : null}
                </div>
              ) : null}
            </div>

            {!isLaborBooking ? (
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
            ) : null}

            {/* Actions */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleRequestClose}
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
