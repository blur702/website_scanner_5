// ResultsView.js - Display scan results with real-time updates
class ResultsView {
    constructor(scanId) {
        this.container = document.getElementById('view-container');
        this.scanId = scanId;
        this.currentTab = 'overview';
        this.refreshInterval = null;
        this.data = {
            status: null,
            resources: [],
            issues: [],
            screenshots: []
        };
    }

    async init(params) {
        this.scanId = params.id;
        await this.render();
        this.setupEventListeners();
        this.startStatusPolling();
    }

    async render() {
        this.container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h1 class="card-title">Scan Results</h1>
                    <div class="scan-status" id="scan-status">Loading...</div>
                </div>
                <div class="card-body">
                    <div class="tabs">
                        <button class="tab active" data-tab="overview">Overview</button>
                        <button class="tab" data-tab="resources">Resources</button>
                        <button class="tab" data-tab="issues">Issues</button>
                        <button class="tab" data-tab="screenshots">Screenshots</button>
                    </div>
                    <div id="tab-content"></div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        await this.loadScanStatus();
        await this.showTab('overview');

        // Start status refresh for active scans
        this.startStatusRefresh();
    }

    async loadScanStatus() {
        try {
            const status = await api.get(`/scan/${this.scanId}/status`);
            this.updateStatusDisplay(status);
        } catch (error) {
            Notification.show('Error loading scan status', 'error');
        }
    }

    updateStatusDisplay(status) {
        const statusEl = document.getElementById('scan-status');
        if (!statusEl) return;

        const statusClass = {
            'running': 'status-running',
            'completed': 'status-success',
            'failed': 'status-error'
        }[status.status] || '';

        statusEl.innerHTML = `
            <div class="scan-status-badge ${statusClass}">
                ${status.status.toUpperCase()}
            </div>
            <div class="scan-progress">
                <div class="progress">
                    <div class="progress-bar" style="width: ${status.progress}%"></div>
                </div>
                <div class="progress-text">${status.current_activity || ''}</div>
            </div>
        `;
    }

    startStatusRefresh() {
        this.refreshInterval = setInterval(() => {
            this.loadScanStatus();
        }, 5000);
    }

    stopStatusRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    renderCurrentTab() {
        switch(this.currentTab) {
            case 'overview':
                return this.renderOverviewTab();
            case 'resources':
                return this.renderResourcesTab();
            case 'validation':
                return this.renderValidationTab();
            case 'screenshots':
                return this.renderScreenshotsTab();
            case 'search':
                return this.renderSearchTab();
            default:
                return '<div>Tab not found</div>';
        }
    }

    renderOverviewTab() {
        const stats = this.data.stats || {};
        return `
            <div class="overview-tab">
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Resources</h3>
                        <div class="stat-value">${stats.totalResources || 0}</div>
                        <div class="stat-details">
                            <span>${stats.downloadedResources || 0} downloaded</span>
                            <span>${stats.failedResources || 0} failed</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <h3>Issues</h3>
                        <div class="stat-value">${stats.totalIssues || 0}</div>
                        <div class="stat-details">
                            <span class="critical">${stats.criticalIssues || 0} critical</span>
                            <span class="high">${stats.highIssues || 0} high</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <h3>Pages</h3>
                        <div class="stat-value">${stats.totalPages || 0}</div>
                        <div class="stat-details">
                            <span>${stats.htmlPages || 0} HTML</span>
                            <span>${stats.otherPages || 0} other</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <h3>Assets</h3>
                        <div class="stat-value">${stats.totalAssets || 0}</div>
                        <div class="stat-details">
                            <span>CSS: ${stats.cssFiles || 0}</span>
                            <span>JS: ${stats.jsFiles || 0}</span>
                        </div>
                    </div>
                </div>

                <div class="charts-grid">
                    <div class="chart-card">
                        <h3>Resource Distribution</h3>
                        <canvas id="resourceChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3>Issues by Severity</h3>
                        <canvas id="issuesChart"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    renderResourcesTab() {
        return `
            <div class="resources-tab">
                <div class="filters">
                    <div class="search-box">
                        <input type="text" id="resource-search" placeholder="Search resources...">
                    </div>
                    <div class="filter-group">
                        <select id="resource-type-filter">
                            <option value="all">All Types</option>
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                            <option value="js">JavaScript</option>
                            <option value="image">Images</option>
                        </select>
                        <select id="resource-status-filter">
                            <option value="all">All Status</option>
                            <option value="ok">Success</option>
                            <option value="error">Error</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                </div>

                <div class="resource-list">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>URL</th>
                                <th>Type</th>
                                <th>Size</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderResourceRows()}
                        </tbody>
                    </table>
                </div>

