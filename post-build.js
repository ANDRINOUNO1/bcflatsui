const fs = require('fs');
const path = require('path');

// This script will run after build to create HTML files for each route
const distPath = path.join(__dirname, 'dist');
const indexHtmlPath = path.join(distPath, 'index.html');

// Read the built index.html
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// List of routes that need HTML files
const routes = [
  'dashboard',
  'tenant', 
  'accounting',
  'super-admin',
  'admin/maintenance',
  'admin/pricing',
  'archived-tenants',
  'tenant/maintenance',
  'login'
];

// Create HTML files for each route
routes.forEach(route => {
  const routePath = path.join(distPath, route);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(routePath)) {
    fs.mkdirSync(routePath, { recursive: true });
  }
  
  // Write index.html for this route
  fs.writeFileSync(path.join(routePath, 'index.html'), indexHtml);
  console.log(`Created HTML file for route: /${route}`);
});

console.log('✅ Created HTML files for all routes');
