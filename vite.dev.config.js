import { defineConfig } from 'vite';
import { networkInterfaces } from 'os';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// Check for SSL certificates
let useHttps = false;
let sslOptions = {};
try {
  const sslDir = join(__dirname, 'ssl');
  if (existsSync(join(sslDir, 'key.pem')) && existsSync(join(sslDir, 'cert.pem'))) {
    sslOptions = {
      key: readFileSync(join(sslDir, 'key.pem')),
      cert: readFileSync(join(sslDir, 'cert.pem'))
    };
    useHttps = true;
  }
} catch (error) {
  // SSL certificates not available, use HTTP
}

// Get local IP for mobile access
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

export default defineConfig({
  root: '.', // Serve from project root
  publicDir: false, // Don't copy public assets
  server: {
    port: 3000, // Use different port from production server
    strictPort: false, // Allow fallback to another port if busy
    host: true, // Listen on all addresses (0.0.0.0)
    open: false, // Don't auto-open browser
    cors: true,
    https: useHttps ? sslOptions : false,
    hmr: {
      // Enable HMR on all network interfaces for mobile access
      host: getLocalIP(),
      ...(useHttps && { protocol: 'wss', port: 3000 })
    }
  },
  build: {
    // Build config from vite.config.js (not used in dev mode)
    outDir: 'dist',
  },
  optimizeDeps: {
    // Pre-bundle dependencies
    include: [],
  },
  // Custom plugin to log server info
  plugins: [
    {
      name: 'log-server-info',
      configureServer(server) {
        // Middleware to redirect root to demo.html
        server.middlewares.use((req, res, next) => {
          if (req.url === '/') {
            req.url = '/demo.html';
          }
          next();
        });

        server.httpServer?.once('listening', () => {
          const address = server.httpServer?.address();
          const port = typeof address === 'object' ? address?.port : 3000;
          const localIP = getLocalIP();
          const protocol = useHttps ? 'https' : 'http';

          setTimeout(() => {
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🔥 TagStrip Dev Server (Hot Reload Enabled)');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            console.log(`  📱 Local:   ${protocol}://localhost:${port}`);
            console.log(`  📱 Network: ${protocol}://${localIP}:${port}\n`);
            console.log('  💡 Code changes will auto-reload on save');
            console.log('  🔧 Edit files in src/ to see live updates');
            console.log('  📱 Access network URL on mobile device');

            if (!useHttps) {
              console.log('\n  ⚠️  Camera access requires HTTPS:');
              console.log('     Run "node generate-ssl.js" for HTTPS support\n');
            } else {
              console.log('\n  📷 Camera access enabled (HTTPS)\n');
            }

            console.log('  Press Ctrl+C to stop\n');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          }, 100);
        });
      }
    }
  ]
});
