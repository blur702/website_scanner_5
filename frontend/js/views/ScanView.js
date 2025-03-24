// ScanView component handles creating new scans

class ScanView {
    constructor() {
        this.container = document.getElementById('view-container');
        this.currentMode = 'full'; // Default mode
        this.modeDescriptions = {
            full: "Crawl an entire website, following all internal links up to a specified depth.",
            design: "Download a single page with its CSS and assets for offline editing.",
            single: "Analyze just one page without crawling beyond it.",
            path: "Limit scanning to URLs matching specific path patterns.",
            regex: "Filter scanned URLs using custom regular expressions."
        };
    }
    
    render() {
        this.container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h1 class="card-title">New Scan</h1>
                </div>
                <div class="card-body">
                    <form id="scan-form">
                        <div class="form-group">
                            <label for="url" class="form-label">Website URL</label>
                            <input type="url" id="url" class="form-control" placeholder="https://example.com" required>
                            <span class="form-hint">Enter the full URL including http:// or https://</span>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Scan Mode</label>
                            <div class="mode-selector">
                                <div class="mode-options">
                                    <div class="mode-option ${this.currentMode === 'full' ? 'active' : ''}" data-mode="full">
                                        <div class="mode-header">
                                            <span class="mode-icon">🌐</span>
                                            <span class="mode-name">Full Website</span>
                                        </div>
                                    </div>
                                    <div class="mode-option ${this.currentMode === 'design' ? 'active' : ''}" data-mode="design">
                                        <div class="mode-header">
                                            <span class="mode-icon">🎨</span>
                                            <span class="mode-name">Design Mode</span>
                                        </div>
                                    </div>
                                    <div class="mode-option ${this.currentMode === 'single' ? 'active' : ''}" data-mode="single">
                                        <div class="mode-header">
                                            <span class="mode-icon">📄</span>
                                            <span class="mode-name">Single Page</span>
                                        </div>
                                    </div>
                                    <div class="mode-option ${this.currentMode === 'path' ? 'active' : ''}" data-mode="path">
                                        <div class="mode-header">
                                            <span class="mode-icon">🔍</span>
                                            <span class="mode-name">Path Restricted</span>
                                        </div>
                                    </div>
                                    <div class="mode-option ${this.currentMode === 'regex' ? 'active' : ''}" data-mode="regex">
                                        <div class="mode-header">
                                            <span class="mode-icon">⚙️</span>
                                            <span class="mode-name">Regex Filtered</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="mode-description">
                                    <p id="mode-description">${this.modeDescriptions[this.currentMode]}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Mode-specific settings -->
                        <div id="mode-settings">
                            ${this.renderModeSettings(this.currentMode)}
                        </div>
                        
                        <div class="form-group">
                            <h3>Advanced Settings</h3>
                            <div class="form-row">
                                <div class="form-col">
                                    <label for="max_depth" class="form-label">Maximum Depth</label>
                                    <input type="number" id="max_depth" class="form-control" min="1" max="10" value="3">
                                </div>
                                <div class="form-col">
                                    <label for="max_urls" class="form-label">Maximum URLs</label>
                                    <input type="number" id="max_urls" class="form-control" min="1" max="10000" value="100">
                                </div>
                            </div>
                            
                            <div class="form-check">
                                <input type="checkbox" id="screenshots" class="form-check-input" checked>
                                <label for="screenshots" class="form-check-label">Take screenshots of pages</label>
                            </div>
                            
                            <div class="form-check">
                                <input type="checkbox" id="robots" class="form-check-input" checked>
                                <label for="robots" class="form-check-label">Respect robots.txt</label>
                            </div>
                        </div>
                        
                        <div class="form-group mt-lg">
                            <button type="submit" id="start-scan" class="btn btn-primary">Start Scan</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Add event listeners
        document.querySelectorAll('.mode-option').forEach(option => {
            option.addEventListener('click', () => this.setMode(option.dataset.mode));
        });
        
        document.getElementById('scan-form').addEventListener('submit', this.handleSubmit.bind(this));
    }
    
