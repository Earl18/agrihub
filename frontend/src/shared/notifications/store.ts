export type AppNotification = {
  id: number;
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const STORAGE_KEY = 'agrihub_notifications';

const defaultNotifications: AppNotification[] = [
  {
    id: 1,
    type: 'success',
    title: 'Order Confirmed',
    message: 'Your order of 500kg Rice has been confirmed',
    time: '5 minutes ago',
    read: false,
  },
  {
    id: 2,
    type: 'info',
    title: 'Worker Available',
    message: 'John Martinez is now available for booking',
    time: '1 hour ago',
    read: false,
  },
  {
    id: 3,
    type: 'warning',
    title: 'Service Reminder',
    message: 'Tractor service scheduled for tomorrow at 8 AM',
    time: '2 hours ago',
    read: true,
  },
  {
    id: 4,
    type: 'success',
    title: 'Payment Received',
    message: 'Payment of $240 received for wheat harvest',
    time: '5 hours ago',
    read: true,
  },
];

function canUseStorage() {
  return typeof window !== 'undefined';
}

export function getStoredNotifications() {
  if (!canUseStorage()) {
    return defaultNotifications;
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultNotifications));
    return defaultNotifications;
  }

  try {
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : defaultNotifications;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultNotifications));
    return defaultNotifications;
  }
}

export function saveNotifications(notifications: AppNotification[]) {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new Event('agrihub:notifications-updated'));
}
