import React from 'react';
import { Link } from 'react-router-dom';
import '../components/NotFoundPage.css';

const NotFoundPage = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="not-found-content">
          {/* Animated 404 Number */}
          <div className="error-number">
            <span className="four">4</span>
            <span className="zero">0</span>
            <span className="four">4</span>
          </div>
          
          {/* Error Message */}
          <div className="error-message">
            <h1>Oops! Page Not Found</h1>
            <p>
              The page you're looking for doesn't exist or has been moved. 
              Don't worry, let's get you back on track!
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="action-buttons">
            <Link to="/" className="btn btn-primary">
              <span className="btn-icon">🏠</span>
              Go to Home
            </Link>
            <Link to="/login" className="btn btn-secondary">
              <span className="btn-icon">🔐</span>
              Login Page
            </Link>
          </div>
          
          {/* Helpful Links */}
          <div className="helpful-links">
            <h3>Quick Links</h3>
            <div className="links-grid">
              <Link to="/" className="quick-link">
                <span className="link-icon">🏠</span>
                <span>Home</span>
              </Link>
              <Link to="/login" className="quick-link">
                <span className="link-icon">🔐</span>
                <span>Login</span>
              </Link>
              <Link to="/register" className="quick-link">
                <span className="link-icon">📝</span>
                <span>Register</span>
              </Link>
              <Link to="/dashboard" className="quick-link">
                <span className="link-icon">📊</span>
                <span>Dashboard</span>
              </Link>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="floating-elements">
            <div className="floating-icon">🏠</div>
            <div className="floating-icon">🔑</div>
            <div className="floating-icon">📱</div>
            <div className="floating-icon">💻</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
