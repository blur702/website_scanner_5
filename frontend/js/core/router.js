/**
 * Router Service
 * Handles client-side routing and navigation
 */
class Router {
    constructor(options = {}) {
        this.options = {
            root: '',
            mode: 'history',
            notFoundPath: '/404',
            ...options
        };

        this.routes = new Map();
        this.currentRoute = null;
        this.params = {};
        this.query = {};
        this.guards = [];
        this.middlewares = [];
        this.history = [];
        this.isNavigating = false;

        this.init();
    }

    /**
     * Initialize router
     */
    init() {
        // Handle initial route
        window.addEventListener('load', () => this.handleRoute());

        // Handle browser navigation
        window.addEventListener('popstate', (e) => {
            const state = e.state || {};
            this.handleRoute(state.path, state.query, true);
        });

        // Handle link clicks
        document.addEventListener('click', (e) => {
            // Find closest link element
            const link = e.target.closest('a');
            if (!link) return;

            // Check if link should be handled by router
            if (this.shouldHandleLink(link)) {
                e.preventDefault();
                this.navigate(link.getAttribute('href'));
            }
        });
    }

    /**
     * Register a route
     */
    register(path, component, options = {}) {
        this.routes.set(path, { component, options });
        return this;
    }

    /**
     * Navigate to path
     */
    async navigate(path, options = {}) {
        if (this.isNavigating) return false;
        this.isNavigating = true;

        try {
            const url = new URL(path, window.location.origin);
            const fullPath = url.pathname;
            const query = Object.fromEntries(url.searchParams);

            // Check if navigation is allowed
            const canNavigate = await this.runGuards(fullPath, query);
            if (!canNavigate) {
                this.isNavigating = false;
                return false;
            }

            // Update browser history
            if (!options.replace) {
                window.history.pushState({ path: fullPath, query }, '', url.toString());
                this.history.push({ path: fullPath, query });
            } else {
                window.history.replaceState({ path: fullPath, query }, '', url.toString());
                this.history[this.history.length - 1] = { path: fullPath, query };
            }

            // Handle route change
            await this.handleRoute(fullPath, query);
            this.isNavigating = false;
            return true;

        } catch (error) {
            console.error('Navigation error:', error);
            this.isNavigating = false;
            return false;
        }
    }

    /**
     * Handle route change
     */
    async handleRoute(path = window.location.pathname, query = {}, isPopState = false) {
        // Find matching route
        const { route, params } = this.findRoute(path);
        
        if (!route) {
            return this.handleNotFound(path);
        }

        // Update current state
        const oldRoute = this.currentRoute;
        this.currentRoute = route;
        this.params = params;
        this.query = query;

        // Run middlewares
        await this.runMiddlewares(route, oldRoute);

        // Render view
        try {
            const view = new route.component({
                params: this.params,
                query: this.query
            });
            await view.render();
        } catch (error) {
            console.error('Error rendering view:', error);
            this.handleError(error);
        }

        // Update scroll position
        if (!isPopState) {
            window.scrollTo(0, 0);
        }

        // Emit route change event
        this.emit('routeChange', {
            route,
            params: this.params,
            query: this.query,
            previousRoute: oldRoute
        });
    }

    /**
     * Find matching route and extract params
     */
    findRoute(path) {
        path = path.replace(new RegExp(`^${this.options.root}`), '');

        for (const [routePath, route] of this.routes) {
            const params = this.matchRoute(path, routePath);
            if (params) {
                return { route, params };
            }
        }

        return { route: null, params: {} };
    }

    /**
     * Match route path and extract params
     */
    matchRoute(path, routePath) {
        const routeParts = routePath.split('/');
        const pathParts = path.split('/');

        if (routeParts.length !== pathParts.length) {
            return null;
        }

        const params = {};
        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i];
            const pathPart = pathParts[i];

            if (routePart.startsWith(':')) {
                params[routePart.slice(1)] = decodeURIComponent(pathPart);
            } else if (routePart !== pathPart) {
                return null;
            }
        }

        return params;
    }

    /**
     * Handle 404 not found
     */
    handleNotFound(path) {
        console.warn(`Route not found: ${path}`);
        return this.navigate(this.options.notFoundPath, { replace: true });
    }

    /**
     * Handle route error
     */
    handleError(error) {
        console.error('Route error:', error);
        return this.navigate('/error', {
            replace: true,
            query: { message: error.message }
        });
    }

    /**
     * Add navigation guard
     */
    beforeEach(guard) {
        this.guards.push(guard);
        return () => {
            const index = this.guards.indexOf(guard);
            if (index >= 0) this.guards.splice(index, 1);
        };
    }

    /**
     * Add route middleware
     */
    use(middleware) {
        this.middlewares.push(middleware);
        return () => {
            const index = this.middlewares.indexOf(middleware);
            if (index >= 0) this.middlewares.splice(index, 1);
        };
    }

    /**
     * Run navigation guards
     */
    async runGuards(path, query) {
        for (const guard of this.guards) {
            try {
                const result = await guard(path, query);
                if (result === false) return false;
                if (typeof result === 'string') {
                    await this.navigate(result, { replace: true });
                    return false;
                }
            } catch (error) {
                console.error('Guard error:', error);
                return false;
            }
        }
        return true;
    }

    /**
     * Run route middlewares
     */
    async runMiddlewares(route, previousRoute) {
        for (const middleware of this.middlewares) {
            try {
                await middleware(route, previousRoute);
            } catch (error) {
                console.error('Middleware error:', error);
            }
        }
    }

    /**
     * Check if link should be handled by router
     */
    shouldHandleLink(link) {
        const href = link.getAttribute('href');
        if (!href) return false;

        // Skip if link has target
        if (link.hasAttribute('target')) return false;

        // Skip if link is external
        if (href.startsWith('http') || href.startsWith('//')) return false;

        // Skip if link has download attribute
        if (link.hasAttribute('download')) return false;

        // Skip if link is routed externally
        if (link.hasAttribute('data-router-ignore')) return false;

        return true;
    }

    /**
     * Emit custom event
     */
    emit(name, detail) {
        const event = new CustomEvent(`router:${name}`, { detail });
        window.dispatchEvent(event);
    }

    /**
     * Navigate back
     */
    back() {
        window.history.back();
    }

    /**
     * Navigate forward
     */
    forward() {
        window.history.forward();
    }

    /**
     * Get current route info
     */
    getRoute() {
        return {
            path: window.location.pathname,
            query: this.query,
            params: this.params,
            route: this.currentRoute
        };
    }

    /**
     * Build URL with query params
     */
    buildUrl(path, query = {}) {
        const url = new URL(path, window.location.origin);
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        });
        return url.toString().replace(window.location.origin, '');
    }

    /**
     * Reset router state
     */
    reset() {
        this.routes.clear();
        this.currentRoute = null;
        this.params = {};
        this.query = {};
        this.guards = [];
        this.middlewares = [];
        this.history = [];
        this.isNavigating = false;
    }
}

// Create and export singleton instance
const router = new Router();
export default router;