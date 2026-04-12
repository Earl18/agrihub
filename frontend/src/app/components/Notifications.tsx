import { X, CheckCircle, AlertCircle, Info, Trash2, Bell } from 'lucide-react';

interface Notification {
  id: number;
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  onClearAll: () => void;
}

export function Notifications({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onDelete,
  onClearAll,
}: NotificationsProps) {
  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-white/30 z-40 backdrop-blur-md transition-opacity"
        onClick={onClose}
      ></div>

      {/* Notification Panel */}
      <div className="fixed top-0 right-0 h-full w-full md:w-96 bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Notifications</h2>
              <p className="text-xs text-green-100">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="p-4 border-b border-gray-100 flex justify-between bg-gray-50">
            <button
              onClick={onClearAll}
              className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={() => notifications.forEach(n => !n.read && onMarkAsRead(n.id))}
              className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              Mark All as Read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-12 h-12 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-600">No notifications</p>
              <p className="text-sm text-gray-400">You're all caught up!</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-2xl hover:shadow-md transition-all duration-200 cursor-pointer ${
                    !notification.read ? 'bg-white border-2 border-green-100' : 'bg-white border border-gray-100'
                  }`}
                  onClick={() => !notification.read && onMarkAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-xl ${
                      notification.type === 'success' ? 'bg-green-100' :
                      notification.type === 'warning' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                      {notification.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                      {notification.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-sm text-gray-900">{notification.title}</h3>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">{notification.time}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(notification.id);
                      }}
                      className="p-2 hover:bg-red-50 rounded-xl transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}