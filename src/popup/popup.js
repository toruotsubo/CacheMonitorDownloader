document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('enableToggle');
  const statusText = document.getElementById('statusText');
  const extInput = document.getElementById('extensions');
  const folderInput = document.getElementById('folder');
  const addTimestampToggle = document.getElementById('addTimestamp');
  const saveBtn = document.getElementById('saveBtn');
  const msg = document.getElementById('msg');

  // Load existing settings
  browser.storage.local.get(["enabled", "extensions", "folder", "useTimestamp"]).then((res) => {
    toggle.checked = res.enabled || false;
    extInput.value = res.extensions !== undefined ? res.extensions : "png,jpg";
    folderInput.value = res.folder !== undefined ? res.folder : "cacheMonitorDownloader";
    addTimestampToggle.checked = res.useTimestamp || false;
    updateStatusText();
  });

  toggle.addEventListener('change', () => {
    updateStatusText();
    // Auto-save toggle state
    browser.storage.local.set({ enabled: toggle.checked });
  });

  function updateStatusText() {
    statusText.textContent = toggle.checked ? "ON" : "OFF";
    statusText.style.color = toggle.checked ? "#0060df" : "#666";
  }

  saveBtn.addEventListener('click', () => {
    const extensions = extInput.value;
    const folder = folderInput.value;
    const useTimestamp = addTimestampToggle.checked;

    browser.storage.local.set({
      extensions: extensions,
      folder: folder,
      useTimestamp: useTimestamp
    }).then(() => {
      msg.textContent = "Settings saved!";
      setTimeout(() => {
        msg.textContent = "";
      }, 2000);
    });
  });
});
