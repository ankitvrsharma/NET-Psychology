import { cp, mkdir, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = process.cwd();
const out = join(root, 'www');
await mkdir(out, { recursive: true });
const allowed = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.txt', '.xml', '.woff', '.woff2']);
const skipDirs = new Set(['.git', '.github', 'node_modules', 'android', 'www', '.cache', 'docs']);
async function copyTree(from, to) {
  await mkdir(to, { recursive: true });
  for (const item of await readdir(from, { withFileTypes: true })) {
    if (skipDirs.has(item.name) || item.name.startsWith('.')) continue;
    const src = join(from, item.name);
    const dest = join(to, item.name);
    if (item.isDirectory()) {
      if (['assets', 'app', 'data', 'content', 'micro-topics', 'units'].includes(item.name)) await copyTree(src, dest);
    } else if (allowed.has(extname(item.name)) || item.name === 'CNAME') {
      await cp(src, dest);
    }
  }
}
await copyTree(root, out);
console.log('Prepared static web assets in www/');
