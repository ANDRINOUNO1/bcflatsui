import React from 'react';

const NotificationDropdown = ({ 
  notifications = [], 
  unreadCount = 0, 
  markingAsRead = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose
}) => {
  return (
    <>
      {/* Overlay */}
      <div 
        style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 10 
        }}
        onClick={onClose}
      />
      
      {/* Dropdown */}
      <div 
        style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          width: '380px',
          maxHeight: '500px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb',
          zIndex: 20,
          overflow: 'hidden',
          marginTop: '8px'
        }}
      >
        {/* Header */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e5e7eb'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔔</span>
            <span style={{ fontSize: '16px', fontWeight: '600' }}>Notifications</span>
            {unreadCount > 0 && (
              <span 
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              disabled={markingAsRead}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: markingAsRead ? 'not-allowed' : 'pointer',
                opacity: markingAsRead ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!markingAsRead) {
                  e.target.style.background = 'rgba(255,255,255,0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!markingAsRead) {
                  e.target.style.background = 'rgba(255,255,255,0.2)';
                }
              }}
            >
              {markingAsRead ? '⏳' : '✓'} Mark All Read
            </button>
          )}
        </div>
        
        {/* Content */}
        <div 
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '8px 0'
          }}
        >
          {notifications.length === 0 ? (
            <div 
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
              <div>No notifications yet</div>
            </div>
          ) : notifications.map(n => (
            <div 
              key={n.id} 
              style={{
                padding: '12px 20px',
                borderBottom: '1px solid #f3f4f6',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: n.isRead ? '#fff' : '#f8fafc',
                position: 'relative'
              }}
              onClick={() => !n.isRead && onMarkAsRead(n.id)}
              onMouseEnter={(e) => {
                e.target.style.background = n.isRead ? '#f9fafb' : '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = n.isRead ? '#fff' : '#f8fafc';
              }}
            >
              {!n.isRead && (
                <div 
                  style={{
                    position: 'absolute',
                    left: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '8px',
                    height: '8px',
                    background: '#3b82f6',
                    borderRadius: '50%'
                  }}
                />
              )}
              <div 
                style={{
                  fontWeight: n.isRead ? '500' : '600',
                  fontSize: '14px',
                  color: '#111827',
                  marginBottom: '4px',
                  marginLeft: n.isRead ? '0' : '16px'
                }}
              >
                {n.title}
              </div>
              <div 
                style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  marginBottom: '6px',
                  marginLeft: n.isRead ? '0' : '16px',
                  lineHeight: '1.4'
                }}
              >
                {n.message}
              </div>
              <div 
                style={{
                  fontSize: '11px',
                  color: '#9ca3af',
                  marginLeft: n.isRead ? '0' : '16px'
                }}
              >
                {new Date(n.createdAt).toLocaleString()}
              </div>
              {!n.isRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(n.id);
                  }}
                  disabled={markingAsRead}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '10px',
                    cursor: markingAsRead ? 'not-allowed' : 'pointer',
                    opacity: markingAsRead ? 0.6 : 1
                  }}
                >
                  ✓ Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default NotificationDropdown;
