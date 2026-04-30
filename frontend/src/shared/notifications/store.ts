export type AppNotification = {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  sourceKey?: string;
};

type StoredNotificationBucket = {
  notifications: AppNotification[];
  dismissedSourceKeys: string[];
};

type StoredNotificationMap = Record<string, StoredNotificationBucket>;

const STORAGE_KEY = 'agrihub_user_notifications';
const NOTIFICATIONS_UPDATED_EVENT = 'agrihub:notifications-updated';

function canUseStorage() {
  return typeof window !== 'undefined';
}

function readNotificationState() {
  if (!canUseStorage()) {
    return {} as StoredNotificationMap;
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {} as StoredNotificationMap;
  }

  try {
    const parsed = JSON.parse(raw) as StoredNotificationMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {} as StoredNotificationMap;
  }
}

function writeNotificationState(state: StoredNotificationMap) {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}

function getUserBucket(state: StoredNotificationMap, userId: string) {
  return (
    state[userId] || {
      notifications: [],
      dismissedSourceKeys: [],
    }
  );
}

function normalizeNotifications(notifications: AppNotification[]) {
  return notifications
    .filter((notification) => notification?.id && notification?.title && notification?.message)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 100);
}

function buildNotificationId(sourceKey?: string) {
  return sourceKey || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getStoredNotifications(userId?: string | null) {
  if (!userId) {
    return [] as AppNotification[];
  }

  const state = readNotificationState();
  const bucket = getUserBucket(state, userId);
  return normalizeNotifications(bucket.notifications);
}

export function addStoredNotification(
  userId: string,
  notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'> & {
    id?: string;
    read?: boolean;
    createdAt?: string;
  },
) {
  if (!userId) {
    return;
  }

  const state = readNotificationState();
  const bucket = getUserBucket(state, userId);
  const sourceKey = notification.sourceKey?.trim();
  const nextNotification: AppNotification = {
    id: notification.id || buildNotificationId(sourceKey),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    createdAt: notification.createdAt || new Date().toISOString(),
    read: Boolean(notification.read),
    ...(sourceKey ? { sourceKey } : {}),
  };

  const nextNotifications = sourceKey
    ? [
        nextNotification,
        ...bucket.notifications.filter(
          (item) => item.id !== nextNotification.id && item.sourceKey !== sourceKey,
        ),
      ]
    : [nextNotification, ...bucket.notifications.filter((item) => item.id !== nextNotification.id)];

  state[userId] = {
    notifications: normalizeNotifications(nextNotifications),
    dismissedSourceKeys: bucket.dismissedSourceKeys,
  };

  writeNotificationState(state);
}

export function upsertStoredNotifications(
  userId: string,
  notifications: Array<
    Omit<AppNotification, 'id' | 'read' | 'createdAt'> & {
      id?: string;
      read?: boolean;
      sourceKey: string;
      createdAt?: string;
    }
  >,
) {
  if (!userId) {
    return;
  }

  const state = readNotificationState();
  const bucket = getUserBucket(state, userId);
  const dismissed = new Set(bucket.dismissedSourceKeys);
  const existingBySourceKey = new Map(
    bucket.notifications
      .filter((notification) => notification.sourceKey)
      .map((notification) => [notification.sourceKey as string, notification]),
  );
  const nonDerivedNotifications = bucket.notifications.filter((notification) => !notification.sourceKey);
  const mergedDerivedNotifications = notifications
    .filter((notification) => notification.sourceKey && !dismissed.has(notification.sourceKey))
    .map((notification) => {
      const existing = existingBySourceKey.get(notification.sourceKey);

      return {
        id: notification.id || existing?.id || buildNotificationId(notification.sourceKey),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt || existing?.createdAt || new Date().toISOString(),
        read: existing?.read ?? Boolean(notification.read),
        sourceKey: notification.sourceKey,
      } satisfies AppNotification;
    });

  state[userId] = {
    notifications: normalizeNotifications([...mergedDerivedNotifications, ...nonDerivedNotifications]),
    dismissedSourceKeys: bucket.dismissedSourceKeys,
  };

  writeNotificationState(state);
}

export function markStoredNotificationRead(userId: string, notificationId: string) {
  if (!userId) {
    return;
  }

  const state = readNotificationState();
  const bucket = getUserBucket(state, userId);

  state[userId] = {
    notifications: bucket.notifications.map((notification) =>
      notification.id === notificationId ? { ...notification, read: true } : notification,
    ),
    dismissedSourceKeys: bucket.dismissedSourceKeys,
  };

  writeNotificationState(state);
}

export function deleteStoredNotification(userId: string, notificationId: string) {
  if (!userId) {
    return;
  }

  const state = readNotificationState();
  const bucket = getUserBucket(state, userId);
  const removedNotification = bucket.notifications.find((notification) => notification.id === notificationId);
  const nextDismissedSourceKeys =
    removedNotification?.sourceKey && !bucket.dismissedSourceKeys.includes(removedNotification.sourceKey)
      ? [...bucket.dismissedSourceKeys, removedNotification.sourceKey]
      : bucket.dismissedSourceKeys;

  state[userId] = {
    notifications: bucket.notifications.filter((notification) => notification.id !== notificationId),
    dismissedSourceKeys: nextDismissedSourceKeys,
  };

  writeNotificationState(state);
}

export function clearStoredNotifications(userId: string) {
  if (!userId) {
    return;
  }

  const state = readNotificationState();
  const bucket = getUserBucket(state, userId);
  const nextDismissedSourceKeys = Array.from(
    new Set([
      ...bucket.dismissedSourceKeys,
      ...bucket.notifications
        .map((notification) => notification.sourceKey)
        .filter((sourceKey): sourceKey is string => Boolean(sourceKey)),
    ]),
  );

  state[userId] = {
    notifications: [],
    dismissedSourceKeys: nextDismissedSourceKeys,
  };

  writeNotificationState(state);
}

export function getNotificationsUpdatedEventName() {
  return NOTIFICATIONS_UPDATED_EVENT;
}
