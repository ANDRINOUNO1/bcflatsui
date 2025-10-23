import React, { useState, useEffect } from 'react';

const NotificationDropdown = ({ 
  notifications = [], 
  unreadCount = 0, 
  markingAsRead = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // Allow animation to complete
  };

  return (
    <>
      {/* Enhanced Overlay */}
      <div 
        className={`notification-overlay ${isVisible ? 'visible' : ''}`}
        onClick={handleClose}
      />
      
      {/* Enhanced Dropdown */}
      <div className={`notification-dropdown ${isVisible ? 'visible' : ''}`}>
        {/* Enhanced Header */}
        <div className="notification-header">
          <div className="notification-header-content">
            <span className="notification-title">Notifications</span>
            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              disabled={markingAsRead}
              className="mark-all-read-btn"
              title="Mark all notifications as read"
            >
              <span>{markingAsRead ? '⏳' : '✓'}</span>
              <span>{markingAsRead ? 'Marking All...' : 'Mark All Read'}</span>
            </button>
          )}
        </div>
        
        {/* Enhanced Content */}
        <div className="notification-content">
          {notifications.length === 0 ? (
            <div className="notification-empty">
              <div className="empty-icon">📭</div>
              <div className="empty-text">No notifications yet</div>
              <div className="empty-subtext">You'll see important updates here</div>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((n, index) => (
                <div 
                  key={n.id} 
                  className={`notification-item ${n.isRead ? 'read' : 'unread'}`}
                  onClick={() => !n.isRead && onMarkAsRead(n.id)}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Enhanced Unread indicator */}
                  {!n.isRead && <div className="unread-indicator" />}
                  
                  {/* Enhanced Notification content */}
                  <div className="notification-text-content">
                    <div className="notification-item-title">
                      {n.title}
                    </div>
                    <div className="notification-item-message">
                      {n.message}
                    </div>
                    <div className="notification-item-time">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Enhanced Mark Read Button */}
                  {!n.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead(n.id);
                      }}
                      disabled={markingAsRead}
                      className="mark-read-btn"
                      title="Mark this notification as read"
                    >
                      <span>✓</span>
                      <span>{markingAsRead ? 'Marking...' : 'Mark Read'}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationDropdown;