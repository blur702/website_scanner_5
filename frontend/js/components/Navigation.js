// frontend/js/components/Navigation.js
// Site navigation component

class Navigation {
    constructor() {
        this.links = [
            { path: '/', text: 'Home', icon: '🏠' },
            { path: '/scan', text: 'New Scan', icon: '🔍' },
            { path: '/results', text: 'Results', icon: '📊' },
            { path: '/search', text: 'Search', icon: '🔎' },
            { path: '/db-browser', text: 'Database', icon: '📁' },  // Add this line
            { path: '/settings', text: 'Settings', icon: '⚙️' }
        ];
    }
    
    init() {
        // Render main navigation
        this.renderMainNav();
        
        // Render sidebar navigation
        this.renderSidebar();
        
        // Add event listeners to nav items
        this.addEventListeners();
    }
    
    renderMainNav() {
        const mainNav = document.querySelector('.main-nav');
        if (!mainNav) return;
        
        let html = '<ul class="nav nav-horizontal">';
        this.links.forEach(link => {
            html += `<li class="nav-item">
                <a href="${link.path}" class="nav-link" data-path="${link.path}">
                    ${link.text}
                </a>
            </li>`;
        });
        html += '</ul>';
        
        mainNav.innerHTML = html;
    }
    
    renderSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        
        let html = '<ul class="nav">';
        this.links.forEach(link => {
            html += `<li class="nav-item">
                <a href="${link.path}" class="nav-link" data-path="${link.path}">
                    <span class="icon">${link.icon}</span>
                    <span class="nav-text">${link.text}</span>
                </a>
            </li>`;
        });
        html += '</ul>';
        
        sidebar.innerHTML = html;
    }
    
    addEventListeners() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const path = link.getAttribute('data-path');
                router.navigate(path);
                this.updateActiveLinks(path);
            });
        });
        
        // Set active link based on current path
        this.updateActiveLinks(window.location.pathname);
    }
    
    updateActiveLinks(path) {
        document.querySelectorAll('.nav-link').forEach(link => {
            const linkPath = link.getAttribute('data-path');
            if (linkPath === path) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
}

window.Navigation = Navigation;