// frontend/js/core/router.js
// Client-side router for single-page application

const router = {
  routes: {},
  notFoundHandler: null,
  
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

  // Register a 404 handler
  add404Handler: function(handler) {
    this.notFoundHandler = handler;
  },
  
  // Handle the current route based on window location
  handleRoute: function() {
    const path = window.location.pathname;
    console.log(`Handling route: ${path}`);
    
    // Find exact route match first
    if (this.routes[path]) {
      this.routes[path]();
      return;
    }
    
    // Check for parameterized routes
    let matchedParameterizedRoute = false;
    for (const route in this.routes) {
      if (route.indexOf(':') !== -1 && this._matchesPattern(path, route)) {
        const params = this._extractParams(path, route);
        this.routes[route](params);
        matchedParameterizedRoute = true;
        return;
      }
    }
    
    // Try default route if no specific route matched
    if (this.routes['/']) {
      this.routes['/']();
    } 
    // Use 404 handler if registered
    else if (this.notFoundHandler) {
      console.error(`No route found for path: ${path}`);
      this.notFoundHandler();
    }
    // Fallback 404 handling
    else {
      console.error(`No route or 404 handler found for path: ${path}`);
      if (document.getElementById('view-container')) {
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
  },

  // Initialize popstate event listener
  init: function() {
    window.addEventListener('popstate', () => {
      this.handleRoute();
    });
  }
};

window.router = router;