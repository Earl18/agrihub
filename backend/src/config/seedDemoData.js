import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

const demoPassword = 'DemoPass123!';

const demoUsers = [
  {
    name: 'Valley Harvest Trading',
    email: 'vendor@agrihub.com',
    phone: '+63 917 111 1001',
    role: 'user',
    roles: ['buyer', 'seller'],
    accountType: 'vendor',
    verification: {
      seller: { status: 'verified' },
      laborer: { status: 'unverified' },
    },
    profile: {
      farmName: 'Valley Harvest',
      location: 'Nueva Ecija, Philippines',
      farmSize: '120 hectares',
      experience: '14 years',
      specialization: 'Rice and grains',
    },
    marketplaceListings: [
      { name: 'Premium Rice', category: 'grains', price: 60, unit: 'kg', stock: 800, image: '🌾', rating: 4.7, views: 156, orders: 42 },
      { name: 'Organic Wheat Seeds', category: 'seeds', price: 45, unit: 'kg', stock: 500, image: '🌾', rating: 4.5, views: 98, orders: 18 },
      { name: 'Corn Seeds (Hybrid)', category: 'seeds', price: 55, unit: 'kg', stock: 300, image: '🌽', rating: 4.4, views: 71, orders: 14 },
    ],
  },
  {
    name: 'Demo Laborer Maria',
    email: 'labor@agrihub.com',
    phone: '+63 917 111 1002',
    role: 'user',
    roles: ['buyer', 'laborer'],
    accountType: 'laborer',
    verification: {
      seller: { status: 'unverified' },
      laborer: { status: 'verified' },
    },
    profile: {
      farmName: 'Independent Labor Contractor',
      location: 'Bulacan, Philippines',
      farmSize: 'Mobile crew',
      experience: '10 years',
      specialization: 'Irrigation and harvesting',
    },
    laborProfile: {
      title: 'Irrigation and field labor service',
      description: 'Experienced field worker for irrigation setup, crop watering, and harvest support.',
      workerType: 'Irrigator',
      rate: 22,
      availability: 'Available',
      skills: ['Drip System', 'Sprinkler', 'Flood'],
      distance: '3 km',
      serviceArea: 'Bulacan farms and nearby barangays',
      rating: 4.9,
      isPublished: true,
      listings: [
        {
          title: 'Irrigator Labor',
          description: 'Experienced field worker for irrigation setup, crop watering, and harvest support.',
          workerType: 'Irrigator',
          rate: 22,
          availability: 'Available',
          skills: ['Drip System', 'Sprinkler', 'Flood'],
          distance: '3 km',
          serviceArea: 'Bulacan farms and nearby barangays',
          isPublished: true,
        },
      ],
      activeBookings: [
        { worker: 'Maria Santos', type: 'Irrigator', date: '2026-04-16', time: '07:00 AM', duration: '6 hours', location: 'Field B', rate: 22, status: 'confirmed', cost: 132 },
      ],
      bookingHistory: [
        { worker: 'Maria Santos', type: 'Irrigator', date: '2026-04-10', duration: '4 hours', location: 'Field A', rate: 22, status: 'completed', cost: 88, rating: 5 },
      ],
    },
  },
  {
    name: 'AgriEquip Rentals',
    email: 'services@agrihub.com',
    phone: '+63 917 111 1003',
    role: 'user',
    roles: ['buyer', 'service'],
    accountType: 'service',
    profile: {
      farmName: 'AgriEquip Rentals',
      location: 'Pampanga, Philippines',
      farmSize: 'Equipment hub',
      experience: '8 years',
      specialization: 'Equipment rental and maintenance',
    },
    serviceProfile: {
      category: 'Equipment Rental',
      services: [
        { name: 'Tractor (70 HP)', rate: 45, unit: 'hour', available: true, image: '🚜' },
        { name: 'Combine Harvester', rate: 120, unit: 'hour', available: true, image: '🌾' },
        { name: 'Sprayer System', rate: 35, unit: 'hour', available: false, image: '💧' },
      ],
      bookings: [
    { service: 'Tractor (70 HP)', provider: 'AgriEquip Rentals', date: '2026-04-17', time: '08:00 AM', duration: '6 hours', location: 'Field A, Brgy. San Isidro', status: 'confirmed', description: 'Heavy-duty tractor rental for plowing and land preparation. Includes operator.', rate: '₱45.00/hour', contact: '+63 917 123 4567', bookingRef: 'BK-2026-1001' },
      ],
    },
  },
  {
    name: 'Farm Operations Hub',
    email: 'operations@agrihub.com',
    phone: '+63 917 111 1004',
    role: 'user',
    roles: ['buyer', 'operations'],
    accountType: 'operations',
    profile: {
      farmName: 'Farm Operations Hub',
      location: 'Tarlac, Philippines',
      farmSize: '180 hectares',
      experience: '16 years',
      specialization: 'Field operations planning',
    },
    operationsProfile: {
      fields: [
        { id: 'A', name: 'Field A', area: 25, crop: 'Wheat', status: 'growing' },
        { id: 'B', name: 'Field B', area: 18, crop: 'Rice', status: 'preparing' },
        { id: 'C', name: 'Field C', area: 30, crop: 'Corn', status: 'harvesting' },
      ],
      activeOperations: [
        { title: 'Wheat Harvesting', field: 'Field C', crop: 'Wheat', startDate: '2026-04-13', progress: 60, workers: 8, equipment: 'Combine Harvester', priority: 'high', notes: 'Weather conditions favorable. Expected completion by end of day.', tasks: [
          { id: '1-1', label: 'Land Preparation', icon: 'tractor', completed: true },
          { id: '1-2', label: 'Pre-Harvest Inspection', icon: 'sun', completed: true },
          { id: '1-3', label: 'Harvesting', icon: 'scissors', completed: true },
          { id: '1-4', label: 'Grain Collection', icon: 'sprout', completed: false },
          { id: '1-5', label: 'Transport to Storage', icon: 'tractor', completed: false },
        ] },
      ],
      plannedOperations: [
        { title: 'Corn Planting', field: 'Field D', crop: 'Corn', startDate: '2026-04-20', workers: 6, equipment: 'Seed Drill', priority: 'high', estimatedDuration: '2 days' },
      ],
      completedOperations: [
        { title: 'Rice Field Preparation', field: 'Field B', crop: 'Rice', completedDate: '2026-04-10', duration: '3 days', workers: 5, equipment: 'Tractor', priority: 'high', status: 'success', notes: 'Completed ahead of schedule' },
      ],
    },
  },
];

export async function seedDemoData() {
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  for (const demoUser of demoUsers) {
    await User.findOneAndUpdate(
      { email: demoUser.email.toLowerCase() },
      {
        $set: {
          ...demoUser,
          email: demoUser.email.toLowerCase(),
          passwordHash,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
  }
}
