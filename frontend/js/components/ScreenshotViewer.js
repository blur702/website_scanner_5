/**
 * ScreenshotViewer Component
 * Displays and manages website screenshots with zoom and comparison capabilities
 */
class ScreenshotViewer {
    constructor(options = {}) {
        this.options = {
            container: null,
            screenshots: [],
            initialIndex: 0,
            zoomable: true,
            draggable: true,
            comparison: false,
            onNavigate: null,
            maxZoom: 3,
            customClass: '',
            ...options
        };

        this.state = {
            currentIndex: this.options.initialIndex,
            zoom: 1,
            isDragging: false,
            dragStart: { x: 0, y: 0 },
            position: { x: 0, y: 0 },
            loadedImages: new Set()
        };

        this.element = null;
        this.viewport = null;
        this.image = null;
        this.init();
    }

    init() {
        this.createElement();
        if (this.options.container) {
            this.options.container.appendChild(this.element);
        }
        this.loadCurrentImage();
        this.setupEventListeners();
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = `screenshot-viewer ${this.options.customClass}`;
        
        this.render();
    }

    render() {
        const screenshot = this.getCurrentScreenshot();
        
        this.element.innerHTML = `
            <div class="screenshot-controls">
                <div class="screenshot-navigation">
                    <button class="nav-button prev" ${this.hasPrevious() ? '' : 'disabled'}>
                        <svg viewBox="0 0 24 24">
                            <path d="M15 18l-6-6 6-6"/>
                        </svg>
                    </button>
                    <span class="screenshot-counter">
                        ${this.state.currentIndex + 1} / ${this.options.screenshots.length}
                    </span>
                    <button class="nav-button next" ${this.hasNext() ? '' : 'disabled'}>
                        <svg viewBox="0 0 24 24">
                            <path d="M9 18l6-6-6-6"/>
                        </svg>
                    </button>
                </div>

                ${this.options.zoomable ? `
                    <div class="zoom-controls">
                        <button class="zoom-button out" ${this.state.zoom <= 1 ? 'disabled' : ''}>
                            <svg viewBox="0 0 24 24">
                                <path d="M5 12h14"/>
                            </svg>
                        </button>
                        <span class="zoom-level">${Math.round(this.state.zoom * 100)}%</span>
                        <button class="zoom-button in" ${this.state.zoom >= this.options.maxZoom ? 'disabled' : ''}>
                            <svg viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                        </button>
                    </div>
                ` : ''}
            </div>

            <div class="screenshot-viewport" style="cursor: ${this.getCursor()}">
                <div class="screenshot-container" style="
                    transform: translate(${this.state.position.x}px, ${this.state.position.y}px) scale(${this.state.zoom});
                    transform-origin: center center;
                ">
                    <img src="${screenshot.url}"
                         alt="${screenshot.title || 'Screenshot'}"
                         class="screenshot-image ${this.state.loadedImages.has(screenshot.url) ? 'loaded' : ''}"
                         draggable="false">
                </div>

                ${screenshot.annotations ? `
                    <div class="screenshot-annotations">
                        ${screenshot.annotations.map(annotation => `
                            <div class="annotation ${annotation.type}"
                                 style="left: ${annotation.x}%; top: ${annotation.y}%"
                                 title="${annotation.text}">
                                <div class="annotation-marker"></div>
                                <div class="annotation-content">${annotation.text}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>

            ${screenshot.caption ? `
                <div class="screenshot-caption">${screenshot.caption}</div>
            ` : ''}
        `;

        // Cache references
        this.viewport = this.element.querySelector('.screenshot-viewport');
        this.image = this.element.querySelector('.screenshot-image');
    }

    setupEventListeners() {
        // Navigation
        this.element.querySelector('.nav-button.prev')?.addEventListener('click', () => {
            this.navigate('prev');
        });

        this.element.querySelector('.nav-button.next')?.addEventListener('click', () => {
            this.navigate('next');
        });

        // Zoom controls
        if (this.options.zoomable) {
            this.element.querySelector('.zoom-button.in')?.addEventListener('click', () => {
                this.zoom(0.1);
            });

            this.element.querySelector('.zoom-button.out')?.addEventListener('click', () => {
                this.zoom(-0.1);
            });

            // Mouse wheel zoom
            this.viewport?.addEventListener('wheel', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -0.1 : 0.1;
                    this.zoom(delta);
                }
            });
        }

        // Dragging
        if (this.options.draggable) {
            this.viewport?.addEventListener('mousedown', this.startDrag.bind(this));
            document.addEventListener('mousemove', this.drag.bind(this));
            document.addEventListener('mouseup', this.stopDrag.bind(this));

            // Touch events
            this.viewport?.addEventListener('touchstart', this.startDrag.bind(this));
            document.addEventListener('touchmove', this.drag.bind(this));
            document.addEventListener('touchend', this.stopDrag.bind(this));
        }

        // Image loading
        this.image?.addEventListener('load', () => {
            const screenshot = this.getCurrentScreenshot();
            this.state.loadedImages.add(screenshot.url);
            this.image.classList.add('loaded');
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.element.contains(document.activeElement)) return;

            switch (e.key) {
                case 'ArrowLeft':
                    this.navigate('prev');
                    break;
                case 'ArrowRight':
                    this.navigate('next');
                    break;
                case '0':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.resetZoom();
                    }
                    break;
            }
        });
    }

    startDrag(e) {
        if (!this.options.draggable || this.state.zoom <= 1) return;

        e.preventDefault();
        const point = e.touches ? e.touches[0] : e;
        
        this.state.isDragging = true;
        this.state.dragStart = {
            x: point.clientX - this.state.position.x,
            y: point.clientY - this.state.position.y
        };
    }

    drag(e) {
        if (!this.state.isDragging) return;

        e.preventDefault();
        const point = e.touches ? e.touches[0] : e;

        this.state.position = {
            x: point.clientX - this.state.dragStart.x,
            y: point.clientY - this.state.dragStart.y
        };

        this.updateTransform();
    }

    stopDrag() {
        this.state.isDragging = false;
    }

    zoom(delta) {
        const newZoom = Math.max(1, Math.min(this.options.maxZoom, this.state.zoom + delta));
        if (newZoom === this.state.zoom) return;

        this.state.zoom = newZoom;
        
        // Reset position if zooming out to 1
        if (this.state.zoom === 1) {
            this.state.position = { x: 0, y: 0 };
        }

        this.updateTransform();
        this.render();
    }

    resetZoom() {
        this.state.zoom = 1;
        this.state.position = { x: 0, y: 0 };
        this.updateTransform();
        this.render();
    }

    updateTransform() {
        const container = this.element.querySelector('.screenshot-container');
        if (container) {
            container.style.transform = `translate(${this.state.position.x}px, ${this.state.position.y}px) scale(${this.state.zoom})`;
        }
    }

    navigate(direction) {
        const oldIndex = this.state.currentIndex;
        
        if (direction === 'prev' && this.hasPrevious()) {
            this.state.currentIndex--;
        } else if (direction === 'next' && this.hasNext()) {
            this.state.currentIndex++;
        }

        if (oldIndex !== this.state.currentIndex) {
            this.resetZoom();
            this.loadCurrentImage();
            
            if (this.options.onNavigate) {
                this.options.onNavigate(this.state.currentIndex, oldIndex);
            }
        }
    }

    loadCurrentImage() {
        const screenshot = this.getCurrentScreenshot();
        if (!screenshot) return;

        // Preload current image
        const img = new Image();
        img.src = screenshot.url;

        // Preload next image
        if (this.hasNext()) {
            const nextImg = new Image();
            nextImg.src = this.options.screenshots[this.state.currentIndex + 1].url;
        }

        this.render();
    }

    getCurrentScreenshot() {
        return this.options.screenshots[this.state.currentIndex];
    }

    hasPrevious() {
        return this.state.currentIndex > 0;
    }

    hasNext() {
        return this.state.currentIndex < this.options.screenshots.length - 1;
    }

    getCursor() {
        if (!this.options.draggable) return 'default';
        if (this.state.isDragging) return 'grabbing';
        return this.state.zoom > 1 ? 'grab' : 'default';
    }

    destroy() {
        // Remove event listeners
        document.removeEventListener('mousemove', this.drag);
        document.removeEventListener('mouseup', this.stopDrag);
        document.removeEventListener('touchmove', this.drag);
        document.removeEventListener('touchend', this.stopDrag);

        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Export for module use
export default ScreenshotViewer;