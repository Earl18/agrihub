import { LaborPayment } from '../models/LaborPayment.js';
import { User } from '../models/User.js';
import { appendActivity } from '../utils/activityLog.js';
import { canManageCommercialFeatures, roleQuery } from '../utils/roles.js';
import { createXenditInvoice, mapLaborPaymentMethodToXendit, verifyXenditCallbackToken } from '../utils/xendit.js';

function normalizeClockTime(value) {
  const normalized = String(value || '').trim();
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : '';
}

function convertClockTimeToMinutes(value) {
  const normalized = normalizeClockTime(value);

  if (!normalized) {
    return null;
  }

  const [hours, minutes] = normalized.split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
}

function formatWorkingHoursRange(start, end) {
  const normalizedStart = normalizeClockTime(start);
  const normalizedEnd = normalizeClockTime(end);

  if (!normalizedStart || !normalizedEnd) {
    return '';
  }

  const [startHours, startMinutes] = normalizedStart.split(':').map(Number);
  const [endHours, endMinutes] = normalizedEnd.split(':').map(Number);
  const formatOptions = { hour: 'numeric', minute: '2-digit' };

  return `${new Date(2000, 0, 1, startHours, startMinutes).toLocaleTimeString('en-US', formatOptions)} - ${new Date(
    2000,
    0,
    1,
    endHours,
    endMinutes,
  ).toLocaleTimeString('en-US', formatOptions)}`;
}

