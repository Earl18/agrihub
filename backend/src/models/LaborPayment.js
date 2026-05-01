import mongoose from 'mongoose';

const laborPaymentSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'pending_checkout',
        'awaiting_payment',
        'paid',
        'booking_created',
        'expired',
        'failed',
        'ready_for_release',
        'released',
        'release_pending',
        'release_failed',
      ],
      default: 'pending_checkout',
    },
    paymentMethod: {
      type: String,
      default: '',
    },
    paymentProvider: {
      type: String,
      default: 'xendit',
    },
    buyerUserId: {
      type: String,
      default: '',
      index: true,
    },
    buyerName: {
      type: String,
      default: '',
    },
    buyerEmail: {
      type: String,
      default: '',
    },
    buyerPhone: {
      type: String,
      default: '',
    },
    workerUserId: {
      type: String,
      default: '',
      index: true,
    },
    workerName: {
      type: String,
      default: '',
    },
    workerEmail: {
      type: String,
      default: '',
    },
    workerPhone: {
      type: String,
      default: '',
    },
    workerType: {
      type: String,
      default: '',
    },
    bookingDate: {
      type: String,
      default: '',
    },
    bookingTime: {
      type: String,
      default: '',
    },
    bookingDuration: {
      type: String,
      default: '',
    },
    bookingLocation: {
      type: String,
      default: '',
    },
    bookingId: {
      type: String,
      default: '',
      index: true,
    },
    rate: {
      type: Number,
      default: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    checkoutUrl: {
      type: String,
      default: '',
    },
    xenditInvoiceId: {
      type: String,
      default: '',
      index: true,
    },
    xenditInvoiceStatus: {
      type: String,
      default: '',
    },
    xenditWebhookPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    bookingCreatedAt: {
      type: Date,
      default: null,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    releaseStatus: {
      type: String,
      enum: ['not_ready', 'ready', 'pending', 'released', 'failed'],
      default: 'not_ready',
    },
    releaseFailureReason: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

export const LaborPayment = mongoose.model('LaborPayment', laborPaymentSchema);
