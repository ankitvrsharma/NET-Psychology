import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const runtime = readFileSync(new URL('../app/runtime.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const microtopic = readFileSync(new URL('../microtopic.html', import.meta.url), 'utf8');
const deepDive = readFileSync(new URL('../deep-dive.html', import.meta.url), 'utf8');

// Regression contract: the rejected three-card panel and its styling must not return.
for (const legacy of [
  'Short Notes',
  'I Understand',
  'Detailed Explanation',
  'short-notes',
  'i-understand',
  'detailed-explanation',
  'micro-bottom-navigation',
  'micro-bottom-action'
]) {
  assert.equal(runtime.includes(legacy), false, `Legacy panel markup/logic returned in runtime: ${legacy}`);
  assert.equal(css.includes(legacy), false, `Legacy panel styling returned in CSS: ${legacy}`);
}
assert.match(runtime, /<article class="micro-deep-dive-content"><div class="micro-deep-dive-copy">/);
assert.doesNotMatch(runtime, /<article class="micro-deep-dive-content card">/);
assert.match(runtime, /micro-learning-next-links/);
assert.match(runtime, /deep-dive\.html\?unit=/);
assert.match(runtime, /active-recall\.html\?unit=/);
assert.match(css, /Micro-topic editorial layout contract/);
assert.match(css, /\.micro-learning-next-links\s*\{[^}]*display:flex/s);
assert.match(microtopic, /style\.css\?v=1\.0\.3/);
assert.match(deepDive, /style\.css\?v=1\.0\.3/);
console.log('Micro-topic article layout regression checks passed.');
