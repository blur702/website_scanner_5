// SentimentView component handles sentiment analysis visualization

class SentimentView {
    constructor() {
        this.container = document.getElementById('view-container');
        this.scanId = new URLSearchParams(window.location.search).get('id');
    }
    
    async render() {
        if (!this.scanId) {
            this.container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h1 class="card-title">Sentiment Analysis</h1>
                    </div>
                    <div class="card-body">
                        <p>No scan selected. Please select a scan from the results page.</p>
                        <button class="btn btn-primary" onclick="router.navigate('/results')">Go to Results</button>
                    </div>
                </div>
            `;
            return;
        }
        
        // Show loading state
        this.container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h1 class="card-title">Sentiment Analysis</h1>
                </div>
                <div class="card-body">
                    <p>Loading sentiment data...</p>
                    <div class="progress">
                        <div class="progress-bar" style="width: 50%"></div>
                    </div>
                </div>
            </div>
        `;
        
        try {
            // Fetch sentiment data from API
            const sentimentData = await this.fetchSentimentData(this.scanId);
            this.renderSentimentAnalysis(sentimentData);
        } catch (error) {
            this.container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h1 class="card-title">Sentiment Analysis</h1>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-error">
                            <p>Error loading sentiment data: ${error.message}</p>
                        </div>
                        <button class="btn btn-primary" onclick="this.render()">Retry</button>
                    </div>
                </div>
            `;
        }
    }
    
    async fetchSentimentData(scanId) {
        // In a real implementation, this would fetch data from the API
        // For now, return mock data
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        
        return {
            overallSentiment: {
                score: 0.65,
                label: "Positive",
                confidence: 0.82
            },
            pagesSummary: [
                { url: "https://example.com", sentiment: "Very Positive", score: 0.85 },
                { url: "https://example.com/about", sentiment: "Positive", score: 0.65 },
                { url: "https://example.com/contact", sentiment: "Neutral", score: 0.12 },
                { url: "https://example.com/blog/1", sentiment: "Negative", score: -0.45 },
                { url: "https://example.com/blog/2", sentiment: "Positive", score: 0.72 }
            ],
            emotions: {
                happiness: 45,
                surprise: 15,
                sadness: 10,
                anger: 5,
                fear: 5,
                disgust: 2,
                neutral: 18
            },
            keywordsByEmotion: {
                positive: ["amazing", "excellent", "innovative", "helpful", "friendly"],
                negative: ["problem", "issue", "difficult", "fail", "wrong"],
                neutral: ["information", "details", "contact", "process", "service"]
            }
        };
    }
    
    renderSentimentAnalysis(data) {
        this.container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h1 class="card-title">Sentiment Analysis</h1>
                </div>
                <div class="card-body">
                    <div class="summary-section">
                        <h2>Overall Sentiment</h2>
                        <div class="sentiment-meter">
                            <div class="sentiment-gauge" style="width: ${Math.abs(data.overallSentiment.score) * 100}%; 
                                background-color: ${data.overallSentiment.score >= 0 ? 'var(--color-success)' : 'var(--color-error)'}">
                            </div>
                            <div class="sentiment-label">${data.overallSentiment.label} (${data.overallSentiment.score.toFixed(2)})</div>
                            <div class="sentiment-confidence">Confidence: ${(data.overallSentiment.confidence * 100).toFixed(0)}%</div>
                        </div>
                    </div>
                    
                    <!-- Additional sections would go here -->
                </div>
            </div>
        `;
    }
