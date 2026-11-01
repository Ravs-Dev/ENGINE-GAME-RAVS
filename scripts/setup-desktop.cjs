// Electron 45+ installs its runtime explicitly via install.js (not npm postinstall).
// Reuse the configured HTTPS proxy and keep Electron's bundled checksum checks.
if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  process.env.ELECTRON_GET_USE_PROXY = '1';
}
require('electron/install.js');
