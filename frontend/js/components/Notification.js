// Notification component for displaying temporary messages

const Notification = {
    init: function() {
        // Create container for notifications if it doesn't exist
        if (!document.getElementById('notifications-container')) {
            const container = document.createElement('div');
            container.id = 'notifications-container';
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }
    },
    
    show: function(message, type = 'info', duration = 3000) {
        // Initialize if not already done
        this.init();
        
        const id = `notification-${Date.now()}`;
        const container = document.getElementById('notifications-container');
        
        const notification = document.createElement('div');
        notification.id = id;
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.setAttribute('role', 'alert');
        
        container.appendChild(notification);
        
        // Auto-dismiss
        setTimeout(() => {
            notification.classList.add('removing');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, duration);
        
        return id;
    }
};

window.Notification = Notification;