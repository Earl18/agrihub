import mongoose from 'mongoose';

const marketplaceListingSchema = new mongoose.Schema(
  {
    name: String,
    category: String,
    price: Number,
    unit: String,
    stock: Number,
    image: String,
    rating: Number,
    status: {
      type: String,
      default: 'active',
    },
    views: {
      type: Number,
      default: 0,
    },
    orders: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const laborBookingSchema = new mongoose.Schema(
  {
    worker: String,
    type: String,
    date: String,
    time: String,
    duration: String,
    location: String,
    rate: Number,
    status: String,
    cost: Number,
    rating: Number,
  },
  { _id: false },
);

const serviceItemSchema = new mongoose.Schema(
  {
    name: String,
    rate: Number,
    unit: String,
    available: Boolean,
    image: String,
  },
  { _id: false },
);

const serviceBookingSchema = new mongoose.Schema(
  {
    service: String,
    provider: String,
    date: String,
    time: String,
    duration: String,
    location: String,
    status: String,
    description: String,
    rate: String,
    contact: String,
    bookingRef: String,
  },
  { _id: false },
);

const operationTaskSchema = new mongoose.Schema(
  {
    id: String,
    label: String,
    icon: String,
    completed: Boolean,
  },
  { _id: false },
);

const operationSchema = new mongoose.Schema(
  {
    title: String,
    field: String,
    crop: String,
    startDate: String,
    completedDate: String,
    duration: String,
    progress: Number,
    workers: Number,
    equipment: String,
    priority: String,
    notes: String,
    estimatedDuration: String,
    status: String,
    tasks: {
      type: [operationTaskSchema],
      default: [],
    },
  },
  { _id: false },
);

const roleVerificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['unverified', 'pending', 'verified'],
      default: 'unverified',
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    passwordHash: {
      type: String,
      default: null,
    },
    googleId: {
      type: String,
      default: undefined,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    roles: {
      type: [String],
      enum: ['buyer', 'seller', 'laborer', 'service', 'operations', 'admin'],
      default: ['buyer'],
    },
    accountType: {
      type: String,
      enum: ['customer', 'vendor', 'laborer', 'service', 'operations', 'admin'],
      default: 'customer',
    },
    verification: {
      seller: {
        type: roleVerificationSchema,
        default: () => ({}),
      },
      laborer: {
        type: roleVerificationSchema,
        default: () => ({}),
      },
    },
    profile: {
      firstName: {
        type: String,
        default: '',
      },
      middleName: {
        type: String,
        default: '',
      },
      lastName: {
        type: String,
        default: '',
      },
      address: {
        type: String,
        default: '',
      },
      streetAddress: {
        type: String,
        default: '',
      },
      city: {
        type: String,
        default: '',
      },
      state: {
        type: String,
        default: '',
      },
      postalCode: {
        type: String,
        default: '',
      },
      country: {
        type: String,
        default: '',
      },
      farmName: {
        type: String,
        default: '',
      },
      location: {
        type: String,
        default: '',
      },
      coordinates: {
        lat: {
          type: Number,
          default: null,
        },
        lng: {
          type: Number,
          default: null,
        },
      },
      farmSize: {
        type: String,
        default: '',
      },
      experience: {
        type: String,
        default: '',
      },
      specialization: {
        type: String,
        default: '',
      },
    },
    marketplaceListings: {
      type: [marketplaceListingSchema],
      default: [],
    },
    laborProfile: {
      workerType: {
        type: String,
        default: '',
      },
      rate: {
        type: Number,
        default: 0,
      },
      availability: {
        type: String,
        default: 'Available',
      },
      skills: {
        type: [String],
        default: [],
      },
      distance: {
        type: String,
        default: '',
      },
      rating: {
        type: Number,
        default: 0,
      },
      activeBookings: {
        type: [laborBookingSchema],
        default: [],
      },
      bookingHistory: {
        type: [laborBookingSchema],
        default: [],
      },
    },
    serviceProfile: {
      category: {
        type: String,
        default: '',
      },
      services: {
        type: [serviceItemSchema],
        default: [],
      },
      bookings: {
        type: [serviceBookingSchema],
        default: [],
      },
    },
    operationsProfile: {
      fields: {
        type: [
          new mongoose.Schema(
            {
              id: String,
              name: String,
              area: Number,
              crop: String,
              status: String,
            },
            { _id: false },
          ),
        ],
        default: [],
      },
      activeOperations: {
        type: [operationSchema],
        default: [],
      },
      plannedOperations: {
        type: [operationSchema],
        default: [],
      },
      completedOperations: {
        type: [operationSchema],
        default: [],
      },
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index(
  { googleId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      googleId: {
        $type: 'string',
      },
    },
  },
);

export const User = mongoose.model('User', userSchema);
