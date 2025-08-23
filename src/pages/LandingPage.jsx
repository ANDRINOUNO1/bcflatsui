import { useNavigate } from 'react-router-dom'
import '../components/LandingPage.css'

const LandingPage = () => {
  const navigate = useNavigate()

  const handleLoginClick = () => {
    navigate('/login')
  }

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <h1>BCFlats</h1>
            <span>Your Home Away From Home</span>
          </div>
          <button className="login-btn" onClick={handleLoginClick}>
            Login
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Welcome to BCFlats</h1>
          <p>Premium dormitory living in the heart of the city</p>
          <div className="hero-features">
            <div className="feature">
              <span className="feature-icon">🏠</span>
              <span>Comfortable Rooms</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🔒</span>
              <span>Secure Building</span>
            </div>
            <div className="feature">
              <span className="feature-icon">📍</span>
              <span>Prime Location</span>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about">
        <div className="about-content">
          <h2>About BCFlats</h2>
          <p>
            BCFlats offers modern, comfortable dormitory living with all the amenities 
            you need for a great student experience. Our room-based dormitory system 
            provides privacy and convenience in a secure, well-maintained building.
          </p>
          <div className="amenities">
            <h3>Our Amenities</h3>
            <div className="amenities-grid">
              <div className="amenity">
                <span className="amenity-icon">🛏️</span>
                <h4>Furnished Rooms</h4>
                <p>Comfortable beds and study areas</p>
              </div>
              <div className="amenity">
                <span className="amenity-icon">🚿</span>
                <h4>Clean Facilities</h4>
                <p>Modern bathrooms and common areas</p>
              </div>
              <div className="amenity">
                <span className="amenity-icon">📶</span>
                <h4>High-Speed WiFi</h4>
                <p>Fast internet throughout the building</p>
              </div>
              <div className="amenity">
                <span className="amenity-icon">🏋️</span>
                <h4>Study Areas</h4>
                <p>Quiet spaces for academic focus</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-content">
          <h2>Ready to Join BCFlats?</h2>
          <p>Start your journey with us today</p>
          <button className="cta-btn" onClick={handleLoginClick}>
            Get Started
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2024 BCFlats. All rights reserved.</p>
          <p>Contact: info@bcflats.com | Phone: (123) 456-7890</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
