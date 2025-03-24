// frontend/js/core/api.js
// API service for communicating with the backend

const api = {
get: async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('GET request failed:', error);
    throw error;
  }
},
post: async (url, data) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('POST request failed:', error);
    throw error;
  }
},
put: async (url, data) => {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('PUT request failed:', error);
    throw error;
  }
},
delete: async (url) => {
  try {
    const response = await fetch(url, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('DELETE request failed:', error);
    throw error;
  }
},
};

module.exports = api;// frontend/js/core/router.js
// SPA router for handling navigation

const router = {
  routes: {},
  addRoute: (path, callback) => {
    router.routes[path] = callback;
  },
navigate: (path) => {
  history.pushState(null, null, path);
  router.handleRoute();
},
handleRoute: () => {
  const path = window.location.pathname;
  const callback = router.routes[path];
  if (callback) {
    callback();
  } else {
    // TODO: Implement 404 page
    console.log('404 Not Found');
  }
},
};

module.exports = router;// frontend/js/core/store.js
// State management for the application

const store = {
  state: {},
  listeners: [],
  setState: (newState) => {
    store.state = { ...store.state, ...newState };
    store.listeners.forEach((listener) => listener(store.state));
  },
  subscribe: (listener) => {
    store.listeners.push(listener);
    return () => {
      store.listeners = store.listeners.filter((l) => l !== listener);
    };
  },
};

module.exports = store;// frontend/js/core/utils.js
// Utility functions

const utils = {
  formatDate: (date) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString(undefined, options);
  },
  validateData: (data) => {
    // TODO: Implement more robust data validation
    if (!data) {
      return false;
    }
    return true;
  },
};

module.exports = utils;// frontend/js/components/Navigation.js
// Site navigation component

const Navigation = {
  init: () => {
    // Implement sidebar navigation with collapsible sections
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.querySelector('.sidebar-toggle');

    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });

    // Handle active state for current route
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      if (link.getAttribute('href') === window.location.pathname) {
        link.classList.add('active');
      }
    });
  },
};

module.exports = Navigation;// frontend/js/components/Modal.js
// Modal dialog component

