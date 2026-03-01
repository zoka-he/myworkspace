/**
 * 裁剪 node_modules/@chroma-core 包，避免 Turbopack 报 Unknown module type：
 * 1. 只保留 package.json + dist/
 * 2. 删除 dist 内 .d.mts / .d.cts（类型声明被误当模块加载）
 * 3. 把 package.json 里 exports 的 types 从 .d.mts/.d.cts 改为 .d.ts
 */
const path = require('path');
const fs = require('fs');

const chromaRoot = path.join(process.cwd(), 'node_modules', '@chroma-core');
if (!fs.existsSync(chromaRoot)) return;

const keep = new Set(['package.json', 'dist']);
let changed = false;

function removeDeclExtensions(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      removeDeclExtensions(full);
    } else if (name.endsWith('.d.mts') || name.endsWith('.d.cts')) {
      fs.rmSync(full);
      changed = true;
    }
  }
}

function patchExportsTypes(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (Array.isArray(obj)) return obj.some(patchExportsTypes);
  let ok = false;
  for (const key of Object.keys(obj)) {
    if (key === 'types' && typeof obj[key] === 'string') {
      const v = obj[key];
      if (v.endsWith('.d.mts')) {
        obj[key] = v.replace(/\.d\.mts$/, '.d.ts');
        ok = true;
      } else if (v.endsWith('.d.cts')) {
        obj[key] = v.replace(/\.d\.cts$/, '.d.ts');
        ok = true;
      }
    } else {
      if (patchExportsTypes(obj[key])) ok = true;
    }
  }
  return ok;
}

for (const name of fs.readdirSync(chromaRoot)) {
  const pkgDir = path.join(chromaRoot, name);
  if (!fs.statSync(pkgDir).isDirectory()) continue;

  for (const entry of fs.readdirSync(pkgDir)) {
    if (!keep.has(entry)) {
      try {
        fs.rmSync(path.join(pkgDir, entry), { recursive: true });
        changed = true;
      } catch (_) {}
    }
  }

  removeDeclExtensions(path.join(pkgDir, 'dist'));

  const pkgPath = path.join(pkgDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    let pkgChanged = false;
    if (pkg.types && (pkg.types.endsWith('.d.mts') || pkg.types.endsWith('.d.cts'))) {
      pkg.types = pkg.types.replace(/\.d\.mts$/, '.d.ts').replace(/\.d\.cts$/, '.d.ts');
      pkgChanged = true;
    }
    if (patchExportsTypes(pkg.exports)) pkgChanged = true;
    if (pkgChanged) {
      changed = true;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    }
  }
}

if (changed) {
  console.log('[postinstall] Patched @chroma-core packages for Turbopack (dist-only, no .d.mts/.d.cts)');
}
