// frontend/js/components/Modal.js
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

window.Modal = Modal;