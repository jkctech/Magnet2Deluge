function showModal(message, status = 'success') {
	let modal = document.createElement('div');
	modal.textContent = message;
	modal.style.position = 'fixed';
	modal.style.top = '20px';
	modal.style.right = '20px';
	if (status === 'already') {
		modal.style.background = '#ff9800'; // orange
	} else if (status === 'success') {
		modal.style.background = '#4caf50'; // green
	} else {
		modal.style.background = '#f44336'; // red
	}
	modal.style.color = 'white';
	modal.style.padding = '12px 20px';
	modal.style.borderRadius = '6px';
	modal.style.zIndex = 99999;
	modal.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
	modal.style.fontSize = '16px';
	document.body.appendChild(modal);
	setTimeout(function() { modal.remove(); }, 5000);
}

// Direct click detection for magnet links - more aggressive approach
document.addEventListener('click', function(e) {
	let target = e.target;
	while (target && target.tagName !== 'A') {
		target = target.parentElement;
	}
	if (target && target.href && target.href.startsWith('magnet:?')) {
		// Immediately prevent default for magnet links
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();

		// Check if direct click is enabled
		chrome.storage.sync.get(['directClick'], function(items) {
			if (items.directClick !== false) { // default to true unless explicitly disabled
				chrome.runtime.sendMessage({ type: 'magnet-link-clicked', magnet: target.href }, function(response) {
					if (response && response.status === 'success') {
						showModal('Magnet sent to Deluge!', 'success');
					} else if (response && response.status === 'already_added') {
						showModal('Magnet already added to Deluge.', 'already');
					} else if (response && response.status === 'error') {
						showModal('Error: ' + (response.message || 'Failed to send magnet'), 'error');
					}
				});
			}
		});
	}
}, true);

// Only listen for background-initiated messages to show the modal
chrome.runtime.onMessage.addListener(function(msg) {
	if (msg.type === 'magnet-modal') {
		showModal(msg.message, msg.status);
	}
}); 