// frontend/js/views/SearchView.js
// Advanced search interface

class SearchView {
    constructor() {
        this.container = document.getElementById('view-container');
        this.searchForm = null;
        this.resultsContainer = null;
        this.searchInProgress = false;
        this.currentSearchId = null;
    }

    async render() {
        this.container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h1 class="card-title">Search Content</h1>
                </div>
                <div class="card-body">
                    <form id="search-form" class="search-form">
                        <div class="search-controls">
                            <div class="form-group">
                                <input type="text" id="search-query" 
                                       class="form-control" 
                                       placeholder="Enter search query..."
                                       required>
                            </div>
                            <div class="search-options">
                                <label class="checkbox">
                                    <input type="checkbox" id="regex-search"> 
                                    Use regex
                                </label>
                                <label class="checkbox">
                                    <input type="checkbox" id="case-sensitive"> 
                                    Case sensitive
                                </label>
                            </div>
                            <div class="content-filters">
                                <label>Search in:</label>
                                <div class="checkbox-group">
                                    <label class="checkbox">
                                        <input type="checkbox" name="content_types" 
                                               value="html" checked> HTML
                                    </label>
                                    <label class="checkbox">
                                        <input type="checkbox" name="content_types" 
                                               value="css"> CSS
                                    </label>
                                    <label class="checkbox">
                                        <input type="checkbox" name="content_types" 
                                               value="js"> JavaScript
                                    </label>
                                    <label class="checkbox">
                                        <input type="checkbox" name="content_types" 
                                               value="text"> Text
                                    </label>
                                </div>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary" id="search-button">
                            Search
                        </button>
                    </form>
                    
                    <div id="search-results" class="search-results"></div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.searchForm = document.getElementById('search-form');
        this.resultsContainer = document.getElementById('search-results');

        this.searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.performSearch();
        });
    }

    async performSearch() {
        if (this.searchInProgress) return;

        const query = document.getElementById('search-query').value;
        const useRegex = document.getElementById('regex-search').checked;
        const caseSensitive = document.getElementById('case-sensitive').checked;
        const contentTypes = Array.from(
            document.querySelectorAll('input[name="content_types"]:checked')
        ).map(input => input.value);

        if (!query.trim()) {
            notification.warning('Please enter a search query');
            return;
        }

        try {
            this.searchInProgress = true;
            this.updateSearchStatus('Searching...');

            const response = await api.post('/search', {
                query,
                regex: useRegex,
                case_sensitive: caseSensitive,
                content_types: contentTypes
            });

            this.currentSearchId = response.search_id;
            await this.pollSearchResults();

        } catch (error) {
            this.handleSearchError(error);
        } finally {
            this.searchInProgress = false;
        }
    }

    async pollSearchResults() {
        if (!this.currentSearchId) return;

        try {
            const results = await api.get(`/search/${this.currentSearchId}/results`);
            
            if (results.status === 'completed') {
                this.renderSearchResults(results);
            } else if (results.status === 'processing') {
                this.updateSearchStatus(`Processing... ${results.progress}%`);
                setTimeout(() => this.pollSearchResults(), 1000);
            } else {
                throw new Error('Search failed');
            }

        } catch (error) {
            this.handleSearchError(error);
        }
    }

    renderSearchResults(results) {
        if (!results.items.length) {
            this.resultsContainer.innerHTML = `
                <div class="no-results">
                    No matches found
                </div>
            `;
            return;
        }

        this.resultsContainer.innerHTML = `
            <div class="results-summary">
                Found ${results.total_matches} matches in ${results.execution_time.toFixed(2)}s
            </div>
            <div class="results-list">
                ${results.items.map(match => this.renderSearchMatch(match)).join('')}
            </div>
        `;
    }

    renderSearchMatch(match) {
        return `
            <div class="search-match">
                <div class="match-location">
                    <span class="match-type">${match.content_type}</span>
                    <a href="${match.url}" target="_blank">${match.url}</a>
                </div>
                <div class="match-context">
                    ${this.highlightMatch(match.context, match.match)}
                </div>
                <div class="match-details">
                    Line ${match.line_number}, Column ${match.column_number}
                </div>
            </div>
        `;
    }

    highlightMatch(context, match) {
        return context.replace(
            new RegExp(match, 'g'),
            `<mark class="match">${match}</mark>`
        );
    }

    updateSearchStatus(message) {
        this.resultsContainer.innerHTML = `
            <div class="search-status">
                <div class="spinner"></div>
                <div class="status-message">${message}</div>
            </div>
        `;
    }

    handleSearchError(error) {
        this.resultsContainer.innerHTML = `
            <div class="search-error">
                Error performing search: ${error.message}
            </div>
        `;
        notification.error('Search failed');
    }

    destroy() {
        // Cleanup
        this.currentSearchId = null;
        this.searchInProgress = false;
    }
}

window.SearchView = SearchView;