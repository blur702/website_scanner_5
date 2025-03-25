/**
 * Modal Component
 * Creates accessible dialog windows with focus management
 */
class Modal {
    constructor(options = {}) {
        this.options = {
            title: '',
            content: '',
            closable: true,
            closeOnEscape: true,
            closeOnOverlayClick: true,
            showCloseButton: true,
            size: 'md', // sm, md, lg, xl, full
            position: 'center', // center, top
            onOpen: null,
            onClose: null,
            customClass: '',
            ...options
        };

        this.element = null;
        this.overlay = null;
        this.closeButton = null;
        this.lastActiveElement = null;
        this.focusableElements = [];
        this.isOpen = false;

        this.init();
    }

    init() {
        this.createElement();
        if (this.options.closable) {
            this.setupEventListeners();
        }
    }

    createElement() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay';
        
        // Create modal
        this.element = document.createElement('div');
        this.element.className = `modal ${this.options.size} ${this.options.position} ${this.options.customClass}`;
        this.element.setAttribute('role', 'dialog');
        this.element.setAttribute('aria-modal', 'true');
        if (this.options.title) {
            this.element.setAttribute('aria-labelledby', 'modal-title');
        }

        // Create content
        this.element.innerHTML = `
            <div class="modal-content">
                ${this.options.title ? `
                    <div class="modal-header">
                        <h3 class="modal-title" id="modal-title">${this.options.title}</h3>
                        ${this.options.showCloseButton ? `
                            <button class="modal-close" aria-label="Close modal">
                                <svg viewBox="0 0 24 24">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
                <div class="modal-body">
                    ${typeof this.options.content === 'string' 
                        ? this.options.content 
                        : ''}
                </div>
                ${this.options.footer ? `
                    <div class="modal-footer">
                        ${this.options.footer}
                    </div>
                ` : ''}
            </div>
        `;

        // Append content if it's an element
        if (typeof this.options.content !== 'string') {
            this.element.querySelector('.modal-body').appendChild(this.options.content);
        }

        // Cache elements
        this.closeButton = this.element.querySelector('.modal-close');
    }

    setupEventListeners() {
        // Close button click
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.close());
        }

        // Overlay click
        if (this.options.closeOnOverlayClick) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.close();
                }
            });
        }

        // Escape key
        if (this.options.closeOnEscape) {
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
        }

        // Focus trap
        this.element.addEventListener('keydown', this.handleTabKey.bind(this));
    }

    handleKeyDown(e) {
        if (!this.isOpen) return;

        if (e.key === 'Escape' && this.options.closeOnEscape) {
            this.close();
        }
    }

    handleTabKey(e) {
        if (e.key !== 'Tab') return;

        const focusableElements = this.getFocusableElements();
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Shift + Tab
        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        }
        // Tab
        else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    getFocusableElements() {
        return Array.from(this.element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )).filter(el => !el.hasAttribute('disabled'));
    }

    open() {
        if (this.isOpen) return;

        // Store last active element
        this.lastActiveElement = document.activeElement;

        // Append to DOM
        document.body.appendChild(this.overlay);
        this.overlay.appendChild(this.element);

        // Show modal
        requestAnimationFrame(() => {
            this.overlay.classList.add('show');
            this.element.classList.add('show');
        });

        // Lock body scroll
        document.body.style.overflow = 'hidden';

        // Set focus
        const focusableElements = this.getFocusableElements();
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        } else {
            this.element.focus();
        }

        this.isOpen = true;

        // Trigger callback
        if (this.options.onOpen) {
            this.options.onOpen();
        }
    }

    close() {
        if (!this.isOpen) return;

        // Hide modal
        this.overlay.classList.remove('show');
        this.element.classList.remove('show');

        // Remove after animation
        this.element.addEventListener('transitionend', () => {
            if (this.overlay.parentNode) {
                document.body.removeChild(this.overlay);
            }

            // Restore body scroll
            document.body.style.overflow = '';

            // Restore focus
            if (this.lastActiveElement) {
                this.lastActiveElement.focus();
            }
        }, { once: true });

        this.isOpen = false;

        // Trigger callback
        if (this.options.onClose) {
            this.options.onClose();
        }
    }

    setContent(content) {
        const body = this.element.querySelector('.modal-body');
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else {
            body.innerHTML = '';
            body.appendChild(content);
        }
    }

    setTitle(title) {
        const titleEl = this.element.querySelector('.modal-title');
        if (titleEl) {
            titleEl.textContent = title;
        }
    }

    setFooter(content) {
        let footer = this.element.querySelector('.modal-footer');
        if (!footer) {
            footer = document.createElement('div');
            footer.className = 'modal-footer';
            this.element.querySelector('.modal-content').appendChild(footer);
        }
        
        if (typeof content === 'string') {
            footer.innerHTML = content;
        } else {
            footer.innerHTML = '';
            footer.appendChild(content);
        }
    }

    destroy() {
        if (this.isOpen) {
            this.close();
        }

        document.removeEventListener('keydown', this.handleKeyDown);
        
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    /**
     * Create alert modal
     */
    static alert(message, options = {}) {
        return new Promise((resolve) => {
            const modal = new Modal({
                title: options.title || 'Alert',
                content: message,
                footer: `
                    <button class="btn btn-primary" data-action="ok">OK</button>
                `,
                ...options
            });

            modal.element.querySelector('[data-action="ok"]').addEventListener('click', () => {
                modal.close();
                resolve(true);
            });

            modal.open();
        });
    }

    /**
     * Create confirm modal
     */
    static confirm(message, options = {}) {
        return new Promise((resolve) => {
            const modal = new Modal({
                title: options.title || 'Confirm',
                content: message,
                footer: `
                    <button class="btn btn-secondary" data-action="cancel">Cancel</button>
                    <button class="btn btn-primary" data-action="confirm">Confirm</button>
                `,
                ...options
            });

            modal.element.querySelector('[data-action="cancel"]').addEventListener('click', () => {
                modal.close();
                resolve(false);
            });

            modal.element.querySelector('[data-action="confirm"]').addEventListener('click', () => {
                modal.close();
                resolve(true);
            });

            modal.open();
        });
    }

    /**
     * Create prompt modal
     */
    static prompt(message, defaultValue = '', options = {}) {
        return new Promise((resolve) => {
            const modal = new Modal({
                title: options.title || 'Prompt',
                content: `
                    <p>${message}</p>
                    <input type="text" class="form-input" value="${defaultValue}">
                `,
                footer: `
                    <button class="btn btn-secondary" data-action="cancel">Cancel</button>
                    <button class="btn btn-primary" data-action="ok">OK</button>
                `,
                ...options
            });

            const input = modal.element.querySelector('input');

            modal.element.querySelector('[data-action="cancel"]').addEventListener('click', () => {
                modal.close();
                resolve(null);
            });

            modal.element.querySelector('[data-action="ok"]').addEventListener('click', () => {
                modal.close();
                resolve(input.value);
            });

            modal.element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    modal.close();
                    resolve(input.value);
                }
            });

            modal.open();
            input.focus();
            input.select();
        });
    }
}

export default Modal;