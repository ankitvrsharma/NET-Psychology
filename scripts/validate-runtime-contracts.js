'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'app/runtime.js'), 'utf8');
const routesMatch = runtime.match(/const routes=\{([\s\S]*?)\};/);
assert.ok(routesMatch, 'The shared runtime must declare its page renderer map.');

assert.match(runtime, /async function loadIndex\(name\)/, 'loadIndex must be defined before pages request question indexes.');
const indexCalls = [...runtime.matchAll(/loadIndex\(['"]([^'"]+)['"]\)/g)].map(match => match[1]);
assert.ok(indexCalls.length > 0, 'Expected at least one loadIndex call.');
assert.ok(indexCalls.every(name => name === 'questions'), 'Only the questions index is currently required; remove stale index calls.');

const routeMap = routesMatch[1];
const routeKeys = new Set();
for (const entry of routeMap.split(',')) {
  const rawKey = entry.trim().split(':', 1)[0].trim();
  const key = rawKey.startsWith("'") && rawKey.endsWith("'") ? rawKey.slice(1, -1) : rawKey;
  if (key && /[A-Za-z]/.test(key[0])) routeKeys.add(key);
}

const htmlFiles = fs.readdirSync(root).filter(name => name.endsWith('.html'));
const ignoredProtocols = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;
function assertLocalTargetExists(value, fromFile) {
  if (!value || ignoredProtocols.test(value)) return;
  const clean = value.split(/[?#]/, 1)[0];
  if (!clean) return;
  let decoded = clean;
  try { decoded = decodeURIComponent(clean); } catch {}
  const relative = decoded.startsWith('/')
    ? decoded.split('/').filter(Boolean).join('/').replace('NET-Psychology/', '')
    : path.join(path.dirname(fromFile), decoded);
  const target = path.resolve(root, relative);
  assert.ok(target === root || target.startsWith(root + path.sep), fromFile + ' contains a local path outside the site: ' + value);
  assert.ok(fs.existsSync(target), fromFile + ' points to a missing local file: ' + value);
}
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of html.matchAll(/\\b(?:href|src)=["']([^"']+)["']/gi)) {
    assertLocalTargetExists(match[1].trim(), file);
  }
}
const appPages = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  if (!/<script\b[^>]*\bsrc=["'][^"']*app\.js(?:\?[^"']*)?["']/i.test(html)) continue;
  const page = html.match(/<body\b[^>]*\bdata-page=["']([^"']+)["']/i)?.[1];
  assert.ok(page, file + ' loads app.js but has no body data-page.');
  assert.ok(routeKeys.has(page), file + ' declares data-page="' + page + '" but the shared runtime has no renderer for it.');
  appPages.push(file);
}
assert.ok(appPages.length > 0, 'Expected to validate at least one app.js-powered page.');
console.log('Runtime contract checks passed: loadIndex is defined; all loadIndex calls are supported; ' + appPages.length + ' app.js-powered pages map to a renderer.');
