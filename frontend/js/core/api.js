/**
 * API Service
 * Handles all HTTP requests to the backend
 */
class ApiService {
    constructor(options = {}) {
        this.options = {
            baseURL: '/api',
            timeout: 30000,
            retryAttempts: 3,
            retryDelay: 1000,
            onError: null,
            ...options
        };

        this.pendingRequests = new Map();
        this.retryQueue = new Set();
        this.errorInterceptors = [];
        this.requestInterceptors = [];
    }

    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
        return () => {
            const index = this.requestInterceptors.indexOf(interceptor);
            if (index >= 0) this.requestInterceptors.splice(index, 1);
        };
    }

    /**
     * Add error interceptor
     */
    addErrorInterceptor(interceptor) {
        this.errorInterceptors.push(interceptor);
        return () => {
            const index = this.errorInterceptors.indexOf(interceptor);
            if (index >= 0) this.errorInterceptors.splice(index, 1);
        };
    }

    /**
     * Make HTTP request
     */
    async request(config) {
        const requestId = Math.random().toString(36).substr(2, 9);
        
        try {
            // Add timeout handling
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.options.timeout);

            const response = await fetch(config.url, {
                ...config,
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            this.pendingRequests.delete(requestId);

            // Handle HTTP errors
            if (!response.ok) {
                const error = await this.createError(response);
                await this.handleRequestError(error, requestId);
                throw error;
            }

            const data = await this.parseResponse(response);
            return { data, status: response.status, headers: response.headers };

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            if (!navigator.onLine) {
                throw new Error('No internet connection');
            }
            throw error;
        }
    }

    /**
     * Fetch with timeout
     */
    async fetchWithTimeout(config) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.options.timeout);

        try {
            const response = await fetch(config.url, {
                ...config,
                signal: controller.signal
            });
            clearTimeout(timeout);
            return response;
        } catch (error) {
            clearTimeout(timeout);
            throw error;
        }
    }

    /**
     * Handle request error
     */
    async handleRequestError(error, requestId) {
        const request = this.pendingRequests.get(requestId);
        if (!request) return error;

        // Run error interceptors
        for (const interceptor of this.errorInterceptors) {
            try {
                const result = await interceptor(error);
                if (result !== undefined) return result;
            } catch (e) {
                console.error('Error interceptor failed:', e);
            }
        }

        // Handle retry
        if (request.attempts < this.options.retryAttempts && this.shouldRetry(error)) {
            request.attempts++;
            this.retryQueue.add(requestId);

            await new Promise(resolve => setTimeout(resolve, 
                this.options.retryDelay * Math.pow(2, request.attempts - 1)
            ));

            this.retryQueue.delete(requestId);
            return this.request(request.config);
        }

        // Clean up
        this.pendingRequests.delete(requestId);

        // Call error callback
        if (this.options.onError) {
            this.options.onError(error);
        }

        return error;
    }

    /**
     * Check if request should be retried
     */
    shouldRetry(error) {
        // Retry network errors
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            return true;
        }

        // Retry server errors
        if (error.status >= 500 && error.status < 600) {
            return true;
        }

        // Retry timeout errors
        if (error.name === 'AbortError') {
            return true;
        }

        return false;
    }

    /**
     * Apply request interceptors
     */
    async applyRequestInterceptors(config) {
        let finalConfig = { ...config };

        for (const interceptor of this.requestInterceptors) {
            try {
                const result = await interceptor(finalConfig);
                if (result) {
                    finalConfig = result;
                }
            } catch (e) {
                console.error('Request interceptor failed:', e);
            }
        }

        return finalConfig;
    }

    /**
     * Parse response based on content type
     */
    async parseResponse(response) {
        const contentType = response.headers.get('Content-Type') || '';

        if (contentType.includes('application/json')) {
            return response.json();
        }
        
        if (contentType.includes('text/')) {
            return response.text();
        }
        
        return response.blob();
    }

    /**
     * Create error object from response
     */
    async createError(response) {
        let data;
        try {
            data = await this.parseResponse(response);
        } catch {
            data = null;
        }

        const error = new Error(data?.message || response.statusText);
        error.status = response.status;
        error.data = data;
        error.response = response;
        return error;
    }

    /**
     * Cancel all pending requests
     */
    cancelAll() {
        this.pendingRequests.forEach((_, requestId) => {
            this.cancel(requestId);
        });
    }

    /**
     * Cancel specific request
     */
    cancel(requestId) {
        const request = this.pendingRequests.get(requestId);
        if (request) {
            this.pendingRequests.delete(requestId);
            this.retryQueue.delete(requestId);
        }
    }

    /**
     * Check if there are any pending requests
     */
    hasPendingRequests() {
        return this.pendingRequests.size > 0;
    }

    /**
     * Retry failed requests
     */
    async retryFailedRequests() {
        const failed = Array.from(this.pendingRequests.entries())
            .filter(([id, request]) => !this.retryQueue.has(id) && request.attempts > 0);

        return Promise.all(
            failed.map(([id, request]) => {
                request.attempts = 0;
                return this.request(request.config);
            })
        );
    }

    // Convenience methods
    async get(url, config = {}) {
        return this.request({ ...config, url, method: 'GET' });
    }

    async post(url, data, config = {}) {
        return this.request({
            ...config,
            url,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(url, data, config = {}) {
        return this.request({
            ...config,
            url,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async patch(url, data, config = {}) {
        return this.request({
            ...config,
            url,
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    async delete(url, config = {}) {
        return this.request({ ...config, url, method: 'DELETE' });
    }
}

// Create and export singleton instance
const api = new ApiService();
export default api;