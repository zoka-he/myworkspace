const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  fs.readdirSync(dir).forEach(n => {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) {
      if (n !== 'node_modules' && n !== '.git') walk(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(n)) out.push(p);
  });
  return out;
}

const root = path.join(__dirname, '..');
const files = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'app'))];
let count = 0;
files.forEach(f => {
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes('antdAppMessage')) return;
  const fixed = s.replace(
    /(from\s+['"]antd['"]);(import\s*\{\s*(?:message|notification)[^}]*\}\s*from\s*['"]@\/src\/utils\/antdAppMessage['"];)/g,
    '$1\n\n$2'
  );
  if (fixed !== s) {
    fs.writeFileSync(f, fixed);
    count++;
    console.log(path.relative(root, f));
  }
});
console.log('Fixed', count, 'files');
