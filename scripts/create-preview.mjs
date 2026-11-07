// Create a portable, offline browser preview without deploying or changing site files.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const root = new URL('../public/', import.meta.url);
const output = resolve(process.argv[2] || '/tmp/dropdown-preview.html');
let html = readFileSync(new URL('index.html', root), 'utf8');
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>${readFileSync(new URL('style.css', root), 'utf8')}</style>`);
html = html.replace(/<script src="(motion|app)\.js"><\/script>/g, (_, name) => `<script>${readFileSync(new URL(`${name}.js`, root), 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace(/src="(assets\/[^"#]+)(#[^"]*)?"/g, (_, file, fragment = '') => {
  const mime = file.endsWith('.svg') ? 'image/svg+xml' : 'image/webp';
  return `src="data:${mime};base64,${readFileSync(new URL(file, root)).toString('base64')}${fragment}"`;
});
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, html);
console.log(output);
