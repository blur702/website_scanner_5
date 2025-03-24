/**
 * Database Browser View
 * Provides a read-only interface to browse database tables and data
 */
class DbBrowserView {
    constructor() {
        this.container = document.getElementById('view-container');
        this.tables = [];
        this.currentTable = null;
        this.currentPage = 1;
        this.pageSize = 50;
        this.sortColumn = null;
        this.sortDirection = 'asc';
    }
    
    async render() {
        this.container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h1 class="card-title">Database Browser</h1>
                    <p class="card-subtitle">Browse database tables and content (read-only)</p>
                </div>
                <div class="card-body">
                    <div class="db-browser-layout">
                        <div class="table-list-container">
                            <h3>Tables</h3>
                            <div id="table-list" class="loading">Loading tables...</div>
                        </div>
                        <div class="table-content-container">
                            <div id="table-info">
                                <p>Select a table to view its data</p>
                            </div>
                            <div id="table-data"></div>
                            <div id="table-pagination"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        await this.loadTables();
    }
    
    async loadTables() {
        try {
            this.tables = await api.get('/db/tables');
            this.renderTableList();
        } catch (error) {
            document.getElementById('table-list').innerHTML = `
                <div class="alert alert-error">Error loading tables: ${error.message}</div>
            `;
        }
    }
    
    renderTableList() {
        const listContainer = document.getElementById('table-list');
        if (!this.tables || this.tables.length === 0) {
            listContainer.innerHTML = '<p>No tables found</p>';
            return;
        }
        
        let html = '<ul class="db-table-list">';
        this.tables.forEach(table => {
            html += `
                <li class="${this.currentTable === table ? 'active' : ''}">
                    <a href="#" data-table="${table}" class="table-link">${table}</a>
                </li>
            `;
        });
        html += '</ul>';
        
        listContainer.innerHTML = html;
        
        // Add event listeners
        document.querySelectorAll('.table-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const table = e.target.dataset.table;
                this.loadTableData(table);
            });
        });
    }
    
    async loadTableData(tableName, page = 1) {
        this.currentTable = tableName;
        this.currentPage = page;
        
        // Update table list UI
        this.renderTableList();
        
        // Show loading
        document.getElementById('table-info').innerHTML = `<p>Loading ${tableName}...</p>`;
        document.getElementById('table-data').innerHTML = '';
        document.getElementById('table-pagination').innerHTML = '';
        
        try {
            // Load schema and data in parallel
            const [schema, data] = await Promise.all([
                api.get(`/db/tables/${tableName}/schema`),
                api.get(`/db/tables/${tableName}/data?page=${page}&limit=${this.pageSize}${this.sortColumn ? `&sort_by=${this.sortColumn}&sort_dir=${this.sortDirection}` : ''}`)
            ]);
            
            this.renderTableInfo(tableName, schema, data);
            this.renderTableData(data);
            this.renderPagination(data);
            
        } catch (error) {
            document.getElementById('table-info').innerHTML = `
                <div class="alert alert-error">Error loading table data: ${error.message}</div>
            `;
        }
    }
    
    renderTableInfo(tableName, schema, data) {
        const infoContainer = document.getElementById('table-info');
        
        let html = `
            <h3>Table: ${tableName}</h3>
            <div class="table-stats">
                <span>${data.total} rows</span> | 
                <span>${schema.length} columns</span>
            </div>
            <div class="table-schema">
                <h4>Schema</h4>
                <table class="schema-table">
                    <thead>
                        <tr>
                            <th>Column</th>
                            <th>Type</th>
                            <th>Nullable</th>
                            <th>PK</th>
                            <th>Default</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        schema.forEach(column => {
            html += `
                <tr>
                    <td>${column.name}</td>
                    <td>${column.type}</td>
                    <td>${column.nullable ? 'Yes' : 'No'}</td>
                    <td>${column.primary_key ? '✓' : ''}</td>
                    <td>${column.default}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        infoContainer.innerHTML = html;
    }
    
    renderTableData(data) {
        const dataContainer = document.getElementById('table-data');
        
        if (!data.rows || data.rows.length === 0) {
            dataContainer.innerHTML = '<p>No data found in this table</p>';
            return;
        }
        
        let html = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
        `;
        
        // Render header with sort controls
        data.columns.forEach(column => {
            const isSorted = this.sortColumn === column.name;
            const direction = isSorted && this.sortDirection === 'asc' ? 'desc' : 'asc';
            const sortClass = isSorted 
                ? `sortable ${this.sortDirection === 'asc' ? 'asc' : 'desc'}`
                : 'sortable';
            
            html += `
                <th class="${sortClass}" data-column="${column.name}" data-direction="${direction}">
                    ${column.name}
                </th>
            `;
        });
        
        html += `
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Render rows
        data.rows.forEach(row => {
            html += '<tr>';
            data.columns.forEach(column => {
                const value = row[column.name];
                html += `<td>${value !== null ? value : '<em>null</em>'}</td>`;
            });
            html += '</tr>';
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        dataContainer.innerHTML = html;
        
        // Add sort handlers
        document.querySelectorAll('.data-table th.sortable').forEach(th => {
            th.addEventListener('click', (e) => {
                this.sortColumn = th.dataset.column;
                this.sortDirection = th.dataset.direction;
                this.loadTableData(this.currentTable, 1);
            });
        });
    }
    
    renderPagination(data) {
        const paginationContainer = document.getElementById('table-pagination');
        
        if (data.pages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let html = '<div class="pagination">';
        
        // Previous button
        if (data.page > 1) {
            html += `<a href="#" class="page-link" data-page="${data.page - 1}">« Previous</a>`;
        } else {
            html += `<span class="page-link disabled">« Previous</span>`;
        }
        
        // Page numbers
        const maxVisiblePages = 7;
        let startPage = Math.max(1, data.page - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(data.pages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        if (startPage > 1) {
            html += `<a href="#" class="page-link" data-page="1">1</a>`;
            if (startPage > 2) {
                html += `<span class="page-ellipsis">...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            if (i === data.page) {
                html += `<span class="page-link current">${i}</span>`;
            } else {
                html += `<a href="#" class="page-link" data-page="${i}">${i}</a>`;
            }
        }
        
        if (endPage < data.pages) {
            if (endPage < data.pages - 1) {
                html += `<span class="page-ellipsis">...</span>`;
            }
            html += `<a href="#" class="page-link" data-page="${data.pages}">${data.pages}</a>`;
        }
        
        // Next button
        if (data.page < data.pages) {
            html += `<a href="#" class="page-link" data-page="${data.page + 1}">Next »</a>`;
        } else {
            html += `<span class="page-link disabled">Next »</span>`;
        }
        
        html += '</div>';
        
        paginationContainer.innerHTML = html;
        
        // Add pagination event listeners
        document.querySelectorAll('.pagination .page-link:not(.disabled):not(.current)').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                this.loadTableData(this.currentTable, page);
            });
        });
    }
    
    static init() {
        const view = new DbBrowserView();
        view.render();
    }
}

window.DbBrowserView = DbBrowserView;
