/**
 * Main Application Entry Point
 */
import router from './core/router.js';
import store from './core/store.js';
import api from './core/api.js';
import theme from './core/theme.js';
import { debounce } from './core/utils.js';

// View Components
import HomeView from './views/HomeView.js';
import ScanView from './views/ScanView.js';
import ReportView from './views/ReportView.js';
import SearchView from './views/SearchView.js';
import ResultsView from './views/ResultsView.js';
import SettingsView from './views/SettingsView.js';
import DbBrowserView from './views/DbBrowserView.js';
import ErrorView from './views/ErrorView.js';
import NotFoundView from './views/NotFoundView.js';

class App {
    constructor() {
        this.initialized = false;
        this.init();
    }

    async init() {
        console.log('App.init() called');
        try {
            await this.initializeCore();
            this.setupRoutes();
            this.setupEventListeners();
            this.setupApiInterceptors();
            await this.loadInitialData();
            this.handleInitialRoute();
            this.initialized = true;
        } catch (error) {
            console.error('Application initialization failed:', error);
            this.handleInitError(error);
        }
    }

    /**
     * Initialize core services
     */
    async initializeCore() {
        // Initialize theme
        theme.init();

        // Initialize store with persisted state
        const savedState = localStorage.getItem('app_state');
        if (savedState) {
            try {
                store.setState(JSON.parse(savedState));
            } catch (error) {
                console.error('Failed to load persisted state:', error);
            }
        }

        // Persist store changes
        store.subscribe('*', debounce(() => {
            localStorage.setItem('app_state', JSON.stringify(store.state));
        }, 1000));

        // Initialize API service
        api.addRequestInterceptor(config => {
            // Add auth token if available
            const token = store.get('auth.token');
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
            return config;
        });
    }

    /**
     * Set up application routes
     */
    setupRoutes() {
        router.register('/', HomeView);
        router.register('/scan', ScanView);
        router.register('/scan/:id', ScanView);
        router.register('/report/:id', ReportView);
        router.register('/search', SearchView);
        router.register('/results', ResultsView);
        router.register('/settings', SettingsView);
        router.register('/browser', DbBrowserView);
        router.register('/error', ErrorView);
        router.register('/404', NotFoundView);

        // Navigation guards
        router.beforeEach(async (path) => {
            // Check authentication
            const isAuthRequired = !['/', '/login', '/error', '/404'].includes(path);
            const isAuthenticated = store.get('auth.isAuthenticated');

            if (isAuthRequired && !isAuthenticated) {
                return '/login';
            }

            return true;
        });

        // Handle route changes
        router.use(async (route, previousRoute) => {
            // Update page title
            document.title = `${route.options.title || 'Website Checker'} - Website Analysis Tool`;

            // Track route changes
            if (previousRoute) {
                this.trackPageView(route.path);
            }
        });
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Handle network status
        window.addEventListener('online', () => {
            store.set('app.isOnline', true);
            if (store.get('app.hasNetworkError')) {
                this.retryFailedRequests();
            }
        });

        window.addEventListener('offline', () => {
            store.set('app.isOnline', false);
        });

        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            store.set('app.isVisible', document.visibilityState === 'visible');
            if (document.visibilityState === 'visible') {
                this.handleAppVisible();
            }
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k':
                        e.preventDefault();
                        router.navigate('/search');
                        break;
                    case '/':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                }
            }
        });
    }

    /**
     * Set up API interceptors
     */
    setupApiInterceptors() {
        // Handle API errors
        api.addErrorInterceptor(async (error) => {
            if (!error.response) {
                store.set('app.hasNetworkError', true);
                return;
            }

            switch (error.response.status) {
                case 401:
                    await this.handleUnauthorized();
                    break;
                case 403:
                    router.navigate('/error', { 
                        query: { message: 'Access Denied' }
                    });
                    break;
                case 404:
                    router.navigate('/404');
                    break;
                case 503:
                    store.set('app.maintenance', true);
                    break;
            }
        });
    }

    /**
     * Load initial application data
     */
    async loadInitialData() {
        try {
            const [settings, userData] = await Promise.all([
                api.get('/api/settings'),
                api.get('/api/user')
            ]);

            store.setState({
                settings: settings.data,
                user: userData.data
            });
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    /**
     * Handle application coming into view
     */
    async handleAppVisible() {
        if (store.get('app.maintenance')) {
            // Check if maintenance is over
            try {
                await api.get('/api/status');
                store.set('app.maintenance', false);
            } catch (error) {
                // Still in maintenance
            }
        }
    }

    /**
     * Handle unauthorized errors
     */
    async handleUnauthorized() {
        store.set('auth.isAuthenticated', false);
        store.set('auth.token', null);
        router.navigate('/login', {
            query: { redirect: router.getRoute().path }
        });
    }

    /**
     * Handle initial route
     */
    handleInitialRoute() {
        const initialPath = window.location.pathname;
        const queryParams = new URLSearchParams(window.location.search);
        
        router.navigate(initialPath, {
            replace: true,
            query: Object.fromEntries(queryParams)
        });
    }

    /**
     * Handle initialization error
     */
    handleInitError(error) {
        router.navigate('/error', {
            query: {
                message: 'Failed to initialize application',
                details: error.message
            }
        });
    }

    /**
     * Retry failed network requests
     */
    async retryFailedRequests() {
        store.set('app.hasNetworkError', false);
        await api.retryFailedRequests();
    }

    /**
     * Focus search input
     */
    focusSearch() {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }

    /**
     * Track page view
     */
    trackPageView(path) {
        // Implement analytics tracking
        console.log('Page view:', path);
    }
}

// Initialize application
const app = new App();
export default app;