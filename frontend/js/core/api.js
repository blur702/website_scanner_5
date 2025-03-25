/**
 * API Service
 * Handles all HTTP requests to the backend
 */
class ApiService {
    constructor(config = {}) {
        this.config = {
            baseUrl: '/api',
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            },
            ...config
        };
        
        this.pendingRequests = new Map();
    }

    async request(config) {
        const requestId = Math.random().toString(36).substr(2, 9);
        
        try {
            // Add timeout handling
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.config.timeout);

            const response = await fetch(this._buildUrl(config.url), {
                method: config.method || 'GET',
                headers: this._mergeHeaders(config.headers),
                body: config.data ? JSON.stringify(config.data) : undefined,
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            this.pendingRequests.delete(requestId);

            if (!response.ok) {
                throw await this._createError(response);
            }

            const data = await this._parseResponse(response);
            return { data, status: response.status };

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            throw error;
        }
    }

    async get(url, config = {}) {
        return (await this.request({ ...config, url, method: 'GET' })).data;
    }

    async post(url, data, config = {}) {
        return (await this.request({ ...config, url, method: 'POST', data })).data;
    }

    async put(url, data, config = {}) {
        return (await this.request({ ...config, url, method: 'PUT', data })).data;
    }

    async delete(url, config = {}) {
        return (await this.request({ ...config, url, method: 'DELETE' })).data;
    }

    _buildUrl(path) {
        return `${this.config.baseUrl}${path}`;
    }

    _mergeHeaders(customHeaders = {}) {
        return {
            ...this.config.headers,
            ...customHeaders
        };
    }

    async _parseResponse(response) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        }
        return response.text();
    }

    async _createError(response) {
        const error = new Error(response.statusText);
        error.status = response.status;
        
        try {
            error.data = await this._parseResponse(response);
        } catch {
            error.data = null;
        }
        
        return error;
    }

    cancelRequest(requestId) {
        const request = this.pendingRequests.get(requestId);
        if (request) {
            request.controller.abort();
            this.pendingRequests.delete(requestId);
        }
    }

    cancelAllRequests() {
        this.pendingRequests.forEach(request => {
            request.controller.abort();
        });
        this.pendingRequests.clear();
    }
}

// Create and export singleton instance
const api = new ApiService({
    baseUrl: window.location.origin + '/api'
});

export default api;