const Modal = {
  open: (content) => {
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.innerHTML = `
      <div class="modal-content">
        <span class="modal-close">&times;</span>
        ${content}
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', Modal.close);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        Modal.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        Modal.close();
      }
    });
  },
  close: () => {
    const modal = document.querySelector('.modal');
    if (modal) {
      modal.remove();
    }
  },
};

module.exports = Modal;// frontend/js/components/Dropdown.js
// Dropdown menu component

const Dropdown = {
  init: () => {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
      const trigger = dropdown.querySelector('.dropdown-trigger');
      const menu = dropdown.querySelector('.dropdown-menu');

      trigger.addEventListener('click', () => {
        dropdown.classList.toggle('active');
      });

      document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
          dropdown.classList.remove('active');
        }
      });
    });
  },
};

module.exports = Dropdown;// frontend/js/components/Form.js
// Form handling component

const Form = {
  init: () => {
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        Form.submit(form);
      });
    });
  },
  validate: (form) => {
    // TODO: Implement more robust form validation
    return true;
  },
  submit: async (form) => {
    if (!Form.validate(form)) {
      return;
    }

    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    // TODO: Implement AJAX form submission
    console.log('Form data:', data);
  },
};

module.exports = Form;// frontend/js/components/Tabs.js
// Tab interface component

const Tabs = {
  init: () => {
    document.querySelectorAll('.tabs').forEach(tabs => {
      const tabButtons = tabs.querySelectorAll('.tab-button');
      const tabContents = tabs.querySelectorAll('.tab-content');

      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          const tabId = button.dataset.tab;
          Tabs.switchTab(tabs, tabId, tabButtons, tabContents);
        });
      });
    });
  },
  switchTab: (tabs, tabId, tabButtons, tabContents) => {
    tabButtons.forEach(button => {
      button.classList.remove('active');
    });
    tabContents.forEach(content => {
      content.classList.remove('active');
    });

    tabs.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
    tabs.querySelector(`.tab-content[data-tab="${tabId}"]`).classList.add('active');
  },
};

module.exports = Tabs;// frontend/js/components/Table.js
// Data table component

const Table = {
 init: () => {
    document.querySelectorAll('.table-container').forEach(tableContainer => {
      const table = tableContainer.querySelector('table');
      const headers = table.querySelectorAll('th');
      const rows = table.querySelectorAll('tbody tr');

      headers.forEach(header => {
        header.addEventListener('click', () => {
          const column = header.cellIndex;
          Table.sort(table, column, header);
        });
      });

      // TODO: Implement pagination
    });
  },
  sort: (table, column, header) => {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const isAsc = header.classList.contains('asc');

    rows.sort((a, b) => {
      const aValue = a.cells[column].textContent;
      const bValue = b.cells[column].textContent;

      if (isAsc) {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));

    header.classList.toggle('asc');
  },
  paginate: (page) => {
    // TODO: Implement table pagination
  },
};

module.exports = Table;// frontend/js/components/Notification.js
// Toast notifications component

const Notification = {
  show: (message, type) => {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.classList.add(type);
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  },
};

module.exports = Notification;// frontend/js/components/ScreenshotViewer.js
// Screenshot viewer component

const ScreenshotViewer = {
  init: () => {
    // TODO: Implement screenshot viewer initialization
  },
  open: (screenshotId) => {
    // TODO: Implement screenshot opening
  },
};

module.exports = ScreenshotViewer;// frontend/js/components/CodeViewer.js
// Code snippet viewer

const CodeViewer = {
  init: () => {
    document.querySelectorAll('.code-viewer').forEach(codeViewer => {
      const codeElement = codeViewer.querySelector('code');
      const copyButton = codeViewer.querySelector('.copy-button');

      if (codeElement) {
        const code = codeElement.textContent;
        const highlightedCode = CodeViewer.highlight(code);
        codeElement.innerHTML = highlightedCode;
      }

      if (copyButton) {
        copyButton.addEventListener('click', () => {
          const code = codeElement.textContent;
          CodeViewer.copyToClipboard(code);
        });
      }
    });
  },
  highlight: (code) => {
    // Basic HTML syntax highlighting
    code = code.replace(/&/g, '&amp;');
    code = code.replace(/</g, '&lt;');
    code = code.replace(/>/g, '&gt;');
    code = code.replace(/"/g, '&quot;');
    code = code.replace(/'/g, '&#039;');
    code = code.replace(/(\/\/.*)/g, '<span class="comment">$1</span>');
    code = code.replace(/(&lt;[a-zA-Z]+&gt;)/g, '<span class="tag">$1</span>');
    return code;
  },
  copyToClipboard: (code) => {
    navigator.clipboard.writeText(code);
    Notification.show('Code copied to clipboard', 'success');
  },
};

module.exports = CodeViewer;// frontend/js/views/HomeView.js
// Landing page

const HomeView = {
  init: () => {
    const app = document.getElementById('app');
    app.innerHTML = `
      <h1>Website Checker</h1>
      <form id="scan-form">
        <input type="url" id="url" placeholder="Enter URL to scan" required>
        <button type="submit">Scan</button>
      </form>
      <div id="recent-scans">
        <h2>Recent Scans</h2>
        <ul>
          <li><a href="#">example.com</a></li>
          <li><a href="#">example.org</a></li>
        </ul>
      </div>
    `;

    const scanForm = document.getElementById('scan-form');
    scanForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const url = document.getElementById('url').value;
      
      try {
        const scanData = { url: url };
        const response = await api.post('/scan', scanData);
        console.log('Scan started:', response);
        router.navigate(`/scan?uuid=${response.uuid}`);
      } catch (error) {
        console.error('Error starting scan:', error);
        Notification.show('Error starting scan', 'error');
      }
    });
  },
};

module.exports = HomeView;// frontend/js/views/ScanView.js
// Active scan page

const ScanView = {
  init: () => {
    const urlParams = new URLSearchParams(window.location.search);
    const url = urlParams.get('url');

    const app = document.getElementById('app');
    app.innerHTML = `
      <h1>Scanning ${url}</h1>
      <div id="scan-progress">
        <p>Scanning in progress...</p>
        <button id="cancel-scan">Cancel</button>
      </div>
    `;

    const cancelScanButton = document.getElementById('cancel-scan');
    cancelScanButton.addEventListener('click', () => {
      // TODO: Implement cancel scan functionality
      alert('Cancel scan functionality not implemented yet.');
    });

    const uuid = urlParams.get('uuid');
    const getScanStatus = async () => {
      try {
        const response = await api.get(`/scan/${uuid}/status`);
        console.log('Scan status:', response);
        document.getElementById('scan-progress').innerHTML = `
          <p>Status: ${response.status}</p>
          <p>Progress: ${response.progress}%</p>
          <button id="cancel-scan">Cancel</button>
        `;

        const cancelScanButton = document.getElementById('cancel-scan');
        cancelScanButton.addEventListener('click', () => {
          // TODO: Implement cancel scan functionality
          alert('Cancel scan functionality not implemented yet.');
        });

        if (response.status === 'completed' || response.status === 'error') {
          clearInterval(intervalId);
          router.navigate(`/results?uuid=${uuid}`);
        }
      } catch (error) {
        console.error('Error getting scan status:', error);
        Notification.show('Error getting scan status', 'error');
        clearInterval(intervalId);
      }
    };

    getScanStatus();
    const intervalId = setInterval(getScanStatus, 5000);
  },
};

module.exports = ScanView;// frontend/js/views/ResultsView.js
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

module.exports = ResultsView;// frontend/js/views/ReportView.js
// Report generation page

const ReportView = {
  init: () => {
    const app = document.getElementById('app');
    app.innerHTML = `
      <h1>Report Generation</h1>
      <form id="report-form">
        <label for="format">Format:</label>
        <select id="format">
          <option value="pdf">PDF</option>
          <option value="html">HTML</option>
          <option value="json">JSON</option>
        </select>
        <button type="submit">Generate Report</button>
      </form>
    `;

    const reportForm = document.getElementById('report-form');
    reportForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const format = document.getElementById('format').value;
      // TODO: Implement report generation functionality
      alert(`Report generation in ${format} format not implemented yet.`);
    });
  },
};

module.exports = ReportView;// frontend/js/views/SearchView.js
// Advanced search interface

const SearchView = {
  init: () => {
    const app = document.getElementById('app');
    app.innerHTML = `
      <h1>Advanced Search</h1>
      <form id="search-form">
        <input type="text" id="search-term" placeholder="Enter search term" required>
        <select id="search-type">
          <option value="content">Content</option>
          <option value="regex">Regex</option>
          <option value="element">Element</option>
        </select>
        <button type="submit">Search</button>
      </form>
      <div id="search-results">
        <h2>Search Results</h2>
        <ul>
          <li>Result 1</li>
          <li>Result 2</li>
        </ul>
      </div>
    `;

    const searchForm = document.getElementById('search-form');
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const searchTerm = document.getElementById('search-term').value;
      const searchType = document.getElementById('search-type').value;
      // TODO: Implement search functionality
      alert(`Search for ${searchTerm} using ${searchType} not implemented yet.`);
    });
  },
};

module.exports = SearchView;// frontend/js/views/SettingsView.js
// Application settings

const SettingsView = {
  init: () => {
    const app = document.getElementById('app');
    app.innerHTML = `
      <h1>Settings</h1>
      <form id="settings-form">
        <label for="scan-depth">Scan Depth:</label>
        <input type="number" id="scan-depth" value="5">
        <button type="submit">Save Settings</button>
      </form>
    `;

    const settingsForm = document.getElementById('settings-form');
    settingsForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const scanDepth = document.getElementById('scan-depth').value;
      // TODO: Implement settings saving functionality
      alert(`Settings saved. Scan depth: ${scanDepth}`);
    });
  },
};

module.exports = SettingsView;// frontend/js/app.js
// Main application file

const api = require('./core/api.js');
const router = require('./core/router.js');
const store = require('./core/store.js');
const utils = require('./core/utils.js');

const Navigation = require('./components/Navigation.js');
const Modal = require('./components/Modal.js');
const Dropdown = require('./components/Dropdown.js');
const Form = require('./components/Form.js');
const Tabs = require('./components/Tabs.js');
const Table = require('./components/Table.js');
const Notification = require('./components/Notification.js');
const ScreenshotViewer = require('./components/ScreenshotViewer.js');
const CodeViewer = require('./components/CodeViewer.js');

const HomeView = require('./views/HomeView.js');
const ScanView = require('./views/ScanView.js');
const ResultsView = require('./views/ResultsView.js');
const ReportView = require('./views/ReportView.js');
const SearchView = require('./views/SearchView.js');
const SettingsView = require('./views/SettingsView.js');


window.app = {
  init: () => {
    console.log('App initialized');
    Navigation.init();
    HomeView.init();

    router.addRoute('/', HomeView.init);
    router.addRoute('/scan', ScanView.init);
    router.addRoute('/results', ResultsView.init);
    router.addRoute('/report', ReportView.init);
    router.addRoute('/search', SearchView.init);
    router.addRoute('/settings', SettingsView.init);

    router.handleRoute();
  },
};

// document.addEventListener('DOMContentLoaded', app.init);