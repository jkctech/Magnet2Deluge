function showModal(message, success = true) {
	let modal = document.createElement('div');
	modal.textContent = message;
	modal.style.position = 'fixed';
	modal.style.top = '20px';
	modal.style.right = '20px';
	if (success === 'already') {
		modal.style.background = '#ff9800'; // orange
	} else {
		modal.style.background = success ? '#4caf50' : '#f44336';
	}
	modal.style.color = 'white';
	modal.style.padding = '12px 20px';
	modal.style.borderRadius = '6px';
	modal.style.zIndex = 99999;
	modal.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
	modal.style.fontSize = '16px';
	document.body.appendChild(modal);
	setTimeout(() => { modal.remove(); }, 5000);
}

// Only listen for background-initiated messages to show the modal
chrome.runtime.onMessage.addListener((msg) => {
	if (msg.type === 'magnet-modal') {
		showModal(msg.message, msg.success);
	}
}); 