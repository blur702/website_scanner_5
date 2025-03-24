// frontend/js/views/SettingsView.js
// Application settings

const SettingsView = {
  init: () => {
    const app = document.getElementById('app');
    app.innerHTML = `
      <h1>Settings</h1>
      <form id="settings-form">
        <label for="scan-depth">Scan Depth:</label>
        <input type="number" id="scan-depth" value="5">
        <button type="submit">Save Settings</button>
      </form>
    `;

    const settingsForm = document.getElementById('settings-form');
    settingsForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const scanDepth = document.getElementById('scan-depth').value;
      // TODO: Implement settings saving functionality
      alert(`Settings saved. Scan depth: ${scanDepth}`);
    });
  },
};

window.SettingsView = SettingsView;