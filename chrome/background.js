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
				chrome.tabs.sendMessage(tab.id, {
					type: 'magnet-modal',
					message: colorMsg,
					status: colorType
				});
			}
		});
	}
});

// Listen for messages from content script for direct click detection
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (message.type === "magnet-link-clicked" && message.magnet) {
		console.log('Sending magnet from direct click:', message.magnet);
		sendMagnetToDeluge(message.magnet, sendResponse);
		return true; // keep the message channel open for async response
	}
});

async function sendMagnetToDeluge(magnet, sendResponse) {
	console.log('sendMagnetToDeluge called with:', magnet);
	// Get settings from storage
	chrome.storage.sync.get(["delugeUrl", "delugePassword", "delugeLabel"], async (items) => {
		const delugeUrl = items.delugeUrl;
		const delugePassword = items.delugePassword;
		const delugeLabel = items.delugeLabel.trim();
		if (!delugeUrl) {
			console.error('Deluge URL missing');
			sendResponse && sendResponse({ status: 'error', message: 'Deluge URL missing' });
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
				console.error('Deluge login failed:', loginData);
				throw new Error("Deluge login failed");
			}

			// Prepare torrent options
			const torrentOptions = {};
			if (delugeLabel)
			{
				torrentOptions['label'] = delugeLabel;
			}

			// Add magnet
			const addRes = await fetch(`${delugeUrl}/json`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					method: "core.add_torrent_magnet",
					params: [magnet, torrentOptions],
					id: 2
				})
			});
			const addData = await addRes.json();
			if (addData.error) {
				console.error('Error adding magnet:', addData.error);
				if (addData.error.message && addData.error.message.includes('already in session')) {
					sendResponse && sendResponse({ status: 'already_added', message: 'Magnet already added to Deluge.' });
					return;
				}
				sendResponse && sendResponse({ status: 'error', message: addData.error.message });
				throw new Error(addData.error.message);
			}

			// Explicitly set label if provided (fallback for reliability)
			if (delugeLabel && addData.result) {
				const setLabelRes = await fetch(`${delugeUrl}/json`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({
						method: "label.set_torrent",
						params: [addData.result, delugeLabel],
						id: 3
					})
				});
				const setLabelData = await setLabelRes.json();
				if (setLabelData.error) {
					console.error('Error setting label:', setLabelData.error);
					sendResponse && sendResponse({ status: 'error', message: 'Failed to set label: ' + setLabelData.error.message });
					return;
				}
			}

			console.log('Magnet sent to Deluge successfully');
			sendResponse && sendResponse({ status: 'success' });
		} catch (e) {
			console.error('Error sending magnet:', e);
			sendResponse && sendResponse({ status: 'error', message: e.message });
		}
	});
}