const { spawn } = require('child_process');
const path = require('path');

const next = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');

const child = spawn('node', [next, 'start'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: false
});

child.on('exit', (code) => process.exit(code));