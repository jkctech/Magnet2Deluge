document.addEventListener('DOMContentLoaded', async function () {
	const form = document.getElementById('settings-form');
	const urlInput = document.getElementById('deluge-url');
	const passwordInput = document.getElementById('deluge-password');
	const labelSelect = document.getElementById('deluge-label');
	const labelSubtext = document.getElementById('deluge-label-subtext');
	const statusDiv = document.getElementById('status');
	const testBtn = document.getElementById('test-connection');
	const testStatus = document.getElementById('test-status');
	const directClickCheckbox = document.getElementById('direct-click');

	// Function to populate label dropdown
	async function populateLabels(delugeUrl, delugePassword, selectedLabel) {
		labelSelect.innerHTML = '<option value="">None</option>'; // Reset to "None"
		if (!delugeUrl) {
			return;
		}
		try {
			// Login to Deluge
			const loginRes = await fetch(`${delugeUrl}/json`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ method: 'auth.login', params: [delugePassword], id: 1 })
			});
			const loginData = await loginRes.json();
			if (!loginData.result) {
				console.error('Deluge login failed:', loginData);
				labelSubtext.style.display = "";
				labelSelect.disabled = true;
				return;
			}

			// Check if Label plugin is enabled
			const pluginRes = await fetch(`${delugeUrl}/json`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ method: 'core.get_enabled_plugins', params: [], id: 3 })
			});
			const pluginData = await pluginRes.json();
			if (!pluginData.result || !pluginData.result.includes('Label')) {
				console.log('Label plugin not enabled');
				labelSubtext.style.display = "";
				labelSelect.disabled = true;
				return;
			}

			// Fetch labels
			const labelsRes = await fetch(`${delugeUrl}/json`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ method: 'label.get_labels', params: [], id: 4 })
			});
			const labelsData = await labelsRes.json();
			if (labelsData.result && Array.isArray(labelsData.result)) {
				labelsData.result.forEach(label => {
					const option = document.createElement('option');
					option.value = label;
					option.textContent = label;
					labelSelect.appendChild(option);
				});
				labelSubtext.style.display = "none";
				labelSelect.disabled = false;
				// Try to set the selected label if it exists
				if (selectedLabel && labelsData.result.includes(selectedLabel)) {
					labelSelect.value = selectedLabel;
				}
			} else {
				console.error('Failed to fetch labels:', labelsData);
				testStatus.textContent = 'Failed to fetch labels.';
				testStatus.style.color = '#f44336';
				labelSelect.disabled = true;
			}
		} catch (e) {
			console.error('Error fetching labels:', e);
			testStatus.textContent = 'Error fetching labels.';
			testStatus.style.color = '#f44336';
			labelSelect.disabled = true;
		}
	}

	// Load settings and populate labels
	chrome.storage.sync.get(['delugeUrl', 'delugePassword', 'delugeLabel', 'directClick'], async function (items) {
		if (items.delugeUrl) urlInput.value = items.delugeUrl;
		if (items.delugePassword) passwordInput.value = items.delugePassword;
		if (typeof items.directClick === 'boolean') {
			directClickCheckbox.checked = items.directClick;
		} else {
			directClickCheckbox.checked = true; // default to enabled
		}
		// Populate labels and set saved label
		await populateLabels(items.delugeUrl, items.delugePassword, items.delugeLabel);
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
				// Populate labels on successful connection, keep current selection
				await populateLabels(delugeUrl, delugePassword, labelSelect.value);
			} else {
				testStatus.textContent = 'Authentication failed.';
				testStatus.style.color = '#f44336';
				await populateLabels(delugeUrl, delugePassword);
			}
		} catch (e) {
			testStatus.textContent = 'Connection error.';
			testStatus.style.color = '#f44336';
			await populateLabels(delugeUrl, delugePassword);
		}
	});

	// Save settings
	form.addEventListener('submit', function (e) {
		e.preventDefault();
		const delugeUrl = urlInput.value.trim();
		const delugePassword = passwordInput.value;
		const delugeLabel = labelSelect.value.trim();
		const directClick = directClickCheckbox.checked;
		chrome.storage.sync.set({ delugeUrl, delugePassword, delugeLabel, directClick }, function () {
			statusDiv.textContent = 'Settings saved!';
			setTimeout(() => { statusDiv.textContent = ''; }, 1500);
		});
	});
});