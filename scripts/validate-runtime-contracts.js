'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'app/runtime.js'), 'utf8');
const adminSource = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
assert.ok(
  adminSource.includes("content:JSON.stringify(request,null,2)+'\\n',"),
  'Admin generation requests must end with a real newline, not a literal backslash-n.'
);
const generationRequestPath = path.join(root, 'data/content-generation-request.json');
assert.doesNotThrow(
  () => JSON.parse(fs.readFileSync(generationRequestPath, 'utf8')),
  'The committed content-generation request must be valid JSON.'
);
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
  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
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
assert.match(runtime, /function normalizeQuestionPool\(pool\)/, 'Question-bank collections must preserve canonical MCQ/PYQ categories.');
assert.match(runtime, /qs=qs\.filter\(q=>questionCategory\(q\)===types\[0\]\)/, 'Practice filters must use canonical question categories, not optional source tags.');
assert.match(runtime, /No standalone MCQs are available in the question bank yet/, 'An empty MCQ category must explain the current content limitation.');
assert.match(runtime, /p\.mcqHistory\|\|\[\]\)\.some\(item=>item\.correct===true\)/, 'Mastery must require successful application, not recall and revision alone.');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.match(serviceWorker, /const CACHE='netpsych-shell-v1\.11\.19';/, 'The shell cache must be versioned when its precache manifest changes.');
assert.match(serviceWorker, /['"]\.\/learner\.html['"]/, 'The learner dashboard must be included in the offline shell cache.');
assert.match(runtime, /const dueCount=dueItems\(\)\.length;/, 'The homepage daily actions must calculate the current due-revision count.');
assert.match(runtime, /daily-focus-revision/, 'The homepage must expose a dedicated revision action.');
assert.match(runtime, /Skip setup and start learning/, 'Learners must be able to bypass onboarding and enter the learning dashboard.');
assert.match(runtime, /masteryAmongLearned/, 'Progress must distinguish mastery among learned concepts from syllabus-wide mastery coverage.');
assert.match(runtime, /contentPending/, 'Progress must disclose syllabus concepts without released learning content.');
assert.match(runtime, /s\.coverage>=s\.mastery\+25/, 'Progress interpretation must compare coverage and mastery using the same syllabus-wide denominator.');
const syllabus = JSON.parse(fs.readFileSync(path.join(root, 'data/syllabus-index.json'), 'utf8'));
const microContent = JSON.parse(fs.readFileSync(path.join(root, 'content/microtopics/micro_topics.json'), 'utf8'));
assert.ok(syllabus.units.length === 10, 'The syllabus must retain all ten navigational units.');
assert.ok(microContent && typeof microContent === 'object' && !Array.isArray(microContent), 'The micro-topic content pool must be valid JSON, even when no lessons are published yet.');
const expectedMicroKeys = new Set(syllabus.units.flatMap(unit => (unit.topics || []).flatMap(topic => (topic.microtopics || []).map(micro => [unit.id, topic.id, micro.id].join('-')))));
const orphanContentKeys = Object.keys(microContent).filter(key => !expectedMicroKeys.has(key));
assert.deepEqual(orphanContentKeys, [], 'Micro-topic content must map to a real syllabus micro-topic.');
const lessonFields = ['expert_explanation', 'detailed_explanation', 'deep_learning', 'deep', 'content_notes', 'study_notes', 'application_question', 'recall_cue', 'memory_hook', 'exam_takeaway'];
const lessonText = record => lessonFields.map(field => {
  const value = record?.[field];
  return Array.isArray(value) ? value.map(item => typeof item === 'object' && item ? JSON.stringify(item) : String(item || '')).join(' ')
    : value && typeof value === 'object' ? JSON.stringify(value) : String(value || '');
}).join(' ').replace(/\\s+/g, ' ').trim();
const publishedLessons = Object.entries(microContent).filter(([, record]) => record?.has_learning_content === true || lessonText(record).length >= 80);
const placeholderLessons = publishedLessons.filter(([, record]) => /(?:ACADEMIC CORE|MICRO-TOPIC MAP|SOURCE BASIS|EXAM USE)/i.test(lessonText(record)));
const sourceMappedLessons = publishedLessons.filter(([, record]) => Array.isArray(record?.sources) && record.sources.length > 0);
console.log('Micro-topic audit: ' + publishedLessons.length + '/' + expectedMicroKeys.size + ' learner-ready records; ' + sourceMappedLessons.length + ' with source IDs; ' + placeholderLessons.length + ' containing syllabus-scaffold labels.');
console.log('Runtime contract checks passed: routes, question categories, offline learner shell, daily revision action, optional onboarding, progress denominator and content-pool validity; ' + appPages.length + ' app.js-powered pages map to a renderer.');