                <div class="pagination">
                    <!-- Pagination controls rendered by Table component -->
                </div>
            </div>
        `;
    }

    renderResourceRows() {
        return (this.data.resources || [])
            .map(resource => `
                <tr>
                    <td class="url-cell">
                        <div class="url-content">
                            <span class="resource-icon ${resource.type}"></span>
                            <span class="url-text">${resource.url}</span>
                        </div>
                    </td>
                    <td>${resource.type}</td>
                    <td>${this.formatSize(resource.size)}</td>
                    <td>
                        <span class="status-badge ${resource.status}">
                            ${resource.status}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon view-resource" data-id="${resource.id}">
                                <i class="icon-eye"></i>
                            </button>
                            <button class="btn-icon download-resource" data-id="${resource.id}">
                                <i class="icon-download"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
    }

    renderValidationTab() {
        return `
            <div class="validation-tab">
                <div class="filters">
                    <div class="search-box">
                        <input type="text" id="issue-search" placeholder="Search issues...">
                    </div>
                    <div class="filter-group">
                        <select id="severity-filter">
                            <option value="all">All Severities</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                </div>

                <div class="issues-list">
                    ${this.renderIssuesList()}
                </div>
            </div>
        `;
    }

    renderIssuesList() {
        return (this.data.issues || [])
            .map(issue => `
                <div class="issue-card ${issue.severity}">
                    <div class="issue-header">
                        <span class="severity-badge ${issue.severity}">${issue.severity}</span>
                        <h3>${issue.title}</h3>
                    </div>
                    <div class="issue-details">
                        <p>${issue.description}</p>
                        <div class="code-preview">
                            <pre><code>${this.escapeHtml(issue.code)}</code></pre>
                        </div>
                    </div>
                    <div class="issue-footer">
                        <span class="location">${issue.file}:${issue.line}</span>
                        <button class="btn-text show-context" data-id="${issue.id}">
                            Show Context
                        </button>
                    </div>
                </div>
            `).join('');
    }

    renderScreenshotsTab() {
        return `
            <div class="screenshots-tab">
                <div class="screenshots-grid">
                    ${this.renderScreenshotCards()}
                </div>
            </div>
        `;
    }

    renderScreenshotCards() {
        return (this.data.screenshots || [])
            .map(screenshot => `
                <div class="screenshot-card">
                    <div class="screenshot-preview">
                        <img src="${screenshot.thumbnailUrl}" 
                             alt="Screenshot of ${screenshot.url}"
                             data-full-url="${screenshot.fullUrl}"
                             class="open-screenshot">
                    </div>
                    <div class="screenshot-info">
                        <div class="screenshot-url">${screenshot.url}</div>
                        <div class="screenshot-meta">
                            <span>${screenshot.timestamp}</span>
                            <span>${screenshot.dimensions}</span>
                        </div>
                    </div>
                </div>
            `).join('');
    }

    renderSearchTab() {
        return `
            <div class="search-tab">
                <div class="search-controls">
                    <div class="search-input-group">
                        <input type="text" id="search-query" 
                               placeholder="Enter search query...">
                        <select id="search-type">
                            <option value="text">Text</option>
                            <option value="regex">Regex</option>
                        </select>
                        <button class="btn btn-primary" id="start-search">
                            Search
                        </button>
                    </div>
                    <div class="search-options">
                        <label>
                            <input type="checkbox" id="case-sensitive"> 
                            Case sensitive
                        </label>
                        <label>
                            <input type="checkbox" id="whole-word"> 
                            Whole word
                        </label>
                    </div>
                </div>

                <div class="search-results">
                    <!-- Search results will be populated here -->
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Tab switching
        this.container.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });

        // Export report
        this.container.querySelector('#export-report')?.addEventListener('click', 
            () => this.exportReport());

        // Take screenshot
        this.container.querySelector('#take-screenshot')?.addEventListener('click',
            () => this.takeScreenshot());

        // Resource actions
        this.container.querySelectorAll('.view-resource').forEach(button => {
            button.addEventListener('click', () => this.viewResource(button.dataset.id));
        });

        // Search functionality
        this.container.querySelector('#start-search')?.addEventListener('click',
            () => this.performSearch());

        // Screenshots viewer
        this.container.querySelectorAll('.open-screenshot').forEach(img => {
            img.addEventListener('click', () => this.openScreenshotViewer(img.dataset.fullUrl));
        });
    }

    async switchTab(tabName) {
        this.currentTab = tabName;
        await this.updateTabContent();
    }

    async updateTabContent() {
        const content = this.container.querySelector('.results-content');
        if (content) {
            content.innerHTML = this.renderCurrentTab();
            this.setupTabSpecificListeners();
        }
    }

    setupTabSpecificListeners() {
        // Set up any tab-specific event listeners
        switch(this.currentTab) {
            case 'overview':
                this.initializeCharts();
                break;
            case 'resources':
                this.initializeResourceFilters();
                break;
            case 'validation':
                this.initializeValidationFilters();
                break;
            case 'search':
                this.initializeSearchControls();
                break;
        }
    }

    startStatusPolling() {
        this.updateInterval = setInterval(async () => {
            await this.updateScanStatus();
        }, 2000);
    }

    async updateScanStatus() {
        try {
            const status = await api.get(`/scan/${this.scanId}/status`);
            
            // Update status data
            this.data.status = status.status;
            this.data.progress = status.progress;
            this.data.currentActivity = status.current_activity;

            // Update UI
            this.updateStatusUI(status);

            // Stop polling if scan is complete
            if (status.status === 'COMPLETED' || status.status === 'FAILED') {
                this.stopStatusPolling();
            }
        } catch (error) {
            console.error('Error updating scan status:', error);
        }
    }

    updateStatusUI(status) {
        // Update status indicator
        const indicator = this.container.querySelector('.status-indicator');
        if (indicator) {
            indicator.className = `status-indicator ${status.status.toLowerCase()}`;
            indicator.querySelector('.status-text').textContent = status.status;
        }

        // Update progress bar
        const progress = this.container.querySelector('.progress');
        if (progress) {
            progress.style.width = `${status.progress}%`;
        }

        // Update current activity
        const activity = this.container.querySelector('.current-activity');
        if (activity) {
            activity.textContent = status.current_activity;
        }
    }

    stopStatusPolling() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    async exportReport() {
        try {
            const response = await api.get(`/scan/${this.scanId}/report`);
            // Handle report download
            const blob = new Blob([response], { type: 'text/html' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scan-report-${this.scanId}.html`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            Notification.show('Error exporting report', 'error');
        }
    }

    async takeScreenshot() {
        try {
            const response = await api.post(`/scan/${this.scanId}/screenshot`);
            if (response.success) {
                Notification.show('Screenshot captured successfully', 'success');
                await this.updateTabContent(); // Refresh screenshots tab if active
            }
        } catch (error) {
            Notification.show('Error capturing screenshot', 'error');
        }
    }

    async viewResource(resourceId) {
        const resource = this.data.resources.find(r => r.id === resourceId);
        if (!resource) return;

        const modal = new Modal({
            title: 'Resource Details',
            content: await this.renderResourceDetails(resource),
            width: '80%',
            height: '80%'
        });

        modal.show();
    }

    async performSearch() {
        const query = this.container.querySelector('#search-query').value;
        const type = this.container.querySelector('#search-type').value;
        const caseSensitive = this.container.querySelector('#case-sensitive').checked;
        const wholeWord = this.container.querySelector('#whole-word').checked;

        try {
            const results = await api.post(`/scan/${this.scanId}/search`, {
                query,
                type,
                case_sensitive: caseSensitive,
                whole_word: wholeWord
            });

            this.renderSearchResults(results);
        } catch (error) {
            Notification.show('Error performing search', 'error');
        }
    }

    openScreenshotViewer(url) {
        const viewer = new ScreenshotViewer({
            url,
            download: true,
            fullscreen: true
        });
        viewer.show();
    }

    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    escapeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    destroy() {
        this.stopStatusPolling();
    }
}

window.ResultsView = ResultsView;