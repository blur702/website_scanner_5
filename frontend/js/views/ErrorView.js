/**
 * ErrorView Component
 * Displays a user-friendly error page
 */
class ErrorView {
    constructor() {
        this.container = document.getElementById('app');
        this.error = store.get('lastError') || {
            message: 'An unexpected error occurred',
            code: 500,
            details: null
        };
    }

    async init() {
        this.render();
        this.setupEventListeners();
        this.logError();
    }

    render() {
        this.container.innerHTML = `
            <div class="error-page system-error">
                <div class="error-content">
                    <div class="error-icon">
                        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 8v4M12 16h.01" />
                        </svg>
                    </div>
                    
                    <h1 class="error-title">Something Went Wrong</h1>
                    
                    <div class="error-details">
                        <p class="error-message">${this.error.message}</p>
                        ${this.error.code ? `
                            <div class="error-code">
                                Error Code: ${this.error.code}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="error-actions">
                        <button class="btn btn-primary retry-action">
                            <i class="icon-refresh"></i>
                            Try Again
                        </button>
                        
                        <button class="btn btn-outline-primary go-back">
                            <i class="icon-arrow-left"></i>
                            Go Back
                        </button>

                        <a href="/" class="btn btn-outline-primary">
                            <i class="icon-home"></i>
                            Go Home
                        </a>
                    </div>

                    ${this.error.details ? `
                        <div class="error-technical">
                            <button class="btn btn-text toggle-details">
                                <i class="icon-chevron-right"></i>
                                Technical Details
                            </button>
                            <div class="technical-details hidden">
                                <pre><code>${JSON.stringify(this.error.details, null, 2)}</code></pre>
                            </div>
                        </div>
                    ` : ''}

                    <div class="error-help">
                        <p>You can try:</p>
                        <ul>
                            <li>Refreshing the page</li>
                            <li>Checking your internet connection</li>
                            <li>Coming back later</li>
                        </ul>
                        
                        <p class="help-contact">
                            If the problem persists, please 
                            <a href="mailto:support@example.com">contact support</a>
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Handle retry button click
        this.container.querySelector('.retry-action')?.addEventListener('click', () => {
            window.location.reload();
        });

        // Handle back button click
        this.container.querySelector('.go-back')?.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                router.navigate('/');
            }
        });

        // Handle technical details toggle
        const toggleButton = this.container.querySelector('.toggle-details');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                const details = this.container.querySelector('.technical-details');
                const icon = toggleButton.querySelector('i');
                
                details.classList.toggle('hidden');
                icon.classList.toggle('icon-chevron-right');
                icon.classList.toggle('icon-chevron-down');
            });
        }
    }

    logError() {
        // Log error to monitoring service if available
        console.error('Application Error:', {
            message: this.error.message,
            code: this.error.code,
            details: this.error.details,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Show error page with specific error
     */
    static show(error) {
        store.set('lastError', {
            message: error.message || 'An unexpected error occurred',
            code: error.code || 500,
            details: error.details || null
        });
        router.navigate('/error', { replace: true });
    }
}

window.ErrorView = ErrorView;