/**
 * 批量把从 antd 直接导入的 message/notification 改为从 @/src/utils/antdAppMessage 导入。
 * 运行: node scripts/migrate-antd-message-imports.js
 */
const fs = require('fs');
const path = require('path');

const BRIDGE = "@/src/utils/antdAppMessage";

function walk(dir, ext, files = []) {
  const list = fs.readdirSync(dir);
  for (const name of list) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name !== 'node_modules' && name !== '.git') walk(full, ext, files);
    } else if (ext.some(e => name.endsWith(e))) {
      files.push(full);
    }
  }
  return files;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes("from '" + BRIDGE + "'") || content.includes('from "' + BRIDGE + '"')) return false;

  const lineRe = /^(\s*import\s*\{)([^}]+)(\}\s*from\s*['"]antd['"]\s*;?\s*)$/gm;
  let needMessage = false;
  let needNotification = false;
  const newContent = content.replace(lineRe, (match, prefix, inner, suffix) => {
    const parts = inner.split(',').map(s => s.trim()).filter(Boolean);
    const hasMessage = parts.includes('message');
    const hasNotification = parts.includes('notification');
    if (!hasMessage && !hasNotification) return match;
    needMessage = needMessage || hasMessage;
    needNotification = needNotification || hasNotification;
    const rest = parts.filter(p => p !== 'message' && p !== 'notification');
    if (rest.length === 0) return '';
    return prefix + ' ' + rest.join(', ') + ' ' + suffix;
  });

  if (!needMessage && !needNotification) return false;

  const bridgeLine = `import { ${[needMessage && 'message', needNotification && 'notification'].filter(Boolean).join(', ')} } from '${BRIDGE}';\n`;
  const idx = newContent.search(/\nimport\s+\{/);
  const insertAt = idx >= 0 ? idx : 0;
  const out = newContent.slice(0, insertAt) + bridgeLine + newContent.slice(insertAt);
  fs.writeFileSync(filePath, out, 'utf8');
  return true;
}

const root = path.join(__dirname, '..');
const srcRoot = path.join(root, 'src');
const appRoot = path.join(root, 'app');
const exts = ['.tsx', '.ts', '.jsx', '.js'];
const files = [...walk(srcRoot, exts), ...walk(appRoot, exts)].filter(
  f => !f.includes('antdAppMessage') && !f.includes('node_modules')
);

let count = 0;
for (const f of files) {
  try {
    const content = fs.readFileSync(f, 'utf8');
    if (!/\b(message|notification)\b.*from\s*['"]antd['"]/.test(content) && !/from\s*['"]antd['"].*[\s\S]*\b(message|notification)\b/.test(content)) continue;
    const hasAntdMessage = /import\s*\{[^}]*\bmessage\b[^}]*\}\s*from\s*['"]antd['"]/.test(content);
    const hasAntdNotification = /import\s*\{[^}]*\bnotification\b[^}]*\}\s*from\s*['"]antd['"]/.test(content);
    if (!hasAntdMessage && !hasAntdNotification) continue;
    if (processFile(f)) {
      count++;
      console.log('Updated:', path.relative(root, f));
    }
  } catch (e) {
    console.error('Error', f, e.message);
  }
}
console.log('Done. Updated', count, 'files.');
