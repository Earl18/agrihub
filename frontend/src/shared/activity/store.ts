export type UserActivity = {
  id: string;
  userId: string;
  description: string;
  status: 'completed' | 'confirmed' | 'pending';
  createdAt: string;
};

const STORAGE_KEY = 'agrihub_user_activities';

function canUseStorage() {
  return typeof window !== 'undefined';
}

function readAllActivities() {
  if (!canUseStorage()) {
    return [] as UserActivity[];
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as UserActivity[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAllActivities(activities: UserActivity[]) {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  window.dispatchEvent(new Event('agrihub:activities-updated'));
}

export function getStoredActivities(userId: string) {
  return readAllActivities()
    .filter((activity) => activity.userId === userId)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function addStoredActivity(userId: string, activity: Omit<UserActivity, 'id' | 'userId' | 'createdAt'> & { createdAt?: string }) {
  const nextActivity: UserActivity = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    description: activity.description,
    status: activity.status,
    createdAt: activity.createdAt || new Date().toISOString(),
  };

  const activities = [nextActivity, ...readAllActivities()].slice(0, 200);
  writeAllActivities(activities);
}

export function getActivitiesUpdatedEventName() {
  return 'agrihub:activities-updated';
}
