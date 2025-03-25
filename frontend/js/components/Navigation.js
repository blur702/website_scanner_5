/**
 * Navigation Component
 * Handles main navigation menu and user actions
 */
class Navigation {
    constructor(options = {}) {
        this.options = {
            container: null,
            onThemeToggle: null,
            onSearch: null,
            onUserAction: null,
            activeClass: 'active',
            ...options
        };

        this.state = {
            isSidebarOpen: false,
            isSearchOpen: false,
            currentPath: window.location.pathname
        };

        // Store bound event handlers
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleRouteChange = this.handleRouteChange.bind(this);

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateActiveLink();
        this.setupUserMenu();
        this.setupMobileMenu();
    }

    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                if (this.options.onThemeToggle) {
                    this.options.onThemeToggle();
                }
            });
        }

        // Search button
        const searchButton = document.getElementById('searchButton');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                this.toggleSearch();
            });
        }

        // User menu
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserMenu();
            });
        }

        // Handle navigation clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('.nav-link');
            if (link) {
                this.handleNavigation(link);
            }
        });

        // Close menus on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                this.closeUserMenu();
            }
            if (!e.target.closest('.search-panel')) {
                this.closeSearch();
            }
        });

        // Handle route changes
        window.addEventListener('popstate', () => {
            this.updateActiveLink();
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAll();
            }
        });
    }

    setupUserMenu() {
        const userMenu = document.getElementById('userMenu');
        if (!userMenu) return;

        const menu = document.createElement('div');
        menu.className = 'user-menu-dropdown';
        menu.innerHTML = `
            <div class="user-menu-header">
                <div class="user-info">
                    <div class="user-name">John Doe</div>
                    <div class="user-email">john@example.com</div>
                </div>
            </div>
            <div class="user-menu-items">
                <a href="/settings" class="menu-item">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5z"/>
                        <path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5"/>
                    </svg>
                    Settings
                </a>
                <button class="menu-item" data-action="logout">
                    <svg viewBox="0 0 24 24">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Logout
                </button>
            </div>
        `;

        userMenu.parentNode.appendChild(menu);

        // Handle menu item clicks
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action && this.options.onUserAction) {
                this.options.onUserAction(action);
            }
        });
    }

    setupMobileMenu() {
        const menuButton = document.createElement('button');
        menuButton.className = 'mobile-menu-button';
        menuButton.setAttribute('aria-label', 'Toggle menu');
        menuButton.innerHTML = `
            <svg viewBox="0 0 24 24">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
        `;

        const nav = document.querySelector('.main-nav');
        if (nav) {
            nav.insertBefore(menuButton, nav.firstChild);
            menuButton.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }
    }

    handleNavigation(link) {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('http')) return;

        // Update active state
        this.state.currentPath = href;
        this.updateActiveLink();

        // Close mobile menu
        if (this.state.isSidebarOpen) {
            this.closeSidebar();
        }
    }

    updateActiveLink() {
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            const isActive = href === this.state.currentPath;
            link.classList.toggle(this.options.activeClass, isActive);
            link.setAttribute('aria-current', isActive ? 'page' : null);
        });
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        this.state.isSidebarOpen = !this.state.isSidebarOpen;
        sidebar.classList.toggle('open', this.state.isSidebarOpen);
        document.body.style.overflow = this.state.isSidebarOpen ? 'hidden' : '';
    }

    closeSidebar() {
        if (!this.state.isSidebarOpen) return;
        
        this.state.isSidebarOpen = false;
        document.getElementById('sidebar')?.classList.remove('open');
        document.body.style.overflow = '';
    }

    toggleUserMenu() {
        const menu = document.querySelector('.user-menu-dropdown');
        if (!menu) return;

        const isOpen = menu.classList.contains('open');
        if (isOpen) {
            this.closeUserMenu();
        } else {
            this.closeSearch();
            menu.classList.add('open');
        }
    }

    closeUserMenu() {
        document.querySelector('.user-menu-dropdown')?.classList.remove('open');
    }

    toggleSearch() {
        if (this.state.isSearchOpen) {
            this.closeSearch();
        } else {
            this.closeUserMenu();
            this.state.isSearchOpen = true;
            if (this.options.onSearch) {
                this.options.onSearch(true);
            }
        }
    }

    closeSearch() {
        if (!this.state.isSearchOpen) return;
        
        this.state.isSearchOpen = false;
        if (this.options.onSearch) {
            this.options.onSearch(false);
        }
    }

    closeAll() {
        this.closeSidebar();
        this.closeUserMenu();
        this.closeSearch();
    }

    destroy() {
        // Remove event listeners
        document.removeEventListener('click', this.handleOutsideClick);
        document.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('popstate', this.handleRouteChange);
        
        // Clean up menus
        this.closeAll();
        
        // Remove dropdown menu element
        const menu = document.querySelector('.user-menu-dropdown');
        if (menu) {
            menu.remove();
        }
    }
}

export default Navigation;