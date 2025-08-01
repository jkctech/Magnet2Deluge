<div align="center">
  <img src="chrome/icon.png" alt="Magnet2Deluge Logo" width="200">
</div>

# Magnet2Deluge

A browser extension that redirects magnet links to your Deluge torrent client, allowing you to easily add torrents without manually copying and pasting magnet URLs.

## Installation

### Browser Extensions
- **[Chrome Web Store](https://chromewebstore.google.com/detail/heebkpkdhcilekcdkhmbeapapopmndoe)**
- **[Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/magnet2deluge/)**

### Manual Installation
1. Download or clone this repository
2. Open your browser's extension management page:
   - Chrome: `chrome://extensions/`
   - Firefox: `about:addons`
3. Enable "Developer mode" (Chrome) or "Debug Add-ons" (Firefox)
4. Click "Load unpacked" (Chrome) or "Load Temporary Add-on" (Firefox)
5. Select the appropriate folder:
   - Chrome: `chrome/` folder
   - Firefox: `firefox/` folder

## Features

- **Direct Click Detection**: Click any magnet link to automatically send it to Deluge (Can be disabled in settings)
- **.torrent Support**: Click any .torrent link to send it to Deluge (Can be enabled/disabled in settings)
- **Context Menu**: Right-click magnet or .torrent links for manual control
- **Label Plugin Support**: If the Deluge Label plugin is enabled, you can set a default label for new torrents (works only for magnet links!)
- **Visual Feedback**: Modals show success, error, or "already added" status
- **Connection Testing**: Test your Deluge connection directly from the settings
- **Settings Management**: Easy configuration of Deluge settings and feature toggles

## Getting Started

1. Click the extension icon to open the settings popup
2. Enter your Deluge Web UI URL (e.g., `http://localhost:8112`)
3. Enter your Deluge password
4. Click "Test Connection" to verify your settings
5. Click "Save" to store your configuration

## Usage

### Direct Click (Enabled by default)
- Simply click any magnet or torrent link on any webpage
- The extension will automatically send it to Deluge
- A colored modal will appear showing the result:
  - **Green**: Successfully added to Deluge
  - **Orange**: Already in Deluge session
  - **Red**: Error occurred

### Context Menu
- Right-click any magnet or .torrent link
- Select "Send to Deluge" from the context menu

### Label Plugin Support
- If the [Deluge Label plugin](https://deluge-torrent.org/plugins/) is enabled in your Deluge Web UI, you can select a default label in the extension settings.
- The label will be applied to magnet links when added via the extension.

## Requirements

- Compatible browser
- Deluge torrent client with Web UI enabled
- Deluge Web UI accessible via HTTP/HTTPS

## Privacy

This extension is designed with privacy-first principles. We do not collect, track, or transmit any personal data. Your Deluge settings are stored locally, and the extension only communicates with your Deluge instance. For detailed information, see our [Privacy Policy](PRIVACY.md).

## Troubleshooting

- **"Deluge settings missing"**: Make sure you've configured the URL and password in the extension settings
- **"Connection error"**: Verify your Deluge Web UI is running and accessible
- **"Authentication failed"**: Check your Deluge password
- **Magnet links still open in browser**: Ensure "Direct Click Detection" is enabled in settings
