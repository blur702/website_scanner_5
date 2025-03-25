/**
 * Tabs Component
 * Creates accessible tabbed interfaces with content panels
 */
class Tabs {
    constructor(options = {}) {
        this.options = {
            container: null,
            activeTab: 0,
            onTabChange: null,
            ...options
        };
        
        this.tabs = [];
        this.panels = [];
        this.activeIndex = this.options.activeTab;
        this.init();
    }

    init() {
        if (!this.options.container) {
            throw new Error('Container element is required');
        }

        // Find tab elements
        this.tabs = Array.from(this.options.container.querySelectorAll('[role="tab"]'));
        this.panels = Array.from(this.options.container.querySelectorAll('[role="tabpanel"]'));

        // Setup event listeners
        this.tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => this.activateTab(index));
            tab.addEventListener('keydown', (e) => this.handleKeyDown(e, index));
        });

        // Set initial active tab
        this.activateTab(this.activeIndex);
    }

    activateTab(index) {
        if (index === this.activeIndex) return;

        // Update active tab
        this.tabs[this.activeIndex]?.setAttribute('aria-selected', 'false');
        this.tabs[this.activeIndex]?.classList.remove('active');
        this.panels[this.activeIndex]?.classList.remove('active');

        // Set new active tab
        this.activeIndex = index;
        this.tabs[index]?.setAttribute('aria-selected', 'true');
        this.tabs[index]?.classList.add('active');
        this.panels[index]?.classList.add('active');

        // Focus the active tab
        this.tabs[index]?.focus();

        // Call change handler
        if (this.options.onTabChange) {
            this.options.onTabChange(index);
        }
    }

    handleKeyDown(event, index) {
        let targetIndex;

        switch (event.key) {
            case 'ArrowLeft':
                targetIndex = index === 0 ? this.tabs.length - 1 : index - 1;
                break;
            case 'ArrowRight':
                targetIndex = index === this.tabs.length - 1 ? 0 : index + 1;
                break;
            case 'Home':
                targetIndex = 0;
                break;
            case 'End':
                targetIndex = this.tabs.length - 1;
                break;
            default:
                return;
        }

        event.preventDefault();
        this.activateTab(targetIndex);
    }

    destroy() {
        // Remove event listeners
        this.tabs.forEach(tab => {
            tab.removeEventListener('click', () => this.activateTab(index));
            tab.removeEventListener('keydown', (e) => this.handleKeyDown(e, index));
        });
    }
}

export default Tabs;