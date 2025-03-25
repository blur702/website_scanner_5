/**
 * Loader Component
 * Displays loading states with customizable animations
 */
class Loader {
    constructor(options = {}) {
        this.options = {
            container: null,
            type: 'spinner', // spinner, dots, pulse, bar
            size: 'md', // sm, md, lg
            text: '',
            overlay: false,
            fullscreen: false,
            theme: null,
            customClass: '',
            ...options
        };

        this.element = null;
        this.init();
    }

    init() {
        this.createElement();
        if (this.options.container) {
            this.options.container.appendChild(this.element);
        }
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = `loader ${this.options.customClass}`;
        
        if (this.options.fullscreen) {
            this.element.classList.add('loader-fullscreen');
            document.body.appendChild(this.element);
        }
        
        if (this.options.overlay) {
            this.element.classList.add('loader-overlay');
        }

        if (this.options.theme) {
            this.element.setAttribute('data-theme', this.options.theme);
        }

        this.render();
    }

    render() {
        const loaderContent = `
            <div class="loader-content ${this.options.size}">
                ${this.getLoaderType()}
                ${this.options.text ? `
                    <div class="loader-text">${this.options.text}</div>
                ` : ''}
            </div>
        `;

        this.element.innerHTML = loaderContent;
    }

    getLoaderType() {
        switch (this.options.type) {
            case 'dots':
                return `
                    <div class="loader-dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                `;

            case 'pulse':
                return `
                    <div class="loader-pulse">
                        <div class="pulse"></div>
                    </div>
                `;

            case 'bar':
                return `
                    <div class="loader-bar">
                        <div class="bar"></div>
                    </div>
                `;

            case 'circular':
                return `
                    <div class="loader-circular">
                        <svg viewBox="25 25 50 50">
                            <circle cx="50" cy="50" r="20" fill="none" stroke-width="4" stroke-miterlimit="10"/>
                        </svg>
                    </div>
                `;

            default: // spinner
                return `
                    <div class="loader-spinner">
                        <svg viewBox="0 0 50 50">
                            <circle cx="25" cy="25" r="20" fill="none" stroke-width="4" stroke-linecap="round"/>
                        </svg>
                    </div>
                `;
        }
    }

    setText(text) {
        this.options.text = text;
        const textElement = this.element.querySelector('.loader-text');
        if (textElement) {
            textElement.textContent = text;
        } else if (text) {
            this.render();
        }
    }

    setType(type) {
        this.options.type = type;
        this.render();
    }

    setSize(size) {
        const content = this.element.querySelector('.loader-content');
        if (content) {
            content.className = `loader-content ${size}`;
        }
    }

    setTheme(theme) {
        this.options.theme = theme;
        if (theme) {
            this.element.setAttribute('data-theme', theme);
        } else {
            this.element.removeAttribute('data-theme');
        }
    }

    show() {
        this.element.classList.remove('hidden');
        if (this.options.fullscreen || this.options.overlay) {
            document.body.style.overflow = 'hidden';
        }
    }

    hide() {
        this.element.classList.add('hidden');
        if (this.options.fullscreen || this.options.overlay) {
            document.body.style.overflow = '';
        }
    }

    remove() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    /**
     * Create global loading instance
     */
    static global(options = {}) {
        if (!Loader.globalInstance) {
            Loader.globalInstance = new Loader({
                fullscreen: true,
                overlay: true,
                ...options
            });
        }
        return Loader.globalInstance;
    }

    /**
     * Show loading state for async operations
     */
    static async wrap(promise, options = {}) {
        const loader = new Loader(options);
        loader.show();

        try {
            const result = await promise;
            return result;
        } finally {
            loader.hide();
            setTimeout(() => loader.remove(), 300); // Allow for hide animation
        }
    }

    /**
     * Create loader for specific element
     */
    static forElement(element, options = {}) {
        const container = document.createElement('div');
        container.style.position = 'relative';
        element.parentNode.insertBefore(container, element);
        container.appendChild(element);

        return new Loader({
            container,
            overlay: true,
            ...options
        });
    }

    /**
     * Create progress loader
     */
    static progress(options = {}) {
        const loader = new Loader({
            type: 'bar',
            ...options
        });

        let progress = 0;

        return {
            loader,
            setProgress(value) {
                progress = Math.min(100, Math.max(0, value));
                const bar = loader.element.querySelector('.bar');
                if (bar) {
                    bar.style.width = `${progress}%`;
                }
            },
            getProgress() {
                return progress;
            }
        };
    }
}

// Export for module use
export default Loader;