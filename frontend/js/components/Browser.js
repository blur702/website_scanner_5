class Browser {
    constructor(options = {}) {
        this.options = {
            container: null,
            url: '',
            width: '100%',
            height: '600px',
            sandboxed: true,
            onLoad: null,
            onError: null,
            ...options
        };

        this.frame = null;
        this.init();
    }

    init() {
        // Create iframe container
        this.frame = document.createElement('iframe');
        this.frame.className = 'browser-frame';
        this.frame.style.width = this.options.width;
        this.frame.style.height = this.options.height;
        
        if (this.options.sandboxed) {
            this.frame.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms';
        }

        // Setup event listeners
        this.frame.addEventListener('load', () => {
            if (this.options.onLoad) {
                this.options.onLoad(this.frame);
            }
        });

        this.frame.addEventListener('error', (error) => {
            if (this.options.onError) {
                this.options.onError(error);
            }
        });

        // Add to container if specified
        if (this.options.container) {
            this.options.container.appendChild(this.frame);
        }

        // Load initial URL if provided
        if (this.options.url) {
            this.navigate(this.options.url);
        }
    }

    navigate(url) {
        this.frame.src = url;
    }

    reload() {
        this.frame.contentWindow.location.reload();
    }

    getDocument() {
        return this.frame.contentDocument;
    }

    destroy() {
        if (this.frame && this.frame.parentNode) {
            this.frame.parentNode.removeChild(this.frame);
        }
    }
}

export default Browser;
