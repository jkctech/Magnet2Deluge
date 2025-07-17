// Add context menu for all links
browser.runtime.onInstalled.addListener(() => {
	browser.contextMenus.create({
		id: "send-to-deluge",
		title: "Send to Deluge",
		contexts: ["link"]
	});
});

// Handle context menu click
browser.contextMenus.onClicked.addListener((info, tab) => {
	if (!info.linkUrl) return;
	if (info.menuItemId === "send-to-deluge") {
		if (info.linkUrl.startsWith("magnet:?")) {
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
		} else if (/\.torrent(\?.*)?$/i.test(info.linkUrl)) {
			// Check if .torrent support is enabled
			browser.storage.sync.get(['torrentSupport'], function(items) {
				if (items.torrentSupport !== false) {
					sendTorrentUrlToDeluge(info.linkUrl, (result) => {
						if (tab && tab.id) {
							let colorMsg;
							let colorType;
							if (result.status === 'already_added') {
								colorMsg = 'Torrent already added to Deluge.';
								colorType = 'already';
							} else if (result.status === 'success') {
								colorMsg = 'Torrent sent to Deluge!';
								colorType = 'success';
							} else {
								colorMsg = 'Error: ' + (result.message || 'Failed to send torrent');
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
		}
	}
});

// Listen for messages from content script for direct click detection
browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (message.type === "magnet-link-clicked" && message.magnet) {
		console.log('Sending magnet from direct click:', message.magnet);
		sendMagnetToDeluge(message.magnet, sendResponse);
		return true; // keep the message channel open for async response
	}
	if (message.type === "torrent-link-clicked" && message.url) {
		console.log('Sending torrent URL from direct click:', message.url);
		sendTorrentUrlToDeluge(message.url, sendResponse);
		return true;
	}
});

async function sendMagnetToDeluge(magnet, sendResponse) {
	console.log('sendMagnetToDeluge called with:', magnet);
	// Get settings from storage
	browser.storage.sync.get(["delugeUrl", "delugePassword", "delugeLabel"], async (items) => {
		const delugeUrl = items.delugeUrl;
		const delugePassword = items.delugePassword;
		const delugeLabel = items.delugeLabel.trim();
		if (!delugeUrl) {
			console.log('Deluge URL missing');
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
				console.log('Deluge login failed:', loginData);
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

async function sendTorrentUrlToDeluge(url, sendResponse) {
	console.log('sendTorrentUrlToDeluge called with:', url);
	browser.storage.sync.get(["delugeUrl", "delugePassword", "delugeLabel"], async (items) => {
		const delugeUrl = items.delugeUrl;
		const delugePassword = items.delugePassword;
		const delugeLabel = items.delugeLabel ? items.delugeLabel.trim() : '';
		if (!delugeUrl) {
			console.log('Deluge URL missing');
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
				console.log('Deluge login failed:', loginData);
				throw new Error("Deluge login failed");
			}

			// Ask Deluge to download the torrent file from the URL
			const downloadRes = await fetch(`${delugeUrl}/json`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					method: "web.download_torrent_from_url",
					params: [url],
					id: 2
				})
			});
			const downloadData = await downloadRes.json();
			if (downloadData.error) {
				console.error('Error downloading torrent:', downloadData.error);
				sendResponse && sendResponse({ status: 'error', message: downloadData.error.message });
				return;
			}
			const filename = downloadData.result;
			if (!filename) {
				sendResponse && sendResponse({ status: 'error', message: 'Deluge did not return a filename.' });
				return;
			}

			// Prepare torrent options
			const torrentOptions = {};
			if (delugeLabel) {
				torrentOptions['label'] = delugeLabel;
			}

			// Add the torrent using web.add_torrents
			const addRes = await fetch(`${delugeUrl}/json`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					method: "web.add_torrents",
					params: [[{ path: filename, options: torrentOptions }]],
					id: 3
				})
			});
			const addData = await addRes.json();
			if (addData.error) {
				console.error('Error adding torrent:', addData.error);
				if (addData.error.message && addData.error.message.includes('already in session')) {
					sendResponse && sendResponse({ status: 'already_added', message: 'Torrent already added to Deluge.' });
					return;
				}
				sendResponse && sendResponse({ status: 'error', message: addData.error.message });
				return;
			}

			console.log('Torrent sent to Deluge successfully');
			sendResponse && sendResponse({ status: 'success' });
		} catch (e) {
			console.error('Error sending torrent:', e);
			sendResponse && sendResponse({ status: 'error', message: e.message });
		}
	});
}