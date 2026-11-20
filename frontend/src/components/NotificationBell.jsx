import { useState, useEffect, useRef } from 'react';
import { Bell, X, Package, MessageCircle, AlertCircle } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function NotificationBell() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user]);

  useEffect(() => {
    if (socket && user) {
      socket.on('new_notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      socket.on('message_reply', (message) => {
        const notification = {
          type: 'message_reply',
          title: 'New Reply to Your Message',
          message: `Admin has replied to your message: ${message.subject}`,
          createdAt: new Date()
        };
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });
    }

    return () => {
      if (socket) {
        socket.off('new_notification');
        socket.off('message_reply');
      }
    };
  }, [socket, user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
      if (!token) return;
      
      const { data } = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
      if (!token) return;
      
      const { data } = await axios.get('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'receipt_rejected': return <AlertCircle size={18} className="text-red-500 flex-shrink-0" />;
      case 'order_status': return <Package size={18} className="text-blue-500 flex-shrink-0" />;
      case 'message_reply': return <MessageCircle size={18} className="text-green-500 flex-shrink-0" />;
      default: return <Bell size={18} className="text-gold flex-shrink-0" />;
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
      if (!token) return;
      
      await axios.put(
        `/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
      if (!token) return;
      
      await axios.put(
        '/api/notifications/mark-all-read',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // ✅ FIXED: Admin vs User navigation
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }

    // ✅ Admin ko admin pages par bhejo
    if (user?.role === 'admin') {
      if (notification.type === 'message_reply' || notification.title?.includes('Contact Message')) {
        navigate('/admin/messages');
      } else if (notification.orderId) {
        navigate(`/admin/orders/${notification.orderId}`);
      } else if (notification.type === 'receipt_rejected') {
        navigate('/admin/orders');
      } else {
        navigate('/admin');
      }
    } else {
      // ✅ User ko user pages par bhejo
      if (notification.orderId) {
        navigate('/profile', { state: { tab: 'orders' } });
      } else if (notification.type === 'message_reply') {
        navigate('/contact', { state: { showMessages: true } });
      } else if (notification.type === 'receipt_rejected') {
        navigate('/profile', { state: { tab: 'orders' } });
      }
    }
    
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-700 dark:text-ivory hover:text-gold transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setShowDropdown(false)}
          />
          
          <div className={`
            absolute z-50 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden
            md:absolute md:right-0 md:mt-2 md:w-96
            left-1/2 -translate-x-1/2 top-full mt-2 w-[calc(100vw-2rem)] max-w-sm
          `}>
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-ivory text-sm sm:text-base">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-gold hover:text-yellow-600 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[60vh] md:max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 sm:p-4 border-b border-gray-100 dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors ${
                      !notification.read ? 'bg-gold/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-xs sm:text-sm ${
                          !notification.read ? 'text-gray-900 dark:text-ivory' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-gold rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}