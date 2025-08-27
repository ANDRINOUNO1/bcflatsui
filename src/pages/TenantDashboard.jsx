import { useState } from 'react';
import { Link } from 'react-router-dom';
import { maintenanceService } from '../services/maintenanceService';

const Section = ({ title, children }) => (
  <div className="profile-section" style={{ marginBottom: 16 }}>
    <h4>{title}</h4>
    {children}
  </div>
);

const TenantDashboard = () => {
  const [message, setMessage] = useState('');

  return (
    <div className="dashboard-main">
      <h2>Welcome back!</h2>
      <p>Here’s an overview of your home and account.</p>

      <div className="info-grid" style={{ marginBottom: 16 }}>
        <div className="profile-section">
          <h4>Property Information</h4>
          <div className="info-grid">
            <div className="info-item"><span className="info-label">Address</span><span className="info-value">Main Building</span></div>
            <div className="info-item"><span className="info-label">Unit</span><span className="info-value">Your room</span></div>
            <div className="info-item"><span className="info-label">Lease</span><span className="info-value">Start — End</span></div>
          </div>
        </div>
        <div className="profile-section">
          <h4>Upcoming Events / Notices</h4>
          <ul style={{ margin: 0 }}>
            <li>Fire drill — next week</li>
            <li>Water maintenance — floor schedule</li>
          </ul>
        </div>
      </div>

      <Section title="Financial Information">
        <div className="info-grid">
          <div className="info-item"><span className="info-label">Outstanding</span><span className="info-value">$0.00</span></div>
          <div className="info-item"><span className="info-label">Next Due</span><span className="info-value">1st of next month</span></div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-primary">Pay Now</button>
          <button className="btn-secondary">Manage Payment Methods</button>
        </div>
      </Section>

      <Section title="Maintenance & Support">
        <p className="requirements-text">Submit repair requests and track progress.</p>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn-primary" to="/tenant/maintenance">Request Maintenance</Link>
          <Link className="btn-secondary" to="/tenant/maintenance">View Requests</Link>
        </div>
      </Section>

      <Section title="Lease & Documents">
        <div className="info-grid">
          <div className="info-item"><span className="info-label">Lease</span><span className="info-value">Start — End</span></div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-secondary">View Lease</button>
          <button className="btn-secondary">Renew Lease</button>
        </div>
      </Section>

      <Section title="Community & Events">
        <ul style={{ margin: 0 }}>
          <li>Building announcement — Welcome!</li>
          <li>Community board — Buy/Sell/Share</li>
          <li>Event calendar — Movie night</li>
        </ul>
      </Section>
    </div>
  );
};

export default TenantDashboard;


