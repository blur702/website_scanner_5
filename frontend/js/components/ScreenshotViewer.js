// frontend/js/components/ScreenshotViewer.js
// Screenshot viewer component

const ScreenshotViewer = {
  init: () => {
    // Add event listeners to all screenshot thumbnails
    document.querySelectorAll('.screenshot-thumbnail').forEach(thumbnail => {
      thumbnail.addEventListener('click', () => {
        const screenshotId = thumbnail.dataset.id;
        ScreenshotViewer.open(screenshotId);
      });
    });
  },
  
  open: (screenshotId) => {
    // Create modal for screenshot
    const modal = document.createElement('div');
    modal.className = 'screenshot-fullview';
    
    modal.innerHTML = `
      <div class="screenshot-container">
        <button class="screenshot-close">&times;</button>
        <img src="/api/scan/${window.currentScanId}/screenshot/${screenshotId}" alt="Screenshot" />
        <div class="screenshot-controls">
          <button class="screenshot-control prev">&lt;</button>
          <button class="screenshot-control next">&gt;</button>
          <button class="screenshot-control zoom-in">+</button>
          <button class="screenshot-control zoom-out">-</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.screenshot-close');
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    // Add escape key listener
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        modal.remove();
      }
    }, { once: true });
    
    // Show modal
    setTimeout(() => modal.classList.add('open'), 10);
  },
};

window.ScreenshotViewer = ScreenshotViewer;