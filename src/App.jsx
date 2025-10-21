import React from 'react'
import { HashRouter as Router } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppRoutes from './routes/AppRoutes'
import './App.css'
import './components/BootstrapOverrides.css'

function App() {
  // Handle routing for static sites - hash router approach
  React.useEffect(() => {
    const currentPath = window.location.pathname;
    
    // If it's not the root path and not an asset, redirect to root with hash
    if (currentPath !== '/' && !currentPath.startsWith('/assets/') && !currentPath.startsWith('/bclogo.jpg') && !currentPath.startsWith('/samplepic.jpg') && !currentPath.startsWith('/vite.svg')) {
      // Convert path to hash and redirect to root
      const hashPath = currentPath;
      window.location.replace('/#' + hashPath);
    }
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
