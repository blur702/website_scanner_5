// Table component for displaying data in tabular format

const Table = {
    init: function() {
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
    }
};

window.Table = Table;