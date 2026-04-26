import { useEffect, useState } from 'react';
import { TrendingUp, Users, Truck, DollarSign, AlertCircle } from 'lucide-react';
import { getDashboardData } from '../../features/app/api';

const icons: Record<string, any> = {
  DollarSign,
  Truck,
  Users,
  TrendingUp,
};

export function Dashboard() {
  const [stats, setStats] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [roleSections, setRoleSections] = useState<any[]>([]);

  useEffect(() => {
    getDashboardData()
      .then((payload) => {
        setStats(payload.stats || []);
        setRecentActivities(payload.recentActivities || []);
        setUpcomingTasks(payload.upcomingTasks || []);
        setRoleSections(payload.roleSections || []);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${stats.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
        {stats.map((stat, index) => (
          <div key={index} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-green-600 font-medium">{stat.change}</p>
              </div>
              {(() => {
                const Icon = icons[stat.icon] || DollarSign;
                return (
              <div className={`bg-gradient-to-br ${stat.color} p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.status === 'completed' ? 'bg-green-500' :
                    activity.status === 'confirmed' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h3>
          </div>
          <div className="p-6">
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

      {roleSections.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Role Dashboards</h3>
            <p className="text-sm text-gray-500">Your buyer account is always active, and verified roles are merged here.</p>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {roleSections.map((section) => (
              <div key={section.role} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="mb-5">
                  <h4 className="text-lg font-semibold text-gray-900">{section.title}</h4>
                  <p className="text-sm text-gray-500 mt-1">{section.description}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {section.stats.map((stat: any) => (
                    <div key={stat.label} className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {section.highlights.map((highlight: string, index: number) => (
                    <div key={index} className="rounded-xl border border-gray-100 px-4 py-3 text-sm text-gray-600">
                      {highlight}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
