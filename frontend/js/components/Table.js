/**
 * Table Component
 * Handles data display, sorting, and pagination
 */
class Table {
    constructor(options = {}) {
        this.options = {
            container: null,
            columns: [],
            data: [],
            sortable: true,
            searchable: false,
            filterable: false,
            pageable: true,
            selectable: false,
            perPage: 10,
            pageRanges: [10, 25, 50, 100],
            onSelect: null,
            onSort: null,
            onFilter: null,
            onPageChange: null,
            emptyMessage: 'No data available',
            loadingMessage: 'Loading data...',
            customClass: '',
            rowActions: [],
            ...options
        };

        this.state = {
            currentPage: 1,
            perPage: this.options.perPage,
            sortColumn: null,
            sortDirection: 'asc',
            searchQuery: '',
            filters: {},
            selectedRows: new Set(),
            loading: false
        };

        this.filteredData = [...this.options.data];
        this.element = null;
        this.init();
    }

    init() {
        this.createElement();
        this.render();
        this.setupEventListeners();
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = `table-container ${this.options.customClass}`;
        
        if (this.options.container) {
            this.options.container.appendChild(this.element);
        }
    }

    render() {
        // Apply filters and sorting
        this.processData();

        const startIndex = (this.state.currentPage - 1) * this.state.perPage;
        const endIndex = startIndex + this.state.perPage;
        const pageData = this.filteredData.slice(startIndex, endIndex);

        this.element.innerHTML = `
            ${this.renderToolbar()}
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        ${this.renderHeader()}
                    </thead>
                    <tbody>
                        ${this.state.loading ? this.renderLoading() :
                          pageData.length ? this.renderRows(pageData) :
                          this.renderEmpty()}
                    </tbody>
                </table>
            </div>
            ${this.options.pageable ? this.renderPagination() : ''}
        `;
    }