function getDurationHours(value) {
  const match = String(value || '').trim().match(/^(\d+)\s*hour/i);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function hasLaborBookingTimeConflict(bookings = [], date, requestedStartMinutes, requestedDurationHours) {
  const normalizedDate = String(date || '').trim();
  const requestedEndMinutes = requestedStartMinutes + requestedDurationHours * 60;

  return bookings.some((booking) => {
    if (!booking) {
      return false;
    }

    if (String(booking.date || '').trim() !== normalizedDate) {
      return false;
    }

    if (String(booking.status || '').trim().toLowerCase() === 'cancelled') {
      return false;
    }

    const existingStartMinutes = convertClockTimeToMinutes(booking.time);
    const existingDurationHours = getDurationHours(booking.duration);

    if (existingStartMinutes === null || existingDurationHours === null) {
      return false;
    }

    const existingEndMinutes = existingStartMinutes + existingDurationHours * 60;
    return requestedStartMinutes <= existingEndMinutes && existingStartMinutes <= requestedEndMinutes;
  });
}

function buildLaborPaymentReference() {
  return `LPAY-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function buildLaborBookingId() {
  return `LB-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function createTravelTrackingSnapshot() {
  return {
    isOnTheWay: false,
    startedAt: null,
    updatedAt: null,
    currentLocation: {
      lat: null,
      lng: null,
    },
  };
}

function getLaborListings(user) {
  const listings = Array.isArray(user?.laborProfile?.listings) ? user.laborProfile.listings : [];

  if (listings.length > 0) {
    return listings.filter((listing) => String(listing?.workerType || '').trim());
  }

  if (String(user?.laborProfile?.workerType || '').trim()) {
    return [user.laborProfile];
  }

  return [];
}

function laborOfferIsComplete(user, offer) {
  return Boolean(
    String(offer?.description || '').trim() &&
      String(offer?.workerType || '').trim() &&
      Number(offer?.rate || 0) > 0 &&
      String(offer?.availability || '').trim() &&
      Array.isArray(offer?.skills) &&
      offer.skills.length > 0 &&
      String(offer?.workingHoursStart || '').trim() &&
      String(offer?.workingHoursEnd || '').trim() &&
      String(user?.profile?.experience || '').trim() &&
      String(user?.profile?.location || '').trim() &&
      String(user?.phone || '').trim(),
  );
}

function mapInvoiceStatusToLaborPaymentStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();

  if (normalized === 'PAID' || normalized === 'SETTLED') {
    return 'paid';
  }

  if (normalized === 'EXPIRED') {
    return 'expired';
  }

  if (normalized === 'FAILED' || normalized === 'VOIDED') {
    return 'failed';
  }

  return 'awaiting_payment';
}

async function activatePaidLaborBooking(payment) {
  if (payment.bookingId) {
    return payment;
  }

  const [buyer, worker] = await Promise.all([
    User.findById(payment.buyerUserId),
    User.findOne({
      _id: payment.workerUserId,
      ...roleQuery('laborer'),
    }),
  ]);

  if (!buyer || !worker) {
    payment.status = 'release_failed';
    payment.releaseFailureReason = 'Buyer or laborer could not be found while activating the paid booking.';
    await payment.save();
    return payment;
  }

  const selectedListing = getLaborListings(worker).find(
    (listing) => String(listing?.workerType || '').trim() === String(payment.workerType || '').trim(),
  );

  if (
    !selectedListing ||
    !canManageCommercialFeatures(worker) ||
    !selectedListing.isPublished ||
    !laborOfferIsComplete(worker, selectedListing)
  ) {
    payment.status = 'release_failed';
    payment.releaseFailureReason = 'The labor listing is no longer available for activation.';
    await payment.save();
    return payment;
  }

  const requestedTimeMinutes = convertClockTimeToMinutes(payment.bookingTime);
  const durationHoursValue = getDurationHours(payment.bookingDuration);
  const workerActiveBookings = Array.isArray(worker?.laborProfile?.activeBookings)
    ? worker.laborProfile.activeBookings
    : [];

  if (
    requestedTimeMinutes === null ||
    durationHoursValue === null ||
    hasLaborBookingTimeConflict(workerActiveBookings, payment.bookingDate, requestedTimeMinutes, durationHoursValue)
  ) {
    payment.status = 'release_failed';
    payment.releaseFailureReason = 'The laborer became unavailable for the paid booking time.';
    await payment.save();
    return payment;
  }

  const bookingId = buildLaborBookingId();

  const buyerBooking = {
    bookingId,
    worker: worker.name,
    workerId: worker._id.toString(),
    workerEmail: String(worker.email || '').trim().toLowerCase(),
    workerPhone: String(worker.phone || '').trim(),
    type: payment.workerType,
    date: payment.bookingDate,
    time: payment.bookingTime,
    duration: payment.bookingDuration,
    location: payment.bookingLocation,
    rate: payment.rate,
    status: 'confirmed',
    cost: payment.subtotal,
    bookedByUserId: buyer._id.toString(),
    bookedByName: String(buyer.name || '').trim() || 'Authenticated User',
    bookedByEmail: String(buyer.email || '').trim().toLowerCase(),
    bookedByPhone: String(buyer.phone || '').trim(),
    travelTracking: createTravelTrackingSnapshot(),
  };

  const workerBooking = {
    ...buyerBooking,
    worker: String(buyer.name || '').trim() || 'Authenticated User',
  };

  if (!buyer.laborBookings) {
    buyer.laborBookings = {
      activeBookings: [],
      bookingHistory: [],
    };
  }

  buyer.laborBookings.activeBookings = [
    ...(Array.isArray(buyer.laborBookings.activeBookings) ? buyer.laborBookings.activeBookings : []),
    buyerBooking,
  ];

  worker.laborProfile.activeBookings = [
    ...(Array.isArray(worker.laborProfile?.activeBookings) ? worker.laborProfile.activeBookings : []),
    workerBooking,
  ];

  appendActivity(buyer, {
    description: `Paid labor booking created for ${worker.name} on ${payment.bookingDate}`,
    status: 'confirmed',
  });

  payment.bookingId = bookingId;
  payment.status = 'booking_created';
  payment.bookingCreatedAt = new Date();
  payment.releaseStatus = 'not_ready';

  await Promise.all([buyer.save(), worker.save(), payment.save()]);

  return payment;
}

export async function createLaborPaymentCheckout(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    if (!canManageCommercialFeatures(req.user)) {
      return res.status(403).json({
        message: 'This account is currently restricted from marketplace and workforce actions.',
      });
    }

    if (
      req.user.phoneVerification?.status !== 'verified' ||
      !String(req.user.phone || '').trim()
    ) {
      return res.status(400).json({
        message: 'Verify your phone number before paying for a labor booking.',
      });
    }

    const workerId = String(req.body?.workerId || '').trim();
    const workerType = String(req.body?.workerType || '').trim();
    const date = String(req.body?.date || '').trim();
    const time = String(req.body?.time || '').trim();
    const duration = String(req.body?.duration || '').trim();
    const location = String(req.body?.location || '').trim();
    const paymentMethod = String(req.body?.paymentMethod || '').trim().toLowerCase();

    if (!workerId || !workerType || !date || !time || !duration || !location || !paymentMethod) {
      return res.status(400).json({
        message: 'Worker, labor type, date, time, duration, location, and payment method are required.',
      });
    }

    const worker = await User.findOne({
      _id: workerId,
      ...roleQuery('laborer'),
    });

    const selectedListing = getLaborListings(worker).find(
      (listing) => String(listing?.workerType || '').trim() === workerType,
    );

    if (
      !worker ||
      !selectedListing ||
      !canManageCommercialFeatures(worker) ||
      !selectedListing.isPublished ||
      !laborOfferIsComplete(worker, selectedListing)
    ) {
      return res.status(404).json({
        message: 'Selected worker is not available for booking.',
      });
    }

    const requestedTimeMinutes = convertClockTimeToMinutes(time);
    const workingHoursStartMinutes = convertClockTimeToMinutes(selectedListing.workingHoursStart);
    const workingHoursEndMinutes = convertClockTimeToMinutes(selectedListing.workingHoursEnd);
    const durationHoursValue = getDurationHours(duration);

    if (
      requestedTimeMinutes === null ||
      workingHoursStartMinutes === null ||
      workingHoursEndMinutes === null ||
      durationHoursValue === null
    ) {
      return res.status(400).json({
        message: 'Enter a valid labor booking time and duration.',
      });
    }

    if (requestedTimeMinutes < workingHoursStartMinutes || requestedTimeMinutes > workingHoursEndMinutes) {
      return res.status(400).json({
        message: `Bookings for this laborer are only available from ${formatWorkingHoursRange(selectedListing.workingHoursStart, selectedListing.workingHoursEnd)}.`,
      });
    }

    if (requestedTimeMinutes + durationHoursValue * 60 > workingHoursEndMinutes) {
      return res.status(400).json({
        message: `This booking extends past the laborer's working hours of ${formatWorkingHoursRange(selectedListing.workingHoursStart, selectedListing.workingHoursEnd)}.`,
      });
    }

    const workerActiveBookings = Array.isArray(worker?.laborProfile?.activeBookings)
      ? worker.laborProfile.activeBookings
      : [];

    if (hasLaborBookingTimeConflict(workerActiveBookings, date, requestedTimeMinutes, durationHoursValue)) {
      return res.status(409).json({
        message: 'This worker is already booked for part of that time range on the selected date.',
      });
    }

    const numericRate = Number(selectedListing.rate || 0);
    const subtotal = numericRate * durationHoursValue;
    const tax = subtotal * 0.08;
    const total = subtotal + tax;
    const reference = buildLaborPaymentReference();
    const paymentMethodCode = mapLaborPaymentMethodToXendit(paymentMethod);
    const clientUrl = String(process.env.CLIENT_URL || 'http://localhost:5173').trim();

    const payment = await LaborPayment.create({
      reference,
      status: 'pending_checkout',
      paymentMethod: paymentMethodCode,
      buyerUserId: req.user._id.toString(),
      buyerName: String(req.user.name || '').trim(),
      buyerEmail: String(req.user.email || '').trim().toLowerCase(),
      buyerPhone: String(req.user.phone || '').trim(),
      workerUserId: worker._id.toString(),
      workerName: String(worker.name || '').trim(),
      workerEmail: String(worker.email || '').trim().toLowerCase(),
      workerPhone: String(worker.phone || '').trim(),
      workerType,
      bookingDate: date,
      bookingTime: time,
      bookingDuration: duration,
      bookingLocation: location,
      rate: numericRate,
      subtotal,
      tax,
      total,
      metadata: {
        listingRate: numericRate,
        workingHoursStart: selectedListing.workingHoursStart,
        workingHoursEnd: selectedListing.workingHoursEnd,
      },
    });

    const invoice = await createXenditInvoice({
      external_id: reference,
      amount: total,
      payer_email: payment.buyerEmail,
      description: `AgriHub labor booking for ${payment.workerName} (${payment.workerType}) on ${date} at ${time}`,
      currency: 'PHP',
      success_redirect_url: `${clientUrl}/app?tab=labor&laborPaymentRef=${encodeURIComponent(reference)}&laborPaymentState=success`,
      failure_redirect_url: `${clientUrl}/app?tab=labor&laborPaymentRef=${encodeURIComponent(reference)}&laborPaymentState=failure`,
      payment_methods: [paymentMethodCode],
      customer: {
        given_names: payment.buyerName || 'AgriHub Customer',
        email: payment.buyerEmail,
        mobile_number: payment.buyerPhone,
      },
      items: [
        {
          name: `${payment.workerType} labor booking`,
          quantity: durationHoursValue,
          price: numericRate,
          category: 'labor',
        },
      ],
      metadata: {
        agrihub_reference: reference,
        worker_id: payment.workerUserId,
        buyer_id: payment.buyerUserId,
      },
    });

    payment.status = 'awaiting_payment';
    payment.checkoutUrl = String(invoice?.invoice_url || '').trim();
    payment.xenditInvoiceId = String(invoice?.id || '').trim();
    payment.xenditInvoiceStatus = String(invoice?.status || '').trim();
    await payment.save();

    return res.status(201).json({
      message: 'Labor payment checkout created.',
      payment: {
        reference: payment.reference,
        status: payment.status,
        total: payment.total,
        subtotal: payment.subtotal,
        tax: payment.tax,
        paymentMethod: payment.paymentMethod,
      },
      checkoutUrl: payment.checkoutUrl,
    });
  } catch (error) {
    next(error);
  }
}

