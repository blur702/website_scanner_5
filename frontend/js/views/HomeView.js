// frontend/js/views/HomeView.js
// HomeView component displays the dashboard

class HomeView {
    constructor() {
        this.container = document.getElementById('view-container');
    }
    
    render() {
        this.container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h1 class="card-title">Website Checker</h1>
                </div>
                <div class="card-body">
                    <p>Welcome to Website Checker! This tool helps you analyze websites for various issues.</p>
                    
                    <h2>Get Started</h2>
                    <p>Start by creating a new scan:</p>
                    <button class="btn btn-primary" id="new-scan-btn">New Scan</button>
                    
                    <h2>Recent Scans</h2>
                    <div id="recent-scans">Loading recent scans...</div>
                </div>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('new-scan-btn').addEventListener('click', () => {
            router.navigate('/scan');
        });
        
        // Simulate loading recent scans
        setTimeout(() => {
            document.getElementById('recent-scans').innerHTML = `
                <p>No recent scans found. Start by creating a new scan.</p>
            `;
        }, 1000);
    }
    
    static init() {
        const view = new HomeView();
        view.render();
    }
}

window.HomeView = HomeView;