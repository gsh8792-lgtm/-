// 단일 HTML 빌드: node tools/build.js → dist/forest_expedition.html
import fs from 'fs';
import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const jsDir = path.join(root, 'src/js');
const js = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js')).sort()
  .map((f) => `// ---------- ${f}\n` + fs.readFileSync(path.join(jsDir, f), 'utf8')).join('\n');
const cssDir = path.join(root, 'src/css'); // style.css → ui_assets.css → ui_theme.css → ui_windows.css (뒤가 덮어쓴다)
const css = ['style.css'].concat(fs.readdirSync(cssDir).filter((f) => f.endsWith('.css') && f !== 'style.css').sort()).map((f) => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n');
let html = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
html = html.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist/forest_expedition.html');
fs.writeFileSync(out, html);
console.log(`built ${path.relative(root, out)} (${(html.length / 1024).toFixed(1)} KB)`);
