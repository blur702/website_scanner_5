// frontend/js/core/utils.js
/**
 * Utility functions for the website checker application
 */

// Loading overlay functions
const loadingOverlay = {
    show: function(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            const textElement = overlay.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = message;
            }
            overlay.classList.remove('hidden');
        }
    },
    
    hide: function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }
};

// Date formatting
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleString();
}

// File size formatting
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// URL formatting
function formatUrl(url, maxLength = 50) {
    if (!url) return '';
    
    if (url.length <= maxLength) return url;
    
    // Shorten the middle part of the URL
    const start = url.substring(0, 25);
    const end = url.substring(url.length - 20);
    
    return `${start}...${end}`;
}

// Add utility functions to window
window.loadingOverlay = loadingOverlay;
window.formatDate = formatDate;
window.formatFileSize = formatFileSize;
window.formatUrl = formatUrl;