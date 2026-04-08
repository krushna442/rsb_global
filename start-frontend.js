const { spawn } = require('child_process');
const path = require('path');

// Pointing directly to the JS entry point of the Next.js CLI
// node_modules/.bin/next is often a shell script or CMD on Windows, leading to "SyntaxError: missing ) after argument list" when run with node.
const next = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');

const child = spawn('node', [next, 'start'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: false
});

child.on('exit', (code) => process.exit(code));