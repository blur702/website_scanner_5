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
    Table.init();
    Tabs.init();
    Form.init();
    Dropdown.init();
    
    // Define routes
    router.addRoute('/', function() {
        document.getElementById('view-container').innerHTML = '<h1>Welcome to Website Checker</h1>';
        fetch('/js/views/HomeView.js')
            .then(() => {
                const homeView = new HomeView();
                homeView.render();
            })
            .catch(error => {
                console.error("Error loading HomeView:", error);
            });
    });
    
    router.addRoute('/scan', function() {
        document.getElementById('view-container').innerHTML = '<h1>New Scan</h1>';
        fetch('/js/views/ScanView.js')
            .then(() => {
                const scanView = new ScanView();
                scanView.render();
            })
            .catch(error => {
                console.error("Error loading ScanView:", error);
            });
    });
    
    router.addRoute('/results', function() {
        document.getElementById('view-container').innerHTML = '<h1>Results</h1>';
        fetch('/js/views/ResultsView.js')
            .then(() => {
                const resultsView = new ResultsView();
                resultsView.render();
            })
            .catch(error => {
                console.error("Error loading ResultsView:", error);
            });
    });
    
    // Add database browser route
    router.addRoute('/db-browser', function() {
        document.getElementById('view-container').innerHTML = '<h1>Database Browser</h1>';
        fetch('/js/views/DbBrowserView.js')
            .then(() => {
                const dbBrowserView = new DbBrowserView();
                dbBrowserView.render();
            })
            .catch(error => {
                console.error("Error loading DbBrowserView:", error);
            });
    });
    
    // Initialize navigation
    const navigation = new Navigation();
    navigation.init();
    
    // Handle initial route
    router.handleRoute();
    
    // Handle navigation
    window.addEventListener('popstate', function() {
        router.handleRoute();
    });
});