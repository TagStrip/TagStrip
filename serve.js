#!/usr/bin/env node

/**
 * Simple HTTP server for testing TagStrip demo on mobile devices
 * Usage: node serve.js [port]
 */

import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.argv[2] || 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Check for SSL certificates
let useHttps = false;
let sslOptions = {};
try {
  sslOptions = {
    key: readFileSync(join(__dirname, 'ssl', 'key.pem')),
    cert: readFileSync(join(__dirname, 'ssl', 'cert.pem'))
  };
  useHttps = true;
} catch (error) {
  console.log('SSL certificates not found, running HTTP only');
}

const server = useHttps ? createHttpsServer(sslOptions, requestHandler) : createServer(requestHandler);

async function requestHandler(req, res) {
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './demo.html';
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = await readFile(join(__dirname, filePath));
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
    console.log(`[${new Date().toLocaleTimeString()}] 200 ${req.url}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      console.log(`[${new Date().toLocaleTimeString()}] 404 ${req.url}`);
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      console.error(`[${new Date().toLocaleTimeString()}] 500 ${req.url}`, error);
    }
  }
}

// Get local IP address
import { networkInterfaces } from 'os';
function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, () => {
  const protocol = useHttps ? 'https' : 'http';
  const localIP = getLocalIP();
  console.log('\n🚀 TagStrip Demo Server Started!\n');
  console.log(`   Local:   ${protocol}://localhost:${PORT}`);
  console.log(`   Network: ${protocol}://${localIP}:${PORT}`);
  console.log('\n📱 On your mobile device:');
  console.log(`   Open: ${protocol}://${localIP}:${PORT}`);
  if (!useHttps) {
    console.log('\n⚠️  Camera access requires HTTPS. For camera testing:');
    console.log('   - Use localhost URL on the same device');
    console.log('   - Or set up SSL certificates in ssl/ directory');
  }
  console.log('\nPress Ctrl+C to stop\n');
});
