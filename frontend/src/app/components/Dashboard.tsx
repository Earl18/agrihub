import { useEffect, useState } from 'react';
import { TrendingUp, Users, Truck, DollarSign, AlertCircle } from 'lucide-react';
import { getDashboardData } from '../../features/app/api';
import { getStoredActivities, getActivitiesUpdatedEventName } from '../../shared/activity/store';
import { getSessionUser } from '../../shared/auth/session';

const icons: Record<string, any> = {
  DollarSign,
  Truck,
  Users,
  TrendingUp,
};

const toneClasses: Record<string, string> = {
  sales: 'from-green-500 to-emerald-600',
  purchases: 'from-blue-500 to-blue-600',
  workers: 'from-violet-500 to-fuchsia-600',
  services: 'from-orange-500 to-orange-600',
  laborer: 'from-teal-500 to-cyan-600',
};

export function Dashboard() {
  const [stats, setStats] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());

  const getStatCardSpan = () => {
    if (stats.length === 1) {
      return 'xl:col-span-12';
    }

    if (stats.length === 2) {
      return 'xl:col-span-6';
    }

    if (stats.length === 3) {
      return 'xl:col-span-4';
    }

    return 'xl:col-span-3';
  };

  const statCardSpanClass = getStatCardSpan();

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const syncDashboard = () => {
      const sessionUser = getSessionUser();

      getDashboardData()
        .then((payload) => {
          const serverActivities = Array.isArray(payload.recentActivities) ? payload.recentActivities : [];
          const localActivities = sessionUser?.id ? getStoredActivities(sessionUser.id) : [];
          const mergedActivities = [...serverActivities, ...localActivities]
            .filter((activity) => activity?.description && activity?.createdAt)
            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
          const seen = new Set<string>();
          const uniqueActivities = mergedActivities.filter((activity) => {
            const key = `${activity.description}|${activity.createdAt}`;

            if (seen.has(key)) {
              return false;
            }

            seen.add(key);
            return true;
          });

          setStats(payload.stats || []);
          setRecentActivities(uniqueActivities);
          setUpcomingTasks(payload.upcomingTasks || []);
        })
        .catch(() => undefined);
    };

    syncDashboard();
    window.addEventListener(getActivitiesUpdatedEventName(), syncDashboard);

    return () => {
      window.removeEventListener(getActivitiesUpdatedEventName(), syncDashboard);
    };
  }, []);

  const formatRelativeTime = (value: string) => {
    const timestamp = new Date(value).getTime();

    if (Number.isNaN(timestamp)) {
      return 'Just now';
    }

    const diffMs = Math.max(0, now - timestamp);
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 10) {
      return 'Just now';
    }

    if (diffSeconds < 60) {
      return `${diffSeconds} seconds ago`;
    }

    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffMinutes < 60) {
      return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }

    const diffDays = Math.floor(diffHours / 24);

    if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl ${statCardSpanClass}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-green-600 font-medium">{stat.change}</p>
              </div>
              {(() => {
                const Icon = icons[stat.icon] || DollarSign;
                const gradientClasses = toneClasses[stat.tone] || toneClasses.purchases;
                return (
              <div className={`bg-gradient-to-br ${gradientClasses} p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
              </div>
                );
              })()}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:h-[32rem] flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.status === 'completed' ? 'bg-green-500' :
                    activity.status === 'confirmed' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(activity.createdAt)}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    activity.status === 'completed' ? 'bg-green-100 text-green-700' :
                    activity.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:h-[32rem] flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-start space-x-3 flex-1">
                    <AlertCircle className={`w-5 h-5 mt-0.5 ${
                      task.priority === 'high' ? 'text-red-500' :
                      task.priority === 'medium' ? 'text-yellow-500' : 'text-gray-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{task.task}</p>
                      <p className="text-xs text-gray-500 mt-1">{task.date}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
