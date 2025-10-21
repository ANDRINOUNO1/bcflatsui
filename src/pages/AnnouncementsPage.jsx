import React, { useState, useEffect } from 'react'
import { notificationService } from '../services/notificationService'

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([])
  const [allAnnouncements, setAllAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    roles: ['Admin', 'SuperAdmin', 'Accounting', 'Tenant']
  })
  const [sending, setSending] = useState(false)

  const availableRoles = ['Admin', 'SuperAdmin', 'Accounting', 'Tenant']

  useEffect(() => {
    loadAnnouncements()
    loadAllAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const notifications = await notificationService.fetchMyNotifications(50)
      // Filter for announcements
      const announcementNotifications = notifications.filter(notif => 
        notif.type === 'announcement' || notif.metadata?.isAnnouncement
      )
      setAnnouncements(announcementNotifications)
    } catch (err) {
      setError(err.message || 'Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  const loadAllAnnouncements = async () => {
    try {
      const announcements = await notificationService.getAllAnnouncements()
      setAllAnnouncements(announcements)
    } catch (err) {
      console.error('Failed to load all announcements:', err)
    }
  }

  const handleSendAnnouncement = async (e) => {
    e.preventDefault()
    
    if (!newAnnouncement.title || !newAnnouncement.message) {
      setError('Title and message are required')
      return
    }

    if (newAnnouncement.roles.length === 0) {
      setError('Please select at least one role')
      return
    }

    setSending(true)
    setError('')
    
    try {
      await notificationService.broadcastAnnouncement(
        newAnnouncement.title,
        newAnnouncement.message,
        newAnnouncement.roles
      )
      
      // Reset form
      setNewAnnouncement({
        title: '',
        message: '',
        roles: ['Admin', 'SuperAdmin', 'Accounting', 'Tenant']
      })
      
      // Reload announcements
      await loadAnnouncements()
      await loadAllAnnouncements()
      
      alert('Announcement sent successfully!')
    } catch (err) {
      setError(err.message || 'Failed to send announcement')
    } finally {
      setSending(false)
    }
  }

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
      return
    }

    try {
      await notificationService.deleteAnnouncement(announcementId)
      await loadAllAnnouncements()
      alert('Announcement deleted successfully!')
    } catch (err) {
      setError(err.message || 'Failed to delete announcement')
    }
  }

  const handleSuspendAnnouncement = async (announcementId, suspended) => {
    try {
      await notificationService.suspendAnnouncement(announcementId, suspended)
      await loadAllAnnouncements()
      alert(`Announcement ${suspended ? 'suspended' : 'unsuspended'} successfully!`)
    } catch (err) {
      setError(err.message || 'Failed to update announcement status')
    }
  }

  const toggleRole = (role) => {
    setNewAnnouncement(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }))
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="dashboard-screen">
        <div className="dash-container">
          <div className="loading-spinner">Loading announcements...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-screen">
      <div className="dash-container">
        {/* Header */}
        <div className="dashboard-header-gradient">
          <div className="dash-header-row">
            <div>
              <h1 className="dash-title">📢 Announcements</h1>
              <p className="dash-subtitle">
                Manage and send announcements to users across the system.
              </p>
            </div>
            <button
              onClick={() => {
                loadAnnouncements()
                loadAllAnnouncements()
              }}
              disabled={loading}
              className="btn-primary refresh-btn"
            >
              {loading ? 'Refreshing...' : 'Refresh 🔄'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-danger" style={{ margin: '1rem 0' }}>
            {error}
          </div>
        )}

        {/* Two Column Layout */}
        <div className="announcements-layout">
          {/* Left Column - Send New Announcement */}
          <div className="announcements-left">
            <div className="card">
              <div className="card-header">
                <h3>📤 Send New Announcement</h3>
              </div>
              <div className="card-body">
                <form onSubmit={handleSendAnnouncement}>
                  <div className="form-group">
                    <label htmlFor="title">Announcement Title</label>
                    <input
                      type="text"
                      id="title"
                      className="form-input"
                      value={newAnnouncement.title}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter announcement title..."
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="message">Message</label>
                    <textarea
                      id="message"
                      className="form-input"
                      rows="4"
                      value={newAnnouncement.message}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Enter your announcement message..."
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Target Roles</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
                      {availableRoles.map(role => (
                        <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={newAnnouncement.roles.includes(role)}
                            onChange={() => toggleRole(role)}
                          />
                          <span>{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={sending || newAnnouncement.roles.length === 0}
                    >
                      {sending ? '📤 Sending...' : '📢 Send Announcement'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setNewAnnouncement({
                        title: '',
                        message: '',
                        roles: ['Admin', 'SuperAdmin', 'Accounting', 'Tenant']
                      })}
                    >
                      Clear
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Recent Announcements */}
            <div className="card">
              <div className="card-header">
                <h3>📋 Recent Announcements</h3>
              </div>
              <div className="card-body">
                {announcements.length === 0 ? (
                  <div className="empty-state">
                    <p>No announcements found.</p>
                  </div>
                ) : (
                  <div className="announcements-list">
                    {announcements.map((announcement, index) => (
                      <div key={announcement.id || index} className="announcement-item">
                        <div className="announcement-header">
                          <h4 className="announcement-title">{announcement.title}</h4>
                          <span className="announcement-date">
                            {formatDate(announcement.createdAt)}
                          </span>
                        </div>
                        <div className="announcement-content">
                          <p>{announcement.message}</p>
                        </div>
                        <div className="announcement-meta">
                          <span className="announcement-type">📢 Announcement</span>
                          {announcement.metadata?.createdByName && (
                            <span className="announcement-author">
                              By: {announcement.metadata.createdByName}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - All Announcements Management */}
          <div className="announcements-right">
            <div className="card">
              <div className="card-header">
                <h3>📊 Manage All Announcements</h3>
              </div>
              <div className="card-body">
                {allAnnouncements.length === 0 ? (
                  <div className="empty-state">
                    <p>No announcements to manage.</p>
                  </div>
                ) : (
                  <div className="announcements-management-list">
                    {allAnnouncements.map((announcement, index) => (
                      <div key={announcement.id || index} className="announcement-management-item">
                        <div className="announcement-management-header">
                          <h4 className="announcement-management-title">{announcement.title}</h4>
                          <div className="announcement-status">
                            <span className={`status-badge ${announcement.metadata?.suspended ? 'suspended' : 'active'}`}>
                              {announcement.metadata?.suspended ? '⏸️ Suspended' : '✅ Active'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="announcement-management-content">
                          <p>{announcement.message}</p>
                        </div>
                        
                        <div className="announcement-management-meta">
                          <div className="announcement-info">
                            <span className="announcement-date">
                              📅 {formatDate(announcement.createdAt)}
                            </span>
                            <span className="announcement-roles">
                              👥 {announcement.targetRoles?.join(', ') || 'All Roles'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="announcement-actions">
                          <button
                            className={`btn-action ${announcement.metadata?.suspended ? 'btn-warning' : 'btn-info'}`}
                            onClick={() => handleSuspendAnnouncement(announcement.id, !announcement.metadata?.suspended)}
                          >
                            {announcement.metadata?.suspended ? '▶️ Unsuspend' : '⏸️ Suspend'}
                          </button>
                          <button
                            className="btn-action btn-danger"
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .announcements-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-top: 2rem;
        }

        .announcements-left {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .announcements-right {
          display: flex;
          flex-direction: column;
        }

        .announcements-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .announcements-management-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .announcement-item {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
          background: #f9fafb;
        }

        .announcement-management-item {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
          background: #f9fafb;
        }

        .announcement-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .announcement-management-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .announcement-title {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1f2937;
        }

        .announcement-management-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
        }

        .announcement-date {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .announcement-content {
          margin-bottom: 0.75rem;
        }

        .announcement-management-content {
          margin-bottom: 0.75rem;
        }

        .announcement-content p {
          margin: 0;
          color: #374151;
          line-height: 1.5;
        }

        .announcement-management-content p {
          margin: 0;
          color: #374151;
          line-height: 1.5;
          font-size: 0.9rem;
        }

        .announcement-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .announcement-management-meta {
          margin-bottom: 1rem;
        }

        .announcement-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .announcement-type {
          background: #dbeafe;
          color: #1e40af;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-weight: 500;
        }

        .announcement-author {
          font-style: italic;
        }

        .announcement-status {
          display: flex;
          align-items: center;
        }

        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .status-badge.active {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.suspended {
          background: #fef3c7;
          color: #92400e;
        }

        .announcement-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .btn-action {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-action.btn-info {
          background: #dbeafe;
          color: #1e40af;
        }

        .btn-action.btn-info:hover {
          background: #bfdbfe;
        }

        .btn-action.btn-warning {
          background: #fef3c7;
          color: #92400e;
        }

        .btn-action.btn-warning:hover {
          background: #fde68a;
        }

        .btn-action.btn-danger {
          background: #fecaca;
          color: #dc2626;
        }

        .btn-action.btn-danger:hover {
          background: #fca5a5;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .alert {
          padding: 1rem;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }

        .alert-danger {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
        }

        @media (max-width: 768px) {
          .announcements-layout {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  )
}

export default AnnouncementsPage
