import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppRoutes from './routes/AppRoutes'
import './App.css'
import './components/BootstrapOverrides.css'

function App() {
  // Handle routing for static sites
  React.useEffect(() => {
    const handleRouteChange = () => {
      // Check if the current path exists in our routes
      const validRoutes = ['/', '/login', '/dashboard', '/tenant', '/accounting', '/super-admin', '/admin/maintenance', '/admin/pricing', '/archived-tenants', '/tenant/maintenance', '/404'];
      const currentPath = window.location.pathname;
      
      // If it's not a valid route and not an asset, redirect to 404
      if (!validRoutes.includes(currentPath) && !currentPath.startsWith('/assets/') && !currentPath.startsWith('/bclogo.jpg') && !currentPath.startsWith('/samplepic.jpg') && !currentPath.startsWith('/vite.svg')) {
        // Redirect to 404 page
        window.location.replace('/404');
      }
    };

    // Check on initial load
    handleRouteChange();

    // Listen for route changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
