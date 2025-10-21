import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppRoutes from './routes/AppRoutes'
import './App.css'
import './components/BootstrapOverrides.css'

function App() {
  // Handle routing for static sites - more comprehensive approach
  React.useEffect(() => {
    const handleInvalidRoute = () => {
      const currentPath = window.location.pathname;
      
      // List of all valid routes
      const validRoutes = [
        '/', '/login', '/dashboard', '/tenant', '/accounting', 
        '/super-admin', '/admin/maintenance', '/admin/pricing', 
        '/archived-tenants', '/tenant/maintenance', '/404'
      ];
      
      // Check if it's an asset file
      const isAsset = currentPath.startsWith('/assets/') || 
                     currentPath.includes('.') && 
                     (currentPath.endsWith('.js') || 
                      currentPath.endsWith('.css') || 
                      currentPath.endsWith('.jpg') || 
                      currentPath.endsWith('.png') || 
                      currentPath.endsWith('.svg') || 
                      currentPath.endsWith('.ico'));
      
      // If it's not a valid route and not an asset, redirect to 404
      if (!validRoutes.includes(currentPath) && !isAsset) {
        // Use window.location.replace to avoid history issues
        window.location.replace('/404');
      }
    };

    // Check immediately
    handleInvalidRoute();

    // Also check when the page loads
    window.addEventListener('load', handleInvalidRoute);
    
    return () => {
      window.removeEventListener('load', handleInvalidRoute);
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