export async function getLaborPaymentStatus(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    const reference = String(req.params?.reference || '').trim();

    if (!reference) {
      return res.status(400).json({
        message: 'A payment reference is required.',
      });
    }

    const payment = await LaborPayment.findOne({
      reference,
      buyerUserId: req.user._id.toString(),
    });

    if (!payment) {
      return res.status(404).json({
        message: 'That labor payment could not be found on this account.',
      });
    }

    return res.json({
      payment: {
        reference: payment.reference,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        total: payment.total,
        checkoutUrl: payment.checkoutUrl,
        bookingId: payment.bookingId,
        bookingDate: payment.bookingDate,
        bookingTime: payment.bookingTime,
        workerName: payment.workerName,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleXenditWebhook(req, res, next) {
  try {
    if (!verifyXenditCallbackToken(req.headers['x-callback-token'])) {
      return res.status(401).json({
        message: 'Invalid Xendit callback token.',
      });
    }

    const reference = String(req.body?.external_id || '').trim();

    if (!reference) {
      return res.status(400).json({
        message: 'Missing payment reference.',
      });
    }

    const payment = await LaborPayment.findOne({ reference });

    if (!payment) {
      return res.status(404).json({
        message: 'Labor payment record not found.',
      });
    }

    payment.xenditInvoiceId = String(req.body?.id || payment.xenditInvoiceId || '').trim();
    payment.xenditInvoiceStatus = String(req.body?.status || '').trim();
    payment.xenditWebhookPayload = req.body;

    const nextStatus = mapInvoiceStatusToLaborPaymentStatus(req.body?.status);
    payment.status = nextStatus;

    if (nextStatus === 'paid') {
      payment.paidAt = payment.paidAt || new Date();
      await payment.save();
      await activatePaidLaborBooking(payment);
    } else {
      await payment.save();
    }

    return res.json({
      received: true,
    });
  } catch (error) {
    next(error);
  }
}
