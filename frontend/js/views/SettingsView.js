class SettingsView {
    constructor() {
        this.container = document.getElementById('view-container');
        this.form = null;
        this.currentSettings = null;
    }

    async render() {
        // Load current settings
        const settings = await api.get('/settings');
        this.currentSettings = settings;

        this.container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h1 class="card-title">Settings</h1>
                </div>
                <div class="card-body">
                    <form id="settings-form">
                        ${this.renderGeneralSettings()}
                        ${this.renderCrawlerSettings()}
                        ${this.renderScreenshotSettings()}
                        ${this.renderStorageSettings()}
                        
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                            <button type="button" class="btn btn-secondary" id="reset-defaults">
                                Reset to Defaults
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.form = document.getElementById('settings-form');
        this.setupEventListeners();
    }

    renderGeneralSettings() {
        return `
            <div class="settings-section">
                <h2>General Settings</h2>
                <div class="form-group">
                    <label>Default Scan Mode</label>
                    <select name="default_scan_mode" class="form-control">
                        <option value="full" ${this.currentSettings?.default_scan_mode === 'full' ? 'selected' : ''}>Full Scan</option>
                        <option value="single" ${this.currentSettings?.default_scan_mode === 'single' ? 'selected' : ''}>Single Page</option>
                        <option value="path" ${this.currentSettings?.default_scan_mode === 'path' ? 'selected' : ''}>Path Based</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Max Concurrent Requests</label>
                    <input type="number" name="max_concurrent_requests" 
                           value="${this.currentSettings?.max_concurrent_requests || 5}"
                           min="1" max="10" class="form-control">
                </div>
            </div>
        `;
    }

    renderCrawlerSettings() {
        return `
            <div class="settings-section">
                <h2>Crawler Settings</h2>
                <div class="form-group">
                    <label>Max Depth</label>
                    <input type="number" name="max_depth" 
                           value="${this.currentSettings?.max_depth || 3}"
                           min="1" max="10" class="form-control">
                </div>
                <div class="form-group">
                    <label>Respect robots.txt</label>
                    <input type="checkbox" name="respect_robots_txt"
                           ${this.currentSettings?.respect_robots_txt ? 'checked' : ''}>
                </div>
            </div>
        `;
    }

    renderScreenshotSettings() {
        return `
            <div class="settings-section">
                <h2>Screenshot Settings</h2>
                <div class="form-group">
                    <label>Default Screenshot Width</label>
                    <input type="number" name="screenshot_width" 
                           value="${this.currentSettings?.screenshot_width || 1920}"
                           class="form-control">
                </div>
                <div class="form-group">
                    <label>Default Screenshot Height</label>
                    <input type="number" name="screenshot_height"
                           value="${this.currentSettings?.screenshot_height || 1080}"
                           class="form-control">
                </div>
            </div>
        `;
    }

    renderStorageSettings() {
        return `
            <div class="settings-section">
                <h2>Storage Settings</h2>
                <div class="form-group">
                    <label>Cache Duration (days)</label>
                    <input type="number" name="cache_duration"
                           value="${this.currentSettings?.cache_duration || 7}"
                           min="1" max="30" class="form-control">
                </div>
                <div class="form-group">
                    <label>Auto-cleanup old scans</label>
                    <input type="checkbox" name="auto_cleanup"
                           ${this.currentSettings?.auto_cleanup ? 'checked' : ''}>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveSettings();
        });

        document.getElementById('reset-defaults')?.addEventListener('click', async () => {
            if (confirm('Reset all settings to default values?')) {
                await this.resetSettings();
            }
        });
    }

    async saveSettings() {
        try {
            const formData = new FormData(this.form);
            const settings = Object.fromEntries(formData.entries());
            
            // Convert checkbox values to booleans
            settings.respect_robots_txt = formData.has('respect_robots_txt');
            settings.auto_cleanup = formData.has('auto_cleanup');
            
            // Convert numeric values
            ['max_concurrent_requests', 'max_depth', 'screenshot_width', 
             'screenshot_height', 'cache_duration'].forEach(key => {
                settings[key] = parseInt(settings[key], 10);
            });

            await api.put('/settings', settings);
            notification.success('Settings saved successfully');
            
        } catch (error) {
            notification.error('Failed to save settings');
            console.error('Settings save error:', error);
        }
    }

    async resetSettings() {
        try {
            await api.post('/settings/reset');
            this.currentSettings = await api.get('/settings');
            await this.render();
            notification.success('Settings reset to defaults');
            
        } catch (error) {
            notification.error('Failed to reset settings');
            console.error('Settings reset error:', error);
        }
    }
}

window.SettingsView = SettingsView;