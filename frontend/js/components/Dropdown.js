/**
 * Dropdown Component
 * Creates customizable dropdown menus and select inputs
 */
class Dropdown {
    constructor(options = {}) {
        this.options = {
            container: null,
            trigger: 'click', // click or hover
            items: [],
            selected: null,
            placeholder: 'Select an option',
            multiple: false,
            searchable: false,
            closeOnSelect: true,
            maxHeight: '300px',
            onChange: null,
            customClass: '',
            disabled: false,
            ...options
        };

        this.isOpen = false;
        this.selectedItems = new Set(this.options.selected ? [].concat(this.options.selected) : []);
        this.element = null;
        this.searchInput = null;
        this.filteredItems = [...this.options.items];

        this.init();
    }

    init() {
        this.createElement();
        this.setupEventListeners();
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = `dropdown ${this.options.customClass}`;
        if (this.options.disabled) {
            this.element.classList.add('disabled');
        }

        this.render();

        if (this.options.container) {
            this.options.container.appendChild(this.element);
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="dropdown-trigger" tabindex="0">
                <div class="dropdown-selection">
                    ${this.renderSelection()}
                </div>
                <div class="dropdown-arrow">
                    <svg viewBox="0 0 24 24">
                        <path d="M7 10l5 5 5-5"/>
                    </svg>
                </div>
            </div>
            
            <div class="dropdown-menu" style="max-height: ${this.options.maxHeight}">
                ${this.options.searchable ? `
                    <div class="dropdown-search">
                        <input type="text" placeholder="Search..." class="dropdown-search-input">
                    </div>
                ` : ''}
                
                <div class="dropdown-items">
                    ${this.renderItems()}
                </div>
            </div>
        `;
    }

    renderSelection() {
        if (this.selectedItems.size === 0) {
            return `<span class="dropdown-placeholder">${this.options.placeholder}</span>`;
        }

        if (this.options.multiple) {
            return Array.from(this.selectedItems).map(item => `
                <span class="dropdown-tag">
                    ${this.getItemLabel(item)}
                    <button class="dropdown-tag-remove" data-value="${item}">
                        <svg viewBox="0 0 24 24">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </span>
            `).join('');
        }

        return this.getItemLabel(Array.from(this.selectedItems)[0]);
    }

    renderItems() {
        return this.filteredItems.map(item => {
            const value = this.getItemValue(item);
            const label = this.getItemLabel(item);
            const isSelected = this.selectedItems.has(value);

            return `
                <div class="dropdown-item ${isSelected ? 'selected' : ''}" 
                     data-value="${value}" 
                     role="option"
                     aria-selected="${isSelected}">
                    ${this.options.multiple ? `
                        <div class="dropdown-checkbox">
                            <input type="checkbox" ${isSelected ? 'checked' : ''}>
                            <span class="checkbox-icon"></span>
                        </div>
                    ` : ''}
                    ${label}
                </div>
            `;
        }).join('');
    }

    setupEventListeners() {
        // Trigger events
        const trigger = this.element.querySelector('.dropdown-trigger');
        
        if (this.options.trigger === 'click') {
            trigger.addEventListener('click', () => this.toggle());
        } else if (this.options.trigger === 'hover') {
            this.element.addEventListener('mouseenter', () => this.open());
            this.element.addEventListener('mouseleave', () => this.close());
        }

        // Keyboard navigation
        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            } else if (e.key === 'Escape') {
                this.close();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.open();
                this.focusFirstItem();
            }
        });

        // Item selection
        this.element.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (item) {
                const value = item.dataset.value;
                this.selectItem(value);
            }
        });

        // Tag removal
        this.element.addEventListener('click', (e) => {
            const removeButton = e.target.closest('.dropdown-tag-remove');
            if (removeButton) {
                e.stopPropagation();
                const value = removeButton.dataset.value;
                this.deselectItem(value);
            }
        });

        // Search functionality
        if (this.options.searchable) {
            this.searchInput = this.element.querySelector('.dropdown-search-input');
            this.searchInput.addEventListener('input', () => this.handleSearch());
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    this.searchInput.value = '';
                    this.handleSearch();
                }
            });
        }

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) {
                this.close();
            }
        });
    }

    toggle() {
        if (this.options.disabled) return;
        this.isOpen ? this.close() : this.open();
    }

    open() {
        if (this.options.disabled || this.isOpen) return;
        
        this.element.classList.add('open');
        this.isOpen = true;

        if (this.options.searchable) {
            setTimeout(() => this.searchInput.focus(), 0);
        }
    }

    close() {
        if (!this.isOpen) return;

        this.element.classList.remove('open');
        this.isOpen = false;

        if (this.options.searchable) {
            this.searchInput.value = '';
            this.handleSearch();
        }
    }

    selectItem(value) {
        if (this.options.multiple) {
            if (this.selectedItems.has(value)) {
                this.selectedItems.delete(value);
            } else {
                this.selectedItems.add(value);
            }
        } else {
            this.selectedItems.clear();
            this.selectedItems.add(value);
            if (this.options.closeOnSelect) {
                this.close();
            }
        }

        this.updateSelection();
    }

    deselectItem(value) {
        this.selectedItems.delete(value);
        this.updateSelection();
    }

    updateSelection() {
        this.element.querySelector('.dropdown-selection').innerHTML = this.renderSelection();
        this.element.querySelectorAll('.dropdown-item').forEach(item => {
            const isSelected = this.selectedItems.has(item.dataset.value);
            item.classList.toggle('selected', isSelected);
            item.setAttribute('aria-selected', isSelected);
        });

        if (this.options.onChange) {
            this.options.onChange(Array.from(this.selectedItems));
        }
    }

    handleSearch() {
        const query = this.searchInput.value.toLowerCase();
        this.filteredItems = this.options.items.filter(item => 
            this.getItemLabel(item).toLowerCase().includes(query)
        );
        this.element.querySelector('.dropdown-items').innerHTML = this.renderItems();
    }

    focusFirstItem() {
        const firstItem = this.element.querySelector('.dropdown-item');
        if (firstItem) {
            firstItem.focus();
        }
    }

    getItemValue(item) {
        return typeof item === 'object' ? item.value : item;
    }

    getItemLabel(item) {
        return typeof item === 'object' ? item.label : item;
    }

    getValue() {
        return this.options.multiple 
            ? Array.from(this.selectedItems)
            : Array.from(this.selectedItems)[0] || null;
    }

    setValue(value) {
        this.selectedItems.clear();
        if (value != null) {
            const values = [].concat(value);
            values.forEach(v => this.selectedItems.add(v));
        }
        this.updateSelection();
    }

    disable() {
        this.options.disabled = true;
        this.element.classList.add('disabled');
    }

    enable() {
        this.options.disabled = false;
        this.element.classList.remove('disabled');
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Export for module use
export default Dropdown;