// frontend/js/views/HomeView.js
// HomeView component displays the dashboard

class HomeView {
    constructor() {
        this.container = document.getElementById('view-container');
        this.recentScans = [];
    }

    async render() {
        await this.loadRecentScans();
        
        this.container.innerHTML = `
            <div class="home-layout">
                <section class="quick-scan">
                    <div class="card">
                        <div class="card-header">
                            <h2>Quick Scan</h2>
                        </div>
                        <div class="card-body">
                            <form id="quick-scan-form">
                                <div class="form-group">
                                    <input type="url" 
                                           id="scan-url" 
                                           class="form-control" 
                                           placeholder="Enter website URL..."
                                           required>
                                </div>
                                <button type="submit" class="btn btn-primary">
                                    Start Scan
                                </button>
                            </form>
                        </div>
                    </div>
                </section>

                <section class="recent-scans">
                    <div class="card">
                        <div class="card-header">
                            <h2>Recent Scans</h2>
                        </div>
                        <div class="card-body">
                            ${this.renderRecentScans()}
                        </div>
                    </div>
                </section>

                <section class="scan-stats">
                    <div class="card">
                        <div class="card-header">
                            <h2>Statistics</h2>
                        </div>
                        <div class="card-body">
                            ${this.renderStats()}
                        </div>
                    </div>
                </section>
            </div>
        `;

        this.setupEventListeners();
    }

    async loadRecentScans() {
        try {
            const response = await api.get('/scans/recent');
            this.recentScans = response.items;
        } catch (error) {
            console.error('Error loading recent scans:', error);
            this.recentScans = [];
        }
    }

    renderRecentScans() {
        if (!this.recentScans.length) {
            return '<p class="no-data">No recent scans</p>';
        }

        return `
            <div class="scans-list">
                ${this.recentScans.map(scan => `
                    <div class="scan-item">
                        <div class="scan-info">
                            <a href="#/scans/${scan.uuid}" class="scan-url">
                                ${scan.original_url}
                            </a>
                            <span class="scan-date">
                                ${new Date(scan.start_time).toLocaleString()}
                            </span>
                        </div>
                        <div class="scan-meta">
                            <span class="scan-status ${scan.status.toLowerCase()}">
                                ${scan.status}
                            </span>
                            <span class="scan-stats">
                                ${scan.page_count} pages, 
                                ${scan.resource_count} resources
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderStats() {
        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Total Scans</h3>
                    <div class="stat-value">123</div>
                    <div class="stat-trend positive">+12% this week</div>
                </div>
                <div class="stat-card">
                    <h3>Resources Checked</h3>
                    <div class="stat-value">1,234</div>
                    <div class="stat-trend positive">+5% this week</div>
                </div>
                <div class="stat-card">
                    <h3>Issues Found</h3>
                    <div class="stat-value">56</div>
                    <div class="stat-trend negative">-8% this week</div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const form = document.getElementById('quick-scan-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.startQuickScan();
        });
    }

    async startQuickScan() {
        const urlInput = document.getElementById('scan-url');
        const url = urlInput.value;

        if (!url) {
            notification.warning('Please enter a URL');
            return;
        }

        try {
            const response = await api.post('/scans', {
                url,
                mode: 'quick',
                config: {
                    max_depth: 1,
                    screenshot_enabled: true
                }
            });

            // Redirect to scan results page
            window.location.hash = `#/scans/${response.scan_id}`;
            
        } catch (error) {
            notification.error('Failed to start scan');
            console.error('Scan error:', error);
        }
    }

    static init() {
        const view = new HomeView();
        view.render();
    }
}

window.HomeView = HomeView;