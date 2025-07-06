document.addEventListener('DOMContentLoaded', function () {
	const form = document.getElementById('settings-form');
	const urlInput = document.getElementById('deluge-url');
	const passwordInput = document.getElementById('deluge-password');
	const statusDiv = document.getElementById('status');
	const testBtn = document.getElementById('test-connection');
	const testStatus = document.getElementById('test-status');

	// Load settings
	chrome.storage.sync.get(['delugeUrl', 'delugePassword'], function (items) {
		if (items.delugeUrl) urlInput.value = items.delugeUrl;
		if (items.delugePassword) passwordInput.value = items.delugePassword;
	});

	// Test Connection
	testBtn.addEventListener('click', async function () {
		const delugeUrl = urlInput.value.trim();
		const delugePassword = passwordInput.value;
		testStatus.textContent = 'Testing...';
		testStatus.style.color = '#2196f3';
		try {
		const res = await fetch(`${delugeUrl}/json`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ method: 'auth.login', params: [delugePassword], id: 1 })
		});
		const data = await res.json();
		if (data && data.result === true) {
			testStatus.textContent = 'Connection successful!';
			testStatus.style.color = '#4caf50';
		} else {
			testStatus.textContent = 'Authentication failed.';
			testStatus.style.color = '#f44336';
		}
		} catch (e) {
		testStatus.textContent = 'Connection error.';
		testStatus.style.color = '#f44336';
		}
	});

	// Save settings
	form.addEventListener('submit', function (e) {
		e.preventDefault();
		const delugeUrl = urlInput.value.trim();
		const delugePassword = passwordInput.value;
		chrome.storage.sync.set({ delugeUrl, delugePassword }, function () {
		statusDiv.textContent = 'Settings saved!';
		setTimeout(() => { statusDiv.textContent = ''; }, 1500);
		});
	});
}); 