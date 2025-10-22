import React from 'react';

const NotificationButton = ({ 
  unreadCount = 0, 
  onClick, 
  showDropdown = false, 
  children,
  className = '',
  style = {}
}) => {
  return (
    <div style={{ position: 'relative', ...style }}>
      <button
        onClick={onClick}
        className={`notification-btn ${className}`}
        aria-label="Notifications"
        style={{
          position: 'relative',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          boxShadow: unreadCount > 0 ? '0 0 0 2px #ef4444' : '0 2px 4px rgba(0,0,0,0.1)',
          width: '40px',
          height: '40px',
          minWidth: '40px',
          minHeight: '40px'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#2563eb';
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#3b82f6';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        {/* Bell Icon */}
        <span 
          style={{ 
            fontSize: '18px',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
            transition: 'transform 0.2s ease'
          }}
        >
          🔔
        </span>
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <span 
            className="notification-badge"
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: '#ef4444',
              color: 'white',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 'bold',
              border: '3px solid white',
              boxShadow: '0 3px 6px rgba(0,0,0,0.3), 0 0 0 1px rgba(239,68,68,0.2)',
              animation: 'notificationBounce 0.6s ease-out, pulse 2s infinite 0.6s',
              zIndex: 10,
              minWidth: '22px',
              minHeight: '22px'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      {/* Dropdown Content */}
      {showDropdown && children}
    </div>
  );
};

export default NotificationButton;
