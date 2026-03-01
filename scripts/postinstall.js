const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');

function run(name, fn) {
  try {
    fn();
  } catch (e) {
    console.warn(`[postinstall] ${name} skipped:`, e.message);
  }
}

run('patch-chroma-default-embed', () => {
  const file = path.join(root, 'scripts', 'patch-chroma-default-embed.js');
  if (fs.existsSync(file)) {
    execSync(`node "${file}"`, { stdio: 'inherit', cwd: root });
  }
});

run('tailwind:build', () => {
  const file = path.join(root, 'styles', 'globals.css');
  if (fs.existsSync(file)) {
    execSync('npm run tailwind:build', { stdio: 'inherit', cwd: root });
  }
});
