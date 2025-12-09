const net = require('net');

/**
 * Check if a port is open/listening
 * @param {number} port - Port number to check
 * @param {string} host - Host to check (default: localhost)
 * @param {number} timeout - Timeout in ms (default: 1000)
 * @returns {Promise<boolean>} True if port is open, false otherwise
 */
function checkPort(port, host = 'localhost', timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Check multiple ports and return their status
 * @param {Array<{port: number, type: string, url: string}>} ports - Array of port objects to check
 * @returns {Promise<Array<{port: number, type: string, url: string, online: boolean}>>}
 */
async function checkMultiplePorts(ports) {
  const results = await Promise.all(
    ports.map(async (portObj) => {
      const port = typeof portObj === 'number' ? portObj : portObj.port;
      const online = await checkPort(port);

      return {
        ...portObj,
        port,
        online
      };
    })
  );

  return results;
}

/**
 * Extract port number from URL
 * @param {string} url - URL to extract port from
 * @returns {number|null} Port number or null if not found
 */
function extractPortFromUrl(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.port) {
      return parseInt(urlObj.port);
    }
    // Default ports
    if (urlObj.protocol === 'https:') return 443;
    if (urlObj.protocol === 'http:') return 80;
    return null;
  } catch (error) {
    // Try to extract with regex as fallback
    const match = url.match(/:(\d+)/);
    return match ? parseInt(match[1]) : null;
  }
}

/**
 * Check status of all URLs in a project
 * @param {Array<{type: string, url: string, label?: string}>} urls - Project URLs from database
 * @returns {Promise<Array<{type: string, url: string, label: string, port: number|null, online: boolean}>>}
 */
async function checkProjectUrls(urls) {
  if (!Array.isArray(urls) || urls.length === 0) {
    return [];
  }

  const results = await Promise.all(
    urls.map(async (urlObj) => {
      const port = extractPortFromUrl(urlObj.url);
      let online = false;

      // Only check local ports
      if (port && urlObj.url.includes('localhost')) {
        online = await checkPort(port);
      }

      return {
        type: urlObj.type || 'other',
        url: urlObj.url,
        label: urlObj.label || urlObj.type || 'URL',
        port,
        online
      };
    })
  );

  return results;
}

module.exports = {
  checkPort,
  checkMultiplePorts,
  extractPortFromUrl,
  checkProjectUrls
};
