/**
 * NotFoundView Component
 * Displays a user-friendly 404 page
 */
class NotFoundView {
    constructor() {
        this.container = document.getElementById('app');
    }

    async init() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="error-page not-found">
                <div class="error-content">
                    <div class="error-icon">
                        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M15 9l-6 6M9 9l6 6" />
                        </svg>
                    </div>
                    
                    <h1 class="error-title">Page Not Found</h1>
                    
                    <p class="error-message">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                    
                    <div class="error-actions">
                        <button class="btn btn-primary go-back">
                            <i class="icon-arrow-left"></i>
                            Go Back
                        </button>
                        
                        <a href="/" class="btn btn-outline-primary">
                            <i class="icon-home"></i>
                            Go Home
                        </a>
                    </div>

                    <div class="error-help">
                        <p>Here are some helpful links:</p>
                        <ul class="help-links">
                            <li><a href="/scan">Start New Scan</a></li>
                            <li><a href="/search">Search Results</a></li>
                            <li><a href="/settings">Settings</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Handle back button click
        this.container.querySelector('.go-back').addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                router.navigate('/');
            }
        });
    }
}

window.NotFoundView = NotFoundView;