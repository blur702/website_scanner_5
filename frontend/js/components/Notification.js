/**
 * Notification Component
 * Displays toast notifications and alerts
 */
class Notification {
    constructor(options = {}) {
        this.options = {
            position: 'top-right', // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
            duration: 5000,
            maxVisible: 5,
            animation: true,
            theme: null,
            containerClass: '',
            ...options
        };

        this.notifications = new Map();
        this.container = null;
        this.init();
    }

    init() {
        this.createContainer();
        this.setupEventListeners();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = `notification-container ${this.options.position} ${this.options.containerClass}`;
        
        if (this.options.theme) {
            this.container.setAttribute('data-theme', this.options.theme);
        }

        document.body.appendChild(this.container);
    }

    setupEventListeners() {
        // Handle click events for close buttons and actions
        this.container.addEventListener('click', (e) => {
            const notification = e.target.closest('.notification');
            if (!notification) return;

            const id = notification.dataset.id;

            if (e.target.closest('.notification-close')) {
                this.close(id);
            } else if (e.target.closest('.notification-action')) {
                const action = e.target.closest('.notification-action');
                const actionName = action.dataset.action;
                this.handleAction(id, actionName);
            }
        });
    }

    show(options = {}) {
        const id = Math.random().toString(36).substr(2, 9);
        const config = {
            id,
            title: '',
            message: '',
            type: 'info', // info, success, warning, error
            icon: true,
            closable: true,
            actions: [],
            progress: false,
            ...options,
            duration: options.duration || this.options.duration
        };

        // Check max visible notifications
        if (this.notifications.size >= this.options.maxVisible) {
            const oldestId = Array.from(this.notifications.keys())[0];
            this.close(oldestId);
        }

        const element = this.createNotificationElement(config);
        this.container.appendChild(element);

        // Add to tracking map
        this.notifications.set(id, {
            element,
            config,
            timer: null
        });

        // Start auto-close timer if duration is set
        if (config.duration > 0) {
            this.startTimer(id);
        }

        // Start progress bar animation
        if (config.progress) {
            this.startProgress(id);
        }

        // Trigger show animation
        requestAnimationFrame(() => {
            element.classList.add('show');
        });

        return id;
    }

    createNotificationElement(config) {
        const element = document.createElement('div');
        element.className = `notification ${config.type}`;
        element.dataset.id = config.id;

        element.innerHTML = `
            ${config.icon ? this.getIcon(config.type) : ''}
            <div class="notification-content">
                ${config.title ? `
                    <div class="notification-title">${config.title}</div>
                ` : ''}
                <div class="notification-message">${config.message}</div>
                ${config.actions.length ? `
                    <div class="notification-actions">
                        ${config.actions.map(action => `
                            <button class="notification-action" data-action="${action.name}">
                                ${action.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            ${config.closable ? `
                <button class="notification-close" aria-label="Close">
                    <svg viewBox="0 0 24 24">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            ` : ''}
            ${config.progress ? `
                <div class="notification-progress">
                    <div class="progress-bar"></div>
                </div>
            ` : ''}
        `;

        return element;
    }

    getIcon(type) {
        const icons = {
            info: `
                <svg class="notification-icon" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12" y2="8"/>
                </svg>
            `,
            success: `
                <svg class="notification-icon" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9 12l2 2 4-4"/>
                </svg>
            `,
            warning: `
                <svg class="notification-icon" viewBox="0 0 24 24">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12" y2="17"/>
                </svg>
            `,
            error: `
                <svg class="notification-icon" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
            `
        };

        return icons[type] || icons.info;
    }

    startTimer(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        notification.timer = setTimeout(() => {
            this.close(id);
        }, notification.config.duration);
    }

    startProgress(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        const progressBar = notification.element.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.transition = `width ${notification.config.duration}ms linear`;
            requestAnimationFrame(() => {
                progressBar.style.width = '0%';
            });
        }
    }

    pauseTimer(id) {
        const notification = this.notifications.get(id);
        if (!notification || !notification.timer) return;

        clearTimeout(notification.timer);
        
        const progressBar = notification.element.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.animationPlayState = 'paused';
        }
    }

    resumeTimer(id) {
        const notification = this.notifications.get(id);
        if (!notification || !notification.config.duration) return;

        this.startTimer(id);
        
        const progressBar = notification.element.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.animationPlayState = 'running';
        }
    }

    close(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Clear timer
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        // Start close animation
        notification.element.classList.remove('show');
        notification.element.addEventListener('transitionend', () => {
            notification.element.remove();
            this.notifications.delete(id);
        }, { once: true });
    }

    closeAll() {
        this.notifications.forEach((_, id) => this.close(id));
    }

    handleAction(id, actionName) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        const action = notification.config.actions.find(a => a.name === actionName);
        if (action && action.callback) {
            action.callback(id);
        }
    }

    update(id, options = {}) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Update config
        Object.assign(notification.config, options);

        // Update element
        const newElement = this.createNotificationElement(notification.config);
        notification.element.innerHTML = newElement.innerHTML;

        // Reset timer if duration changed
        if (options.duration && options.duration !== notification.config.duration) {
            if (notification.timer) {
                clearTimeout(notification.timer);
            }
            if (options.duration > 0) {
                this.startTimer(id);
            }
        }
    }

    setPosition(position) {
        this.container.className = `notification-container ${position} ${this.options.containerClass}`;
    }

    setTheme(theme) {
        if (theme) {
            this.container.setAttribute('data-theme', theme);
        } else {
            this.container.removeAttribute('data-theme');
        }
    }

    // Convenience methods
    success(message, options = {}) {
        return this.show({ ...options, type: 'success', message });
    }

    error(message, options = {}) {
        return this.show({ ...options, type: 'error', message });
    }

    warning(message, options = {}) {
        return this.show({ ...options, type: 'warning', message });
    }

    info(message, options = {}) {
        return this.show({ ...options, type: 'info', message });
    }

    destroy() {
        this.closeAll();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// Create and export singleton instance
const notification = new Notification();
export default notification;