    renderToolbar() {
        if (!this.options.searchable && !this.options.filterable) return '';

        return `
            <div class="table-toolbar">
                ${this.options.searchable ? `
                    <div class="table-search">
                        <input type="text" 
                               class="search-input"
                               placeholder="Search..."
                               value="${this.state.searchQuery}">
                    </div>
                ` : ''}
                
                ${this.options.filterable ? `
                    <div class="table-filters">
                        ${this.renderFilters()}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderHeader() {
        return `
            <tr>
                ${this.options.selectable ? `
                    <th class="select-cell">
                        <input type="checkbox" 
                               class="select-all"
                               ${this.areAllRowsSelected() ? 'checked' : ''}>
                    </th>
                ` : ''}
                ${this.options.columns.map(column => `
                    <th class="${column.sortable !== false && this.options.sortable ? 'sortable' : ''}"
                        data-column="${column.field}">
                        <div class="th-content">
                            ${column.label}
                            ${this.renderSortIcon(column.field)}
                        </div>
                    </th>
                `).join('')}
                ${this.options.rowActions.length ? '<th class="actions-cell"></th>' : ''}
            </tr>
        `;
    }

    renderRows(data) {
        return data.map(row => `
            <tr data-id="${row.id || ''}" class="${this.state.selectedRows.has(row.id) ? 'selected' : ''}">
                ${this.options.selectable ? `
                    <td class="select-cell">
                        <input type="checkbox" 
                               class="select-row"
                               ${this.state.selectedRows.has(row.id) ? 'checked' : ''}>
                    </td>
                ` : ''}
                ${this.options.columns.map(column => `
                    <td>${this.formatCell(row, column)}</td>
                `).join('')}
                ${this.options.rowActions.length ? this.renderActions(row) : ''}
            </tr>
        `).join('');
    }

    renderActions(row) {
        return `
            <td class="actions-cell">
                <div class="actions-menu">
                    ${this.options.rowActions.map(action => `
                        <button class="action-btn" 
                                data-action="${action.action}"
                                title="${action.label}">
                            ${action.icon}
                        </button>
                    `).join('')}
                </div>
            </td>
        `;
    }

    renderSortIcon(field) {
        if (field !== this.state.sortColumn) {
            return '<span class="sort-icon"></span>';
        }
        
        return `
            <span class="sort-icon ${this.state.sortDirection}">
                ${this.state.sortDirection === 'asc' ? '↑' : '↓'}
            </span>
        `;
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredData.length / this.state.perPage);
        const pages = this.getPageNumbers(totalPages);

        return `
            <div class="table-pagination">
                <div class="pagination-info">
                    Showing ${((this.state.currentPage - 1) * this.state.perPage) + 1} to 
                    ${Math.min(this.state.currentPage * this.state.perPage, this.filteredData.length)}
                    of ${this.filteredData.length} entries
                </div>
                <div class="pagination-controls">
                    <button class="btn-page" 
                            data-page="prev"
                            ${this.state.currentPage === 1 ? 'disabled' : ''}>
                        Previous
                    </button>
                    ${pages.map(page => `
                        ${page === '...' ? `
                            <span class="pagination-ellipsis">...</span>
                        ` : `
                            <button class="btn-page ${page === this.state.currentPage ? 'active' : ''}"
                                    data-page="${page}">
                                ${page}
                            </button>
                        `}
                    `).join('')}
                    <button class="btn-page" 
                            data-page="next"
                            ${this.state.currentPage === totalPages ? 'disabled' : ''}>
                        Next
                    </button>
                </div>
                <div class="per-page-select">
                    <select class="per-page">
                        ${this.options.pageRanges.map(value => `
                            <option value="${value}" 
                                    ${value === this.state.perPage ? 'selected' : ''}>
                                ${value} per page
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
        `;
    }

    renderEmpty() {
        return `
            <tr>
                <td colspan="${this.getColumnCount()}" class="empty-message">
                    ${this.options.emptyMessage}
                </td>
            </tr>
        `;
    }

    renderLoading() {
        return `
            <tr>
                <td colspan="${this.getColumnCount()}" class="loading-message">
                    ${this.options.loadingMessage}
                </td>
            </tr>
        `;
    }

    setupEventListeners() {
        // Sort handling
        if (this.options.sortable) {
            this.element.addEventListener('click', e => {
                const header = e.target.closest('th.sortable');
                if (header) {
                    this.handleSort(header.dataset.column);
                }
            });
        }

        // Search handling
        if (this.options.searchable) {
            this.element.querySelector('.search-input')?.addEventListener('input', e => {
                this.handleSearch(e.target.value);
            });
        }

        // Pagination handling
        if (this.options.pageable) {
            this.element.addEventListener('click', e => {
                const pageButton = e.target.closest('.btn-page');
                if (pageButton) {
                    this.handlePageChange(pageButton.dataset.page);
                }
            });

            this.element.querySelector('.per-page')?.addEventListener('change', e => {
                this.handlePerPageChange(parseInt(e.target.value));
            });
        }

        // Selection handling
        if (this.options.selectable) {
            // Select all
            this.element.querySelector('.select-all')?.addEventListener('change', e => {
                this.handleSelectAll(e.target.checked);
            });

            // Select row
            this.element.addEventListener('change', e => {
                const checkbox = e.target.closest('.select-row');
                if (checkbox) {
                    const row = checkbox.closest('tr');
                    this.handleSelectRow(row.dataset.id, checkbox.checked);
                }
            });
        }

        // Row actions
        if (this.options.rowActions.length) {
            this.element.addEventListener('click', e => {
                const actionButton = e.target.closest('.action-btn');
                if (actionButton) {
                    const row = actionButton.closest('tr');
                    const action = actionButton.dataset.action;
                    this.handleAction(action, row.dataset.id);
                }
            });
        }
    }

    processData() {
        // Apply search
        if (this.state.searchQuery) {
            this.filteredData = this.options.data.filter(row =>
                this.options.columns.some(column =>
                    String(row[column.field]).toLowerCase().includes(this.state.searchQuery.toLowerCase())
                )
            );
        } else {
            this.filteredData = [...this.options.data];
        }

        // Apply filters
        Object.entries(this.state.filters).forEach(([field, value]) => {
            if (value) {
                this.filteredData = this.filteredData.filter(row =>
                    String(row[field]).toLowerCase().includes(value.toLowerCase())
                );
            }
        });

        // Apply sorting
        if (this.state.sortColumn) {
            this.filteredData.sort((a, b) => {
                const aValue = a[this.state.sortColumn];
                const bValue = b[this.state.sortColumn];
                
                if (this.state.sortDirection === 'asc') {
                    return aValue > bValue ? 1 : -1;
                }
                return aValue < bValue ? 1 : -1;
            });
        }
    }

    handleSort(column) {
        if (column === this.state.sortColumn) {
            this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.sortColumn = column;
            this.state.sortDirection = 'asc';
        }

        this.render();

        if (this.options.onSort) {
            this.options.onSort({
                column: this.state.sortColumn,
                direction: this.state.sortDirection
            });
        }
    }

    handleSearch(query) {
        this.state.searchQuery = query;
        this.state.currentPage = 1;
        this.render();
    }

    handlePageChange(page) {
        const totalPages = Math.ceil(this.filteredData.length / this.state.perPage);
        
        if (page === 'prev') {
            this.state.currentPage = Math.max(1, this.state.currentPage - 1);
        } else if (page === 'next') {
            this.state.currentPage = Math.min(totalPages, this.state.currentPage + 1);
        } else {
            this.state.currentPage = parseInt(page);
        }

        this.render();

        if (this.options.onPageChange) {
            this.options.onPageChange(this.state.currentPage);
        }
    }

    handlePerPageChange(value) {
        this.state.perPage = value;
        this.state.currentPage = 1;
        this.render();
    }

    handleSelectAll(checked) {
        if (checked) {
            this.filteredData.forEach(row => this.state.selectedRows.add(row.id));
        } else {
            this.state.selectedRows.clear();
        }

        this.render();

        if (this.options.onSelect) {
            this.options.onSelect(Array.from(this.state.selectedRows));
        }
    }

    handleSelectRow(id, checked) {
        if (checked) {
            this.state.selectedRows.add(id);
        } else {
            this.state.selectedRows.delete(id);
        }

        this.render();

        if (this.options.onSelect) {
            this.options.onSelect(Array.from(this.state.selectedRows));
        }
    }

    handleAction(action, rowId) {
        const actionConfig = this.options.rowActions.find(a => a.action === action);
        if (actionConfig && actionConfig.handler) {
            actionConfig.handler(rowId, this.getRowData(rowId));
        }
    }

    // Utility methods
    getColumnCount() {
        let count = this.options.columns.length;
        if (this.options.selectable) count++;
        if (this.options.rowActions.length) count++;
        return count;
    }

    getPageNumbers(totalPages) {
        const current = this.state.currentPage;
        const pages = [];
        
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            if (current > 3) pages.push('...');
            
            for (let i = Math.max(2, current - 1); i <= Math.min(current + 1, totalPages - 1); i++) {
                pages.push(i);
            }
            
            if (current < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        
        return pages;
    }

    formatCell(row, column) {
        const value = row[column.field];
        if (column.formatter) {
            return column.formatter(value, row);
        }
        return value || '';
    }

    getRowData(id) {
        return this.options.data.find(row => row.id === id);
    }

    areAllRowsSelected() {
        return this.filteredData.every(row => this.state.selectedRows.has(row.id));
    }

    // Public API
    updateData(data) {
        this.options.data = data;
        this.state.currentPage = 1;
        this.render();
    }

    getSelectedRows() {
        return Array.from(this.state.selectedRows);
    }

    setLoading(loading) {
        this.state.loading = loading;
        this.render();
    }

    refresh() {
        this.render();
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Export for module use
export default Table;