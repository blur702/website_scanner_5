/**
 * ScreenshotViewer Component
 * Displays and manages website screenshots with zoom and comparison capabilities
 */
class ScreenshotViewer {
    constructor(options = {}) {
        this.options = {
            url: '',
            download: true,
            fullscreen: true,
            annotations: true,
            onClose: null,
            ...options
        };
        
        this.element = null;
        this.currentScale = 1;
        this.isDragging = false;
        this.init();
    }

    init() {
        this.element = document.createElement('div');
        this.element.className = 'screenshot-viewer';
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.element.innerHTML = `
            <div class="screenshot-viewer-toolbar">
                <div class="toolbar-left">
                    <button class="btn-icon" data-action="zoom-in">
                        <i class="icon-zoom-in"></i>
                    </button>
                    <button class="btn-icon" data-action="zoom-out">
                        <i class="icon-zoom-out"></i>
                    </button>
                    <button class="btn-icon" data-action="reset">
                        <i class="icon-reset"></i>
                    </button>
                </div>
                <div class="toolbar-right">
                    ${this.options.download ? `
                        <button class="btn-icon" data-action="download">
                            <i class="icon-download"></i>
                        </button>
                    ` : ''}
                    ${this.options.fullscreen ? `
                        <button class="btn-icon" data-action="fullscreen">
                            <i class="icon-fullscreen"></i>
                        </button>
                    ` : ''}
                    <button class="btn-icon" data-action="close">
                        <i class="icon-close"></i>
                    </button>
                </div>
            </div>
            <div class="screenshot-viewer-content">
                <img src="${this.options.url}" alt="Screenshot">
            </div>
            ${this.options.annotations ? `
                <div class="screenshot-viewer-annotations"></div>
            ` : ''}
        `;
    }

    setupEventListeners() {
        // Implement zoom, pan, and toolbar actions
        const content = this.element.querySelector('.screenshot-viewer-content');
        const img = content.querySelector('img');

        // Zoom controls
        this.element.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                this.handleAction(action);
            });
        });

        // Mouse wheel zoom
        content.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.zoom(this.currentScale + delta);
        });

        // Pan functionality
        let isDragging = false;
        let startX, startY, scrollLeft, scrollTop;

        content.addEventListener('mousedown', (e) => {
            isDragging = true;
            content.classList.add('grabbing');
            startX = e.pageX - content.offsetLeft;
            startY = e.pageY - content.offsetTop;
            scrollLeft = content.scrollLeft;
            scrollTop = content.scrollTop;
        });

        content.addEventListener('mouseleave', () => {
            isDragging = false;
            content.classList.remove('grabbing');
        });

        content.addEventListener('mouseup', () => {
            isDragging = false;
            content.classList.remove('grabbing');
        });

        content.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - content.offsetLeft;
            const y = e.pageY - content.offsetTop;
            const walkX = (x - startX) * 1.5;
            const walkY = (y - startY) * 1.5;
            content.scrollLeft = scrollLeft - walkX;
            content.scrollTop = scrollTop - walkY;
        });
    }

    handleAction(action) {
        switch (action) {
            case 'zoom-in':
                this.zoom(this.currentScale + 0.1);
                break;
            case 'zoom-out':
                this.zoom(this.currentScale - 0.1);
                break;
            case 'reset':
                this.reset();
                break;
            case 'download':
                this.download();
                break;
            case 'fullscreen':
                this.toggleFullscreen();
                break;
            case 'close':
                this.close();
                break;
        }
    }

    zoom(scale) {
        scale = Math.min(Math.max(0.1, scale), 3);
        this.currentScale = scale;
        const img = this.element.querySelector('img');
        img.style.transform = `scale(${scale})`;
    }

    reset() {
        this.currentScale = 1;
        const img = this.element.querySelector('img');
        img.style.transform = '';
        const content = this.element.querySelector('.screenshot-viewer-content');
        content.scrollLeft = 0;
        content.scrollTop = 0;
    }

    async download() {
        try {
            const response = await fetch(this.options.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'screenshot.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading screenshot:', error);
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.element.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    show() {
        document.body.appendChild(this.element);
    }

    close() {
        if (this.options.onClose) {
            this.options.onClose();
        }
        this.element.remove();
    }

    destroy() {
        this.element.remove();
    }
}

export default ScreenshotViewer;