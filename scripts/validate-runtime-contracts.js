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
for (const match of routeMap.matchAll(/(?:^|,)\s*(?:'([^']+)'|([A-Za-z][\w-]*))\s*[:,]/g)) {
  routeKeys.add(match[1] || match[2]);
}

const htmlFiles = fs.readdirSync(root).filter(name => name.endsWith('.html'));
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
