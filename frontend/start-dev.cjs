#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Clean PATH to avoid Ruby vite conflict
const cleanPath = process.env.PATH
  .split(':')
  .filter(p => !p.includes('rvm') && !p.includes('ruby'))
  .join(':');

const vitePath = path.join(__dirname, 'node_modules', '.bin', 'vite');

console.log('🚀 Starting Vite development server...');

if (!fs.existsSync(vitePath)) {
  console.log('⚠️  Vite not found. Installing dependencies...');
  
  const install = spawn('npm', ['install'], {
    stdio: 'inherit',
    env: { ...process.env, PATH: cleanPath }
  });
  
  install.on('close', (code) => {
    if (code === 0) {
      startVite();
    } else {
      console.error('❌ Failed to install dependencies');
      process.exit(1);
    }
  });
} else {
  startVite();
}

function startVite() {
  console.log('✅ Starting Vite dev server on http://localhost:3000');
  const vite = spawn(vitePath, ['--host', '0.0.0.0', '--port', '3000'], {
    stdio: 'inherit',
    env: { ...process.env, PATH: cleanPath }
  });
  
  vite.on('close', (code) => {
    console.log(`Vite exited with code ${code}`);
  });
  
  vite.on('error', (err) => {
    console.error('❌ Failed to start Vite:', err.message);
  });
}