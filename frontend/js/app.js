// frontend/js/app.js
// Main application file
// Handles application initialization and routing

/**
 * Main application object
 * Responsible for initializing the application and setting up routes
 */
window.app = {
  init: function() {
    console.log('App initialized');
    
    // Create the main layout and navigation structure
    Navigation.renderNavigation();
    
    // Now that the DOM elements exist, initialize components
    Navigation.init();
    
    // Initialize the default view
    HomeView.init();

    // Set up routes
    router.addRoute('/', HomeView.init);
    router.addRoute('/scan', ScanView.init);
    router.addRoute('/results', ResultsView.init);
    router.addRoute('/report', ReportView.init);
    router.addRoute('/search', SearchView.init);
    router.addRoute('/settings', SettingsView.init);

    // Handle the current route
    router.handleRoute();
  }
};

// The initialization is now handled in index.html
// document.addEventListener('DOMContentLoaded', app.init);

// Main application entry point
document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    if (window.Table) Table.init();
    if (window.Tabs) Tabs.init();
    if (window.Form) Form.init();
    if (window.Dropdown) Dropdown.init();
    if (window.Notification) Notification.init();
    
    // Define routes
    router.addRoute('/', function() {
        document.getElementById('view-container').innerHTML = '<h1>Welcome to Website Checker</h1>';
        if (window.HomeView) {
            HomeView.init();
        } else {
            console.error("HomeView component not loaded");
        }
    });
    
    router.addRoute('/scan', function() {
        document.getElementById('view-container').innerHTML = '<h1>New Scan</h1>';
        if (window.ScanView) {
            ScanView.init();
        } else {
            console.error("ScanView component not loaded");
        }
    });
    
    router.addRoute('/results', function() {
        document.getElementById('view-container').innerHTML = '<h1>Results</h1>';
        if (window.ResultsView) {
            ResultsView.init();
        } else {
            console.error("ResultsView component not loaded");
        }
    });
    
    router.addRoute('/search', function() {
        document.getElementById('view-container').innerHTML = '<h1>Search</h1>';
        if (window.SearchView) {
            SearchView.init();
        } else {
            console.error("SearchView component not loaded");
        }
    });
    
    // Add database browser route
    router.addRoute('/db-browser', function() {
        document.getElementById('view-container').innerHTML = '<h1>Database Browser</h1>';
        fetch('/js/views/DbBrowserView.js')
            .then(() => {
                if (window.DbBrowserView) {
                    const dbBrowserView = new DbBrowserView();
                    dbBrowserView.render();
                } else {
                    console.error("DbBrowserView component not loaded");
                }
            })
            .catch(error => {
                console.error("Error loading DbBrowserView:", error);
            });
    });
    
    router.addRoute('/settings', function() {
        document.getElementById('view-container').innerHTML = '<h1>Settings</h1>';
        if (window.SettingsView) {
            SettingsView.init();
        } else {
            console.error("SettingsView component not loaded");
        }
    });
    
    // Add 404 route handler
    router.add404Handler(function() {
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
    });
    
    // Initialize navigation
    if (window.Navigation) {
        Navigation.init();
    }
    
    router.handleRoute();
});