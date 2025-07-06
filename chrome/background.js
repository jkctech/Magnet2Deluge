// Add context menu for all links
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "send-to-deluge",
    title: "Send magnet to Deluge",
    contexts: ["link"]
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info);
  if (info.menuItemId === "send-to-deluge" && info.linkUrl.startsWith("magnet:?")) {
    console.log('Sending magnet from context menu:', info.linkUrl);
    sendMagnetToDeluge(info.linkUrl, (result) => {
      if (tab && tab.id) {
        let status = result.status;
        let colorMsg = result.status === 'already_added' ? 'Magnet already added to Deluge.' : (result.status === 'success' ? 'Magnet sent to Deluge!' : ('Error: ' + (result.message || 'Failed to send magnet')));
        let colorType = result.status === 'already_added' ? 'already' : (result.status === 'success');
        chrome.tabs.sendMessage(tab.id, {
          type: 'magnet-modal',
          message: colorMsg,
          success: colorType
        });
      }
    });
  }
});

async function sendMagnetToDeluge(magnet, sendResponse) {
  console.log('sendMagnetToDeluge called with:', magnet);
  // Get settings from storage
  chrome.storage.sync.get(["delugeUrl", "delugePassword"], async (items) => {
    const delugeUrl = items.delugeUrl;
    const delugePassword = items.delugePassword;
    if (!delugeUrl || !delugePassword) {
      console.log('Deluge settings missing');
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title: "Deluge settings missing",
        message: "Please set your Deluge URL and password in the extension popup."
      });
      sendResponse && sendResponse({ status: 'error', message: 'Deluge settings missing' });
      return;
    }
    try {
      // Login to Deluge Web UI
      const loginRes = await fetch(`${delugeUrl}/json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          method: "auth.login",
          params: [delugePassword],
          id: 1
        })
      });
      const loginData = await loginRes.json();
      if (!loginData.result) {
        console.log('Deluge login failed', loginData);
        throw new Error("Deluge login failed");
      }
      // Add magnet
      const addRes = await fetch(`${delugeUrl}/json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          method: "core.add_torrent_magnet",
          params: [magnet, {}],
          id: 2
        })
      });
      const addData = await addRes.json();
      if (addData.error) {
        console.log('Error adding magnet:', addData.error);
        if (addData.error.message && addData.error.message.includes('already in session')) {
          sendResponse && sendResponse({ status: 'already_added', message: 'Magnet already added to Deluge.' });
          return;
        } else {
          sendResponse && sendResponse({ status: 'error', message: addData.error.message });
          throw new Error(addData.error.message);
        }
      }
      console.log('Magnet sent to Deluge successfully');
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title: "Magnet sent to Deluge",
        message: "The magnet link was successfully sent."
      });
      sendResponse && sendResponse({ status: 'success' });
    } catch (e) {
      console.log('Error sending magnet:', e);
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title: "Error sending magnet",
        message: e.message || "Unknown error"
      });
      sendResponse && sendResponse({ status: 'error', message: e.message });
    }
  });
} 