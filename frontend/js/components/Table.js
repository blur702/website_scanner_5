// Table component for displaying data in tabular format

const Table = {
    init: function() {
        // Added functionality for pagination
        this.initPagination();
        
        // Initialize table sorting, pagination, etc.
        document.querySelectorAll('.table-sortable th').forEach(headerCell => {
            headerCell.addEventListener('click', () => {
                this.sortTable(headerCell);
            });
        });
    },
    
    sortTable: function(headerCell) {
        const tableElement = headerCell.closest('table');
        const headerIndex = Array.prototype.indexOf.call(headerCell.parentElement.children, headerCell);
        const currentIsAscending = headerCell.classList.contains('th-sort-asc');
        
        // Sort the table data
        const tableBody = tableElement.querySelector('tbody');
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        
        // Sort based on the content of cells in the same column
        const sortedRows = rows.sort((a, b) => {
            const aColText = a.querySelector(`td:nth-child(${headerIndex + 1})`).textContent.trim();
            const bColText = b.querySelector(`td:nth-child(${headerIndex + 1})`).textContent.trim();
            
            return currentIsAscending 
                ? aColText.localeCompare(bColText)
                : bColText.localeCompare(aColText);
        });
        
        // Remove all existing rows from the table
        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }
        
        // Re-add the sorted rows
        tableBody.append(...sortedRows);
        
        // Update header classes
        tableElement.querySelectorAll('th').forEach(th => th.classList.remove('th-sort-asc', 'th-sort-desc'));
        headerCell.classList.toggle('th-sort-asc', !currentIsAscending);
        headerCell.classList.toggle('th-sort-desc', currentIsAscending);
    },
    
    createTable: function(container, headers, data, options = {}) {
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        
        const table = document.createElement('table');
        table.className = 'table ' + (options.sortable ? 'table-sortable' : '');
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            row.forEach(cell => {
                const td = document.createElement('td');
                td.innerHTML = cell;
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        
        // Add to container
        container.appendChild(tableContainer);
        
        // Initialize sorting if needed
        if (options.sortable) {
            Table.init();
        }

        return table;
    },
    
    initPagination: function() {
        document.querySelectorAll('.table-pagination').forEach(pagination => {
            const table = document.querySelector(pagination.dataset.table);
            if (!table) return;
            
            const itemsPerPage = parseInt(pagination.dataset.itemsPerPage) || 10;
            const rows = table.querySelectorAll('tbody tr');
            const pageCount = Math.ceil(rows.length / itemsPerPage);
            
            // Create pagination controls
            let paginationHtml = '<div class="pagination">';
            paginationHtml += '<button class="page-prev" disabled>&laquo; Prev</button>';
            paginationHtml += '<span class="page-info">Page <span class="current-page">1</span> of ' + pageCount + '</span>';
            paginationHtml += '<button class="page-next">Next &raquo;</button>';
            paginationHtml += '</div>';
            
            pagination.innerHTML = paginationHtml;
            
            // Set current page
            let currentPage = 1;
            
            // Show only first page initially
            this.showPage(rows, currentPage, itemsPerPage);
            
            // Add event listeners
            const prevButton = pagination.querySelector('.page-prev');
            const nextButton = pagination.querySelector('.page-next');
            const currentPageSpan = pagination.querySelector('.current-page');
            
            prevButton.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    this.showPage(rows, currentPage, itemsPerPage);
                    currentPageSpan.textContent = currentPage;
                    nextButton.disabled = false;
                    if (currentPage === 1) {
                        prevButton.disabled = true;
                    }
                }
            });
            
            nextButton.addEventListener('click', () => {
                if (currentPage < pageCount) {
                    currentPage++;
                    this.showPage(rows, currentPage, itemsPerPage);
                    currentPageSpan.textContent = currentPage;
                    prevButton.disabled = false;
                    if (currentPage === pageCount) {
                        nextButton.disabled = true;
                    }
                }
            });
        });
    },
    
    showPage: function(rows, page, itemsPerPage) {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        
        rows.forEach((row, index) => {
            if (index >= startIndex && index < endIndex) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
};

window.Table = Table;