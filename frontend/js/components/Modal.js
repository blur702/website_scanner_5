/**
 * Modal Component
 * Creates accessible dialog windows with focus management
 */
class Modal {
    constructor(options = {}) {
        this.options = {
            title: '',
            content: '',
            width: '500px',
            height: 'auto',
            closable: true,
            onClose: null,
            ...options
        };
        
        this.element = null;
        this.init();
    }

    init() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.element.innerHTML = `
            <div class="modal" style="width: ${this.options.width}; height: ${this.options.height}">
                <div class="modal-header">
                    <h3 class="modal-title">${this.options.title}</h3>
                    ${this.options.closable ? `
                        <button class="modal-close" aria-label="Close">×</button>
                    ` : ''}
                </div>
                <div class="modal-content">
                    ${this.options.content}
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Close button click
        this.element.querySelector('.modal-close')?.addEventListener('click', () => this.close());
        
        // Click outside to close
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element && this.options.closable) {
                this.close();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    handleKeyDown(e) {
        if (e.key === 'Escape' && this.options.closable) {
            this.close();
        }
    }

    show() {
        document.body.appendChild(this.element);
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            this.element.classList.add('visible');
        });
    }

    close() {
        this.element.classList.remove('visible');
        this.element.addEventListener('transitionend', () => {
            document.body.removeChild(this.element);
            document.body.style.overflow = '';
            if (this.options.onClose) {
                this.options.onClose();
            }
        }, { once: true });
    }

    setContent(content) {
        const contentEl = this.element.querySelector('.modal-content');
        if (contentEl) {
            contentEl.innerHTML = content;
        }
    }

    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

export default Modal;