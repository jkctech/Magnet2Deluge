// Add context menu for all links
browser.runtime.onInstalled.addListener(() => {
	browser.contextMenus.create({
		id: "send-to-deluge",
		title: "Send magnet to Deluge",
		contexts: ["link"]
	});
});

// Handle context menu click
browser.contextMenus.onClicked.addListener((info, tab) => {
	console.log('Context menu clicked:', info);
	if (info.menuItemId === "send-to-deluge" && info.linkUrl.startsWith("magnet:?")) {
		console.log('Sending magnet from context menu:', info.linkUrl);
		sendMagnetToDeluge(info.linkUrl, (result) => {
			if (tab && tab.id) {
				let colorMsg;
				let colorType;
				if (result.status === 'already_added') {
					colorMsg = 'Magnet already added to Deluge.';
					colorType = 'already';
				} else if (result.status === 'success') {
					colorMsg = 'Magnet sent to Deluge!';
					colorType = 'success';
				} else {
					colorMsg = 'Error: ' + (result.message || 'Failed to send magnet');
					colorType = 'error';
				}
				browser.tabs.sendMessage(tab.id, {
					type: 'magnet-modal',
					message: colorMsg,
					status: colorType
				});
			}
		});
	}
});

// Listen for messages from content script for direct click detection
browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	if (message.type === "magnet-link-clicked" && message.magnet) {
		console.log('Sending magnet from direct click:', message.magnet);
		sendMagnetToDeluge(message.magnet, sendResponse);
		return true; // keep the message channel open for async response
	}
});

async function sendMagnetToDeluge(magnet, sendResponse) {
	console.log('sendMagnetToDeluge called with:', magnet);
	// Get settings from storage
	browser.storage.sync.get(["delugeUrl", "delugePassword"]).then(async (items) => {
		const delugeUrl = items.delugeUrl;
		const delugePassword = items.delugePassword;
		if (!delugeUrl || !delugePassword) {
			console.log('Deluge settings missing');
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
			sendResponse && sendResponse({ status: 'success' });
		} catch (e) {
			console.log('Error sending magnet:', e);
			sendResponse && sendResponse({ status: 'error', message: e.message });
		}
	});
} 