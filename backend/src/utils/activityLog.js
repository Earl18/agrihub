const MAX_ACTIVITY_ITEMS = 100;

export function appendActivity(user, activity) {
  if (!user || !activity?.description) {
    return;
  }

  const nextEntry = {
    description: String(activity.description).trim(),
    status: activity.status || 'confirmed',
    createdAt: activity.createdAt || new Date(),
  };

  if (!nextEntry.description) {
    return;
  }

  const currentLog = Array.isArray(user.activityLog) ? user.activityLog : [];
  user.activityLog = [nextEntry, ...currentLog].slice(0, MAX_ACTIVITY_ITEMS);
}

export function buildDerivedActivities(user) {
  const activities = [];

  if (user?.createdAt) {
    activities.push({
      description: 'Created an AgriHub account',
      status: 'completed',
      createdAt: user.createdAt,
    });
  }

  if (user?.verification?.seller?.submittedAt) {
    activities.push({
      description: 'Submitted seller verification',
      status: user.verification.seller.status === 'verified' ? 'completed' : 'pending',
      createdAt: user.verification.seller.submittedAt,
    });
  }

  if (user?.verification?.laborer?.submittedAt) {
    activities.push({
      description: 'Submitted laborer verification',
      status: user.verification.laborer.status === 'verified' ? 'completed' : 'pending',
      createdAt: user.verification.laborer.submittedAt,
    });
  }

  return activities;
}

export function getUserActivities(user) {
  const storedActivities = Array.isArray(user?.activityLog) ? user.activityLog : [];
  const derivedActivities = buildDerivedActivities(user);
  const seen = new Set();

  return [...storedActivities, ...derivedActivities]
    .filter((activity) => activity?.description && activity?.createdAt)
    .filter((activity) => {
      const key = `${activity.description}|${new Date(activity.createdAt).toISOString()}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}
