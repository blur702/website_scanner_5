// frontend/js/components/Dropdown.js
// Dropdown menu component

const Dropdown = {
  init: () => {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
      const trigger = dropdown.querySelector('.dropdown-trigger');
      const menu = dropdown.querySelector('.dropdown-menu');

      trigger.addEventListener('click', () => {
        dropdown.classList.toggle('active');
      });

      document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
          dropdown.classList.remove('active');
        }
      });
    });
  },
};

window.Dropdown = Dropdown;