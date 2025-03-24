// frontend/js/views/ResultsView.js
// Scan results page

const ResultsView = {
  init: () => {
    const app = document.getElementById('app');
    app.innerHTML = `
      <h1>Scan Results</h1>
      <div class="tabs">
        <div class="tab-buttons">
          <button class="tab-button active" data-tab="resources">Resources</button>
          <button class="tab-button" data-tab="issues">Issues</button>
          <button class="tab-button" data-tab="search">Search</button>
          <button class="tab-button" data-tab="stats">Stats</button>
        </div>

        <div class="tab-contents">
          <div class="tab-content active" data-tab="resources">
            <h2>Resources</h2>
            <ul>
              <li><a href="#">example.com/index.html</a></li>
              <li><a href="#">example.com/style.css</a></li>
            </ul>
          </div>
          <div class="tab-content" data-tab="issues">
            <h2>Issues</h2>
            <ul>
              <li><a href="#">Missing alt attribute</a></li>
              <li><a href="#">Deprecated HTML tag</a></li>
            </ul>
          </div>
          <div class="tab-content" data-tab="search">
            <h2>Search</h2>
            <input type="text" placeholder="Search...">
            <button>Search</button>
          </div>
          <div class="tab-content" data-tab="stats">
            <h2>Stats</h2>
            <p>Total resources: 10</p>
            <p>Total issues: 2</p>
          </div>
        </div>
      </div>
    `;

    Tabs.init();
  },
};

window.ResultsView = ResultsView;