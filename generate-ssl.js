#!/usr/bin/env node

/**
 * Generate self-signed SSL certificates for HTTPS development server
 * Usage: node generate-ssl.js
 */

import { execSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sslDir = join(__dirname, 'ssl');

try {
  // Check if certificates already exist
  const keyPath = join(sslDir, 'key.pem');
  const certPath = join(sslDir, 'cert.pem');

  if (existsSync(keyPath) && existsSync(certPath)) {
    console.log('✅ SSL certificates already exist!');
    console.log('📍 Files found:');
    console.log(`   - ${keyPath} (private key)`);
    console.log(`   - ${certPath} (certificate)`);
    console.log('\n🚀 Using existing certificates for HTTPS');
    process.exit(0);
  }

  // Create ssl directory if it doesn't exist
  if (!existsSync(sslDir)) {
    mkdirSync(sslDir);
    console.log('📁 Created ssl/ directory');
  }

  // Generate private key
  console.log('🔐 Generating private key...');
  execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'inherit' });

  // Generate certificate
  console.log('📜 Generating self-signed certificate...');
  execSync(`openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`, { stdio: 'inherit' });

  console.log('✅ SSL certificates generated successfully!');
  console.log('📍 Files created:');
  console.log(`   - ${keyPath} (private key)`);
  console.log(`   - ${certPath} (certificate)`);
  console.log('\n🚀 Ready to use HTTPS');

} catch (error) {
  console.error('❌ Failed to generate SSL certificates:', error.message);
  console.log('\n🔧 Make sure OpenSSL is installed on your system.');
  process.exit(1);
}