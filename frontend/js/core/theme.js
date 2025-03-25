/**
 * Theme Service
 * Manages theme preferences and color schemes
 */
class Theme {
    constructor(options = {}) {
        this.options = {
            storageKey: 'theme_preference',
            darkClass: 'dark',
            lightClass: 'light',
            rootElement: document.documentElement,
            ...options
        };

        this.subscribers = new Set();
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.isDark = false;
        
        this.init();
    }

    /**
     * Initialize theme service
     */
    init() {
        // Load saved preference
        const saved = localStorage.getItem(this.options.storageKey);
        if (saved) {
            this.setTheme(saved);
        } else {
            this.setTheme(this.mediaQuery.matches ? 'dark' : 'light');
        }

        // Listen for system theme changes
        this.mediaQuery.addEventListener('change', (e) => {
            if (!localStorage.getItem(this.options.storageKey)) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });

        // Set up CSS variables observer
        this.observeVariables();
    }

    /**
     * Set current theme
     */
    setTheme(theme) {
        if (theme !== 'dark' && theme !== 'light') {
            console.warn('Invalid theme:', theme);
            return;
        }

        const isDark = theme === 'dark';
        if (isDark === this.isDark) return;

        // Update state
        this.isDark = isDark;
        
        // Update DOM
        this.options.rootElement.setAttribute('data-theme', theme);
        this.options.rootElement.classList.remove(
            this.options.darkClass,
            this.options.lightClass
        );
        this.options.rootElement.classList.add(
            isDark ? this.options.darkClass : this.options.lightClass
        );

        // Save preference
        localStorage.setItem(this.options.storageKey, theme);

        // Update meta theme color
        this.updateMetaThemeColor();

        // Notify subscribers
        this.notifySubscribers();
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        this.setTheme(this.isDark ? 'light' : 'dark');
    }

    /**
     * Subscribe to theme changes
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        callback(this.isDark); // Initial call
        
        return () => {
            this.subscribers.delete(callback);
        };
    }

    /**
     * Notify subscribers of theme change
     */
    notifySubscribers() {
        this.subscribers.forEach(callback => {
            try {
                callback(this.isDark);
            } catch (error) {
                console.error('Error in theme subscriber:', error);
            }
        });
    }

    /**
     * Update meta theme color
     */
    updateMetaThemeColor() {
        const color = this.isDark 
            ? getComputedStyle(this.options.rootElement).getPropertyValue('--bg-primary-dark').trim()
            : getComputedStyle(this.options.rootElement).getPropertyValue('--bg-primary').trim();

        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'theme-color';
            document.head.appendChild(meta);
        }
        meta.content = color;
    }

    /**
     * Observe CSS variable changes
     */
    observeVariables() {
        // Create observer for style changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.attributeName === 'style') {
                    this.updateMetaThemeColor();
                }
            });
        });

        // Start observing
        observer.observe(this.options.rootElement, {
            attributes: true,
            attributeFilter: ['style']
        });
    }

    /**
     * Get CSS variable value
     */
    getVariable(name) {
        return getComputedStyle(this.options.rootElement)
            .getPropertyValue(name)
            .trim();
    }

    /**
     * Set CSS variable value
     */
    setVariable(name, value) {
        this.options.rootElement.style.setProperty(name, value);
    }

    /**
     * Remove CSS variable
     */
    removeVariable(name) {
        this.options.rootElement.style.removeProperty(name);
    }

    /**
     * Get all theme variables
     */
    getAllVariables() {
        const styles = getComputedStyle(this.options.rootElement);
        const variables = {};

        for (const prop of styles) {
            if (prop.startsWith('--')) {
                variables[prop] = styles.getPropertyValue(prop).trim();
            }
        }

        return variables;
    }

    /**
     * Create custom theme with overrides
     */
    createTheme(name, variables) {
        const selector = `[data-theme="${name}"]`;
        let style = document.querySelector(`style[data-theme="${name}"]`);
        
        if (!style) {
            style = document.createElement('style');
            style.setAttribute('data-theme', name);
            document.head.appendChild(style);
        }

        const rules = Object.entries(variables)
            .map(([key, value]) => `${key}: ${value};`)
            .join('\n');

        style.textContent = `
            ${selector} {
                ${rules}
            }
        `;

        return () => {
            style.remove();
        };
    }

    /**
     * Reset theme to system preference
     */
    reset() {
        localStorage.removeItem(this.options.storageKey);
        this.setTheme(this.mediaQuery.matches ? 'dark' : 'light');
    }

    /**
     * Check if system prefers dark theme
     */
    static systemPrefersDark() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    /**
     * Check if system supports dark mode
     */
    static isDarkModeSupported() {
        return window.matchMedia('(prefers-color-scheme)').media !== 'not all';
    }
}

// Create and export singleton instance
const theme = new Theme();
export default theme;