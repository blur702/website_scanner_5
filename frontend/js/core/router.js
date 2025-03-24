// Simple client-side router for single-page application

const router = {
  routes: {},
  
  // Register a route handler
  addRoute: function(path, handler) {
    this.routes[path] = handler;
  },
  
  // Navigate to a route and update history
  navigate: function(path) {
    console.log(`Navigating to: ${path}`);
    history.pushState(null, null, path);
    this.handleRoute();
  },
  
  // Handle the current route based on window location
  handleRoute: function() {
    const path = window.location.pathname;
    console.log(`Handling route: ${path}`);
    
    // Find exact match first
    if (this.routes[path]) {
      this.routes[path]();
      return;
    }
    
    // Check for parameterized routes like /results/:id
    for (const route in this.routes) {
      if (route.includes(':') && this._matchesPattern(path, route)) {
        const params = this._extractParams(path, route);
        this.routes[route](params);
        return;
      }
    }
    
    // If no route matched, try root route or show 404
    if (this.routes['/']) {
      this.routes['/']();
    } else {
      console.error(`No route found for path: ${path}`);
      document.getElementById('view-container').innerHTML = `
        <div class="card">
          <div class="card-header">
            <h1 class="card-title">Page Not Found</h1>
          </div>
          <div class="card-body">
            <p>The page you requested could not be found.</p>
            <button class="btn btn-primary" onclick="router.navigate('/')">Go Home</button>
          </div>
        </div>
      `;
    }
  },
  
  // Check if a path matches a route pattern with parameters
  _matchesPattern: function(path, pattern) {
    const pathParts = path.split('/').filter(Boolean);
    const patternParts = pattern.split('/').filter(Boolean);
    
    if (pathParts.length !== patternParts.length) {
      return false;
    }
    
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        continue; // This is a parameter, it matches anything
      }
      
      if (patternParts[i] !== pathParts[i]) {
        return false;
      }
    }
    
    return true;
  },
  
  // Extract parameters from a matched route
  _extractParams: function(path, pattern) {
    const params = {};
    const pathParts = path.split('/').filter(Boolean);
    const patternParts = pattern.split('/').filter(Boolean);
    
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        const paramName = patternParts[i].substring(1);
        params[paramName] = pathParts[i];
      }
    }
    
    return params;
  }
};

window.router = router;