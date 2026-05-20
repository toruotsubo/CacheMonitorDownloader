let isEnabled = false;
let targetExtensions = [];
let targetFolder = "";
let useTimestamp = false;

// Load initial settings
browser.storage.local.get(["enabled", "extensions", "folder", "useTimestamp"]).then((res) => {
  isEnabled = res.enabled || false;
  targetExtensions = parseExtensions(res.extensions || "png,jpg");
  targetFolder = sanitizeFolder(res.folder || "ffDownloader");
  useTimestamp = res.useTimestamp || false;
});

// Listen for settings changes
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes.enabled) isEnabled = changes.enabled.newValue;
    if (changes.extensions) targetExtensions = parseExtensions(changes.extensions.newValue);
    if (changes.folder) targetFolder = sanitizeFolder(changes.folder.newValue);
    if (changes.useTimestamp) useTimestamp = changes.useTimestamp.newValue;
  }
});

function parseExtensions(extStr) {
  if (!extStr) return [];
  return extStr.split(",").map(e => e.trim().toLowerCase()).filter(e => e);
}

function sanitizeFolder(folderStr) {
  if (!folderStr) return "";
  // Remove leading/trailing slashes and backslashes
  return folderStr.replace(/^[/\\]+|[/\\]+$/g, '');
}

function getExtensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : null;
  } catch (e) {
    return null;
  }
}

function getFilenameFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    let filename = parts[parts.length - 1];
    if (!filename) filename = `downloaded_file_${Date.now()}`;
    return decodeURIComponent(filename);
  } catch (e) {
    return `downloaded_file_${Date.now()}`;
  }
}

// Intercept requests
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!isEnabled) return {};

    const ext = getExtensionFromUrl(details.url);
    if (!ext || !targetExtensions.includes(ext)) {
      return {};
    }

    let filter;
    try {
      filter = browser.webRequest.filterResponseData(details.requestId);
    } catch (e) {
      console.error("Error creating filter for", details.url, e);
      return {};
    }

    const data = [];

    filter.ondata = (event) => {
      data.push(event.data);
      filter.write(event.data); // pass data through to the browser
    };

    filter.onstop = (event) => {
      filter.disconnect();

      const blob = new Blob(data);
      let filename = getFilenameFromUrl(details.url);

      if (useTimestamp) {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

        filename = `${timestamp}_${filename}`;
      }

      const downloadPath = targetFolder ? `${targetFolder}/${filename}` : filename;

      const objectUrl = URL.createObjectURL(blob);

      browser.downloads.download({
        url: objectUrl,
        filename: downloadPath,
        saveAs: false,
        conflictAction: "uniquify" // Automatically rename if file exists
      }).then(() => {
        // revoke after a short delay
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      }).catch(err => {
        console.error("Download failed:", err);
      });
    };

    return {};
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);
