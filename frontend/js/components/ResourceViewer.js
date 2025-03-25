class ResourceViewer {
    constructor(options = {}) {
        this.options = {
            container: null,
            resource: null,
            onClose: null,
            ...options
        };
        
        this.modal = null;
        this.codeViewer = null;
        this.init();
    }

    init() {
        if (!this.options.container || !this.options.resource) {
            throw new Error('Container and resource are required');
        }

        this.render();
        this.setupEventListeners();
    }

    render() {
        const resource = this.options.resource;
        
        this.modal = new Modal({
            title: 'Resource Details',
            content: `
                <div class="resource-viewer">
                    <div class="resource-info">
                        <div class="info-group">
                            <label>URL</label>
                            <div class="url-display">
                                <span class="url-text">${resource.url}</span>
                                <button class="btn-icon copy-url" title="Copy URL">
                                    <i class="icon-copy"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="info-grid">
                            <div class="info-item">
                                <label>Type</label>
                                <span>${resource.type}</span>
                            </div>
                            <div class="info-item">
                                <label>Size</label>
                                <span>${this.formatSize(resource.size)}</span>
                            </div>
                            <div class="info-item">
                                <label>Status</label>
                                <span class="status-badge ${resource.status}">${resource.status}</span>
                            </div>
                            <div class="info-item">
                                <label>MIME Type</label>
                                <span>${resource.mime_type}</span>
                            </div>
                        </div>
                    </div>

                    <div class="resource-tabs">
                        <div class="tab-list" role="tablist">
                            <button role="tab" class="tab active" data-tab="content">Content</button>
                            <button role="tab" class="tab" data-tab="headers">Headers</button>
                            <button role="tab" class="tab" data-tab="validation">Validation</button>
                        </div>
                        
                        <div class="tab-panels">
                            <div role="tabpanel" class="tab-panel active" data-tab="content">
                                <div class="code-viewer"></div>
                            </div>
                            <div role="tabpanel" class="tab-panel" data-tab="headers">
                                ${this.renderHeaders(resource.headers)}
                            </div>
                            <div role="tabpanel" class="tab-panel" data-tab="validation">
                                ${this.renderValidation(resource.validation_issues)}
                            </div>
                        </div>
                    </div>
                </div>
            `
        });

        this.modal.show();
        
        // Initialize code viewer after modal is shown
        this.initializeCodeViewer(resource);
    }

    initializeCodeViewer(resource) {
        const container = this.modal.element.querySelector('.code-viewer');
        
        this.codeViewer = new CodeViewer({
            container,
            language: this.getLanguageForType(resource.type),
            readOnly: true
        });
        
        this.codeViewer.setValue(resource.content || 'No content available');
    }

    getLanguageForType(type) {
        const languageMap = {
            'html': 'html',
            'css': 'css',
            'javascript': 'javascript',
            'json': 'json',
            'xml': 'xml'
        };
        return languageMap[type.toLowerCase()] || 'plaintext';
    }

    renderHeaders(headers) {
        if (!headers || Object.keys(headers).length === 0) {
            return '<div class="empty-state">No headers available</div>';
        }

        return `
            <table class="headers-table">
                <thead>
                    <tr>
                        <th>Header</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(headers).map(([key, value]) => `
                        <tr>
                            <td>${key}</td>
                            <td>${value}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderValidation(issues) {
        if (!issues || issues.length === 0) {
            return '<div class="empty-state">No validation issues found</div>';
        }

        return `
            <div class="validation-issues">
                ${issues.map(issue => `
                    <div class="validation-issue ${issue.severity}">
                        <div class="issue-header">
                            <span class="severity-badge">${issue.severity}</span>
                            <span class="issue-message">${issue.message}</span>
                        </div>
                        ${issue.code ? `
                            <pre class="issue-code"><code>${issue.code}</code></pre>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    setupEventListeners() {
        // Tab switching
        const tabs = this.modal.element.querySelectorAll('[role="tab"]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Copy URL button
        const copyBtn = this.modal.element.querySelector('.copy-url');
        copyBtn?.addEventListener('click', () => this.copyUrl());
    }

    switchTab(tabId) {
        // Update active states
        this.modal.element.querySelectorAll('[role="tab"]').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        this.modal.element.querySelectorAll('[role="tabpanel"]').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.tab === tabId);
        });
    }

    async copyUrl() {
        const url = this.options.resource.url;
        try {
            await navigator.clipboard.writeText(url);
            notification.success('URL copied to clipboard');
        } catch (error) {
            notification.error('Failed to copy URL');
            console.error('Copy error:', error);
        }
    }

    destroy() {
        if (this.codeViewer) {
            this.codeViewer.destroy();
        }
        if (this.modal) {
            this.modal.destroy();
        }
    }
}

export default ResourceViewer;
