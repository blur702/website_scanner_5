// frontend/js/components/Tabs.js
// Tab interface component

const Tabs = {
  init: () => {
    document.querySelectorAll('.tabs').forEach(tabs => {
      const tabButtons = tabs.querySelectorAll('.tab-button');
      const tabContents = tabs.querySelectorAll('.tab-content');

      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          const tabId = button.dataset.tab;
          Tabs.switchTab(tabs, tabId, tabButtons, tabContents);
        });
      });
    });
  },
  switchTab: (tabs, tabId, tabButtons, tabContents) => {
    tabButtons.forEach(button => {
      button.classList.remove('active');
    });
    tabContents.forEach(content => {
      content.classList.remove('active');
    });

    tabs.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
    tabs.querySelector(`.tab-content[data-tab="${tabId}"]`).classList.add('active');
  },
};

window.Tabs = Tabs;