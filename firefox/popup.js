document.addEventListener('DOMContentLoaded', function () {
	const form = document.getElementById('settings-form');
	const urlInput = document.getElementById('deluge-url');
	const passwordInput = document.getElementById('deluge-password');
	const statusDiv = document.getElementById('status');
	const testBtn = document.getElementById('test-connection');
	const testStatus = document.getElementById('test-status');
	const directClickCheckbox = document.getElementById('direct-click');

	// Load settings
	browser.storage.sync.get(['delugeUrl', 'delugePassword', 'directClick']).then(function (items) {
		if (items.delugeUrl) urlInput.value = items.delugeUrl;
		if (items.delugePassword) passwordInput.value = items.delugePassword;
		if (typeof items.directClick === 'boolean') {
			directClickCheckbox.checked = items.directClick;
		} else {
			directClickCheckbox.checked = true; // default to enabled
		}
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
		const directClick = directClickCheckbox.checked;
		browser.storage.sync.set({ delugeUrl, delugePassword, directClick }).then(function () {
			statusDiv.textContent = 'Settings saved!';
			setTimeout(function() { statusDiv.textContent = ''; }, 1500);
		});
	});
}); 