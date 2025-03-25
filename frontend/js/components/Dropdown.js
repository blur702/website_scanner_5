/**
 * Dropdown Component
 * Creates customizable dropdown menus and select inputs
 */
class Dropdown {
    constructor(options = {}) {
        this.options = {
            container: null,
            trigger: null,
            items: [],
            onSelect: null,
            placement: 'bottom-start',
            width: 'trigger',
            maxHeight: '300px',
            closeOnSelect: true,
            ...options
        };

        this.isOpen = false;
        this.activeIndex = -1;
        this.menuElement = null;
        this.init();
    }

    init() {
        if (!this.options.container || !this.options.trigger) {
            throw new Error('Container and trigger elements are required');
        }

        this.options.trigger.setAttribute('aria-haspopup', 'true');
        this.options.trigger.setAttribute('aria-expanded', 'false');

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Toggle dropdown on trigger click
        this.options.trigger.addEventListener('click', () => this.toggle());

        // Handle keyboard navigation
        this.options.trigger.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Enter':
                case 'Space':
                case 'ArrowDown':
                    e.preventDefault();
                    if (!this.isOpen) this.open();
                    break;
                case 'Escape':
                    if (this.isOpen) {
                        e.preventDefault();
                        this.close();
                    }
                    break;
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen && 
                !this.options.container.contains(e.target) &&
                !this.menuElement?.contains(e.target)) {
                this.close();
            }
        });
    }

    render() {
        const menuWidth = this.options.width === 'trigger' 
            ? this.options.trigger.offsetWidth 
            : this.options.width;

        this.menuElement = document.createElement('div');
        this.menuElement.className = 'dropdown-menu';
        this.menuElement.setAttribute('role', 'menu');
        this.menuElement.style.width = `${menuWidth}px`;
        this.menuElement.style.maxHeight = this.options.maxHeight;

        // Render menu items
        this.menuElement.innerHTML = `
            <div class="dropdown-items">
                ${this.options.items.map((item, index) => `
                    <button class="dropdown-item" 
                            role="menuitem" 
                            data-index="${index}"
                            ${item.disabled ? 'disabled' : ''}>
                        ${item.icon ? `<i class="icon ${item.icon}"></i>` : ''}
                        <span>${item.label}</span>
                    </button>
                `).join('')}
            </div>
        `;

        // Setup item event listeners
        this.menuElement.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.selectItem(index);
            });

            item.addEventListener('keydown', (e) => this.handleItemKeyDown(e));
        });

        // Position menu
        this.position();
        
        this.options.container.appendChild(this.menuElement);
    }

    position() {
        const triggerRect = this.options.trigger.getBoundingClientRect();
        const menuRect = this.menuElement.getBoundingClientRect();
        
        let top = triggerRect.bottom + window.scrollY;
        let left = triggerRect.left + window.scrollX;

        // Adjust position based on placement option
        switch (this.options.placement) {
            case 'bottom-end':
                left = left + triggerRect.width - menuRect.width;
                break;
            case 'top':
                top = triggerRect.top - menuRect.height;
                break;
            case 'top-end':
                top = triggerRect.top - menuRect.height;
                left = left + triggerRect.width - menuRect.width;
                break;
        }

        // Ensure menu stays within viewport
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        if (top + menuRect.height > viewportHeight) {
            top = triggerRect.top - menuRect.height;
        }

        if (left + menuRect.width > viewportWidth) {
            left = viewportWidth - menuRect.width - 8;
        }

        Object.assign(this.menuElement.style, {
            position: 'absolute',
            top: `${top}px`,
            left: `${left}px`,
            zIndex: '1000'
        });
    }

    // ... rest of implementation
}

export default Dropdown;