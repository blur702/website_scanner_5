/**
 * Tabs Component
 * Creates accessible tabbed interfaces with content panels
 */
class Tabs {
    constructor(options = {}) {
        this.options = {
            container: null,
            tabs: [],
            active: 0,
            onChange: null,
            persistState: false,
            storageKey: 'app_tabs',
            customClass: '',
            ...options
        };

        this.element = null;
        this.tabsList = null;
        this.panels = [];
        this.activeIndex = this.getInitialActiveIndex();

        this.init();
    }

    init() {
        this.createElement();
        this.setupEventListeners();
        this.activateTab(this.activeIndex, false);
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = `tabs ${this.options.customClass}`;
        this.element.setAttribute('role', 'tablist');

        this.render();

        if (this.options.container) {
            this.options.container.appendChild(this.element);
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="tabs-header">
                <div class="tabs-list" role="tablist">
                    ${this.options.tabs.map((tab, index) => `
                        <button class="tab-button ${index === this.activeIndex ? 'active' : ''}"
                                role="tab"
                                aria-selected="${index === this.activeIndex}"
                                aria-controls="tab-panel-${index}"
                                id="tab-${index}"
                                tabindex="${index === this.activeIndex ? '0' : '-1'}">
                            ${tab.icon ? `<span class="tab-icon">${tab.icon}</span>` : ''}
                            <span class="tab-label">${tab.label}</span>
                            ${tab.badge ? `
                                <span class="tab-badge ${tab.badge.type || ''}">${tab.badge.text}</span>
                            ` : ''}
                        </button>
                    `).join('')}
                </div>
                <div class="tabs-extra">
                    ${this.options.extraContent || ''}
                </div>
            </div>
            <div class="tabs-content">
                ${this.options.tabs.map((tab, index) => `
                    <div class="tab-panel ${index === this.activeIndex ? 'active' : ''}"
                         role="tabpanel"
                         id="tab-panel-${index}"
                         aria-labelledby="tab-${index}"
                         tabindex="0">
                        ${typeof tab.content === 'string' ? tab.content : ''}
                    </div>
                `).join('')}
            </div>
        `;

        // If content is an element, append it
        this.options.tabs.forEach((tab, index) => {
            if (typeof tab.content !== 'string' && tab.content instanceof Element) {
                this.element.querySelector(`#tab-panel-${index}`).appendChild(tab.content);
            }
        });

        // Cache panels
        this.panels = Array.from(this.element.querySelectorAll('.tab-panel'));
        this.tabsList = this.element.querySelector('.tabs-list');
    }

    setupEventListeners() {
        // Click events
        this.tabsList.addEventListener('click', (e) => {
            const button = e.target.closest('.tab-button');
            if (button) {
                const index = Array.from(this.tabsList.children).indexOf(button);
                this.activateTab(index);
            }
        });

        // Keyboard navigation
        this.tabsList.addEventListener('keydown', (e) => {
            const button = e.target.closest('.tab-button');
            if (!button) return;

            const buttons = Array.from(this.tabsList.querySelectorAll('.tab-button'));
            const index = buttons.indexOf(button);
            let newIndex;

            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    newIndex = index > 0 ? index - 1 : buttons.length - 1;
                    this.activateTab(newIndex);
                    buttons[newIndex].focus();
                    break;

                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    newIndex = index < buttons.length - 1 ? index + 1 : 0;
                    this.activateTab(newIndex);
                    buttons[newIndex].focus();
                    break;

                case 'Home':
                    e.preventDefault();
                    this.activateTab(0);
                    buttons[0].focus();
                    break;

                case 'End':
                    e.preventDefault();
                    newIndex = buttons.length - 1;
                    this.activateTab(newIndex);
                    buttons[newIndex].focus();
                    break;
            }
        });
    }

    activateTab(index, triggerChange = true) {
        if (index === this.activeIndex) return;

        const buttons = this.tabsList.querySelectorAll('.tab-button');
        const oldIndex = this.activeIndex;
        this.activeIndex = index;

        // Update button states
        buttons.forEach((button, i) => {
            const isActive = i === index;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive);
            button.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        // Update panel states
        this.panels.forEach((panel, i) => {
            const isActive = i === index;
            panel.classList.toggle('active', isActive);
            
            if (isActive) {
                panel.removeAttribute('hidden');
            } else {
                panel.setAttribute('hidden', '');
            }
        });

        // Persist state if enabled
        if (this.options.persistState) {
            localStorage.setItem(this.options.storageKey, index);
        }

        // Trigger change callback
        if (triggerChange && this.options.onChange) {
            this.options.onChange(index, oldIndex);
        }
    }

    getInitialActiveIndex() {
        // Check persisted state
        if (this.options.persistState) {
            const saved = localStorage.getItem(this.options.storageKey);
            if (saved !== null) {
                const index = parseInt(saved);
                if (index >= 0 && index < this.options.tabs.length) {
                    return index;
                }
            }
        }

        // Use provided active index
        return this.options.active;
    }

    updateTab(index, updates) {
        const tab = this.options.tabs[index];
        if (!tab) return;

        // Update tab data
        Object.assign(tab, updates);

        // Update DOM
        const button = this.tabsList.children[index];
        if (button) {
            if (updates.label) {
                button.querySelector('.tab-label').textContent = updates.label;
            }
            if (updates.icon) {
                let iconEl = button.querySelector('.tab-icon');
                if (!iconEl) {
                    iconEl = document.createElement('span');
                    iconEl.className = 'tab-icon';
                    button.insertBefore(iconEl, button.firstChild);
                }
                iconEl.innerHTML = updates.icon;
            }
            if (updates.badge) {
                let badgeEl = button.querySelector('.tab-badge');
                if (!badgeEl) {
                    badgeEl = document.createElement('span');
                    badgeEl.className = 'tab-badge';
                    button.appendChild(badgeEl);
                }
                badgeEl.textContent = updates.badge.text;
                badgeEl.className = `tab-badge ${updates.badge.type || ''}`;
            }
        }

        const panel = this.panels[index];
        if (panel && updates.content) {
            if (typeof updates.content === 'string') {
                panel.innerHTML = updates.content;
            } else if (updates.content instanceof Element) {
                panel.innerHTML = '';
                panel.appendChild(updates.content);
            }
        }
    }

    getActiveTab() {
        return {
            index: this.activeIndex,
            tab: this.options.tabs[this.activeIndex]
        };
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Export for module use
export default Tabs;