    renderModeSettings(mode) {
        switch (mode) {
            case 'full':
                return `
                    <div class="form-group">
                        <div class="form-check">
                            <input type="checkbox" id="follow_external" class="form-check-input">
                            <label for="follow_external" class="form-check-label">Follow external links</label>
                        </div>
                    </div>
                `;
            case 'design':
                return `
                    <div class="form-group">
                        <div class="form-check">
                            <input type="checkbox" id="consolidate_css" class="form-check-input" checked>
                            <label for="consolidate_css" class="form-check-label">Consolidate CSS files</label>
                        </div>
                    </div>
                `;
            case 'path':
                return `
                    <div class="form-group">
                        <label for="path_restriction" class="form-label">Path Restriction</label>
                        <input type="text" id="path_restriction" class="form-control" placeholder="/blog/">
                        <span class="form-hint">Only scan URLs matching this path (e.g., /blog/)</span>
                    </div>
                `;
            case 'regex':
                return `
                    <div class="form-group">
                        <label for="regex_pattern" class="form-label">Regex Pattern</label>
                        <div class="form-row">
                            <div class="form-col-9">
                                <input type="text" id="regex_pattern" class="form-control" placeholder=".*\\.html$">
                            </div>
                            <div class="form-col-3">
                                <select id="regex_type" class="form-control">
                                    <option value="inclusive">Include matching</option>
                                    <option value="exclusive">Exclude matching</option>
                                </select>
                            </div>
                        </div>
                        <span class="form-hint">Filter URLs using regular expressions</span>
                    </div>
                    <div class="form-group">
                        <button type="button" id="test-regex" class="btn btn-outline">Test Regex</button>
                    </div>
                `;
            case 'single':
            default:
                return `
                    <div class="form-group">
                        <p class="form-hint">Only the provided URL will be processed, no further crawling.</p>
                    </div>
                `;
        }
    }
    
    setMode(mode) {
        this.currentMode = mode;
        
        // Update UI
        document.querySelectorAll('.mode-option').forEach(option => {
            option.classList.toggle('active', option.dataset.mode === mode);
        });
        
        document.getElementById('mode-description').textContent = this.modeDescriptions[mode];
        document.getElementById('mode-settings').innerHTML = this.renderModeSettings(mode);
        
        // Add event listener for regex test if in regex mode
        if (mode === 'regex') {
            document.getElementById('test-regex').addEventListener('click', this.testRegex.bind(this));
        }
    }
    
    async testRegex() {
        const pattern = document.getElementById('regex_pattern').value;
        if (!pattern) {
            Notification.show('Please enter a regex pattern to test', 'warning');
            return;
        }
        
        try {
            // Test regex with some sample URLs
            const testUrls = [
                'https://example.com/index.html',
                'https://example.com/blog/post1.html',
                'https://example.com/products/item.php',
                'https://example.com/about.html',
                'https://example.com/images/logo.png'
            ];
            
            // In a real app, we'd call an API to test the regex
            // For now, just simulate it
            const matchingUrls = testUrls.filter(url => {
                try {
                    return new RegExp(pattern).test(url);
                } catch (e) {
                    return false;
                }
            });
            
            // Show results
            const modal = document.createElement('div');
            modal.classList.add('modal');
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Regex Test Results</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <h4>Pattern: ${pattern}</h4>
                        <p>${matchingUrls.length} of ${testUrls.length} URLs matched</p>
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>URL</th>
                                    <th>Result</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${testUrls.map(url => {
                                    const matches = matchingUrls.includes(url);
                                    return `<tr>
                                        <td>${url}</td>
                                        <td class="${matches ? 'text-success' : 'text-error'}">${matches ? 'Match' : 'No match'}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('show'), 10);
            
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            });
            
        } catch (error) {
            Notification.show('Invalid regex pattern: ' + error.message, 'error');
        }
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        const url = document.getElementById('url').value;
        const mode = this.currentMode;
        
        // Collect basic settings
        const config = {
            max_depth: parseInt(document.getElementById('max_depth').value, 10),
            max_urls: parseInt(document.getElementById('max_urls').value, 10),
            screenshot_enabled: document.getElementById('screenshots').checked,
            respect_robots_txt: document.getElementById('robots').checked
        };
        
        // Collect mode-specific settings
        if (mode === 'full') {
            config.follow_external_links = document.getElementById('follow_external').checked;
        } else if (mode === 'design') {
            config.consolidate_css = document.getElementById('consolidate_css').checked;
        } else if (mode === 'path') {
            config.path_restriction = document.getElementById('path_restriction').value;
        } else if (mode === 'regex') {
            config.regex_pattern = document.getElementById('regex_pattern').value;
            config.regex_is_inclusive = document.getElementById('regex_type').value === 'inclusive';
        }
        
        // Show notification
        Notification.show(`Starting ${mode} scan of ${url}...`, 'info');
        
        try {
            // Create scan payload
            const scanData = {
                url: url,
                mode: mode,
                config: config,
                name: `${mode.charAt(0).toUpperCase() + mode.slice(1)} scan of ${new URL(url).hostname}`
            };
            
            // Send to API
            const response = await api.post('/scan', scanData);
            
            // Show success notification
            Notification.show('Scan started successfully!', 'success');
            
            // Redirect to results view
            setTimeout(() => {
                router.navigate(`/results/${response.uuid}`);
            }, 1500);
            
        } catch (error) {
            Notification.show(`Error starting scan: ${error.message}`, 'error');
        }
    }
    
    static init() {
        const view = new ScanView();
        view.render();
    }
}

window.ScanView = ScanView;