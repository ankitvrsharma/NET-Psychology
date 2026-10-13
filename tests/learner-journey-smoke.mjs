import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
await context.route('**/supabase-config.js*', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.SUPABASE_CONFIG={};' }));
await context.route('**/app/supabase-auth.js*', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.NETPSY_AUTH={ready:Promise.resolve(),getUser:()=>null};' }));

async function visit(path, rootSelector) {
  const page = await context.newPage();
  const pageErrors = [];
  const missingAssets = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', response => {
    if (response.status() === 404 && new URL(response.url()).origin === new URL(baseURL).origin) missingAssets.push(response.url());
  });
  await page.goto(baseURL + path, { waitUntil: 'domcontentloaded' });
  await page.locator(rootSelector).waitFor({ state: 'attached', timeout: 10000 });
  await page.waitForFunction(selector => {
    const el = document.querySelector(selector);
    return !!el && (el.children.length > 0 || el.textContent.trim().length > 0);
  }, rootSelector, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(250);
  assert.deepEqual(pageErrors, [], path + ' produced browser errors: ' + pageErrors.join('; '));
  assert.deepEqual(missingAssets, [], path + ' requested missing same-origin assets: ' + missingAssets.join(', '));
  const rendered = await page.locator(rootSelector).evaluate(el => el.children.length > 0 || el.textContent.trim().length > 0);
  assert.ok(rendered, path + ' did not render content into ' + rootSelector);
  results.push({ path, rendered: true });
  return page;
}

try {
  const indexPage = await visit('/index.html', '#homeHero');
  assert.ok(await indexPage.locator('#homeHero h1').count(), 'Home hero heading is missing');

  const mobileToggle = indexPage.locator('.menu-toggle');
  await mobileToggle.click();
  assert.equal(await mobileToggle.getAttribute('aria-expanded'), 'true', 'Mobile navigation did not open');
  await mobileToggle.click();
  assert.equal(await mobileToggle.getAttribute('aria-expanded'), 'false', 'Mobile navigation did not close');
  await indexPage.close();

  const learn = await visit('/learn.html', '#learnUnits');
  const firstUnitHref = await learn.locator('#learnUnits a.learn-unit-card').first().getAttribute('href');
  assert.ok(firstUnitHref, 'Learn page has no unit links');
  const unit = await visit('/' + firstUnitHref, '#unitPage');
  assert.ok(await unit.locator('.unit-part-section').count() > 0, 'Unit page did not render syllabus Parts');
  const topicHref = await unit.locator('a.topic-card[href^="topic.html"]').first().getAttribute('href');
  assert.ok(topicHref, 'Unit page has no available topic link');
  const topic = await visit('/' + topicHref, '#topicPage');
  const microHref = await topic.locator('a[href^="microtopic.html"]').first().getAttribute('href');
  assert.ok(microHref, 'Topic page has no available micro-topic link');
  const micro = await visit('/' + microHref, '#microPage');
  assert.ok(await micro.locator('.micro-learn-header h1').count(), 'Micro-topic title did not render');
  assert.ok(await micro.locator('a[href^="active-recall.html"]').count(), 'Micro-topic has no active-recall next step');
  await learn.close(); await unit.close(); await topic.close(); await micro.close();

  const practice = await visit('/practice.html', '#practiceApp');
  assert.ok(await practice.locator('[data-practice-choice][data-scope="part"]').count() > 0, 'Practice page has no Part filters');
  assert.ok(await practice.locator('[data-practice-choice][data-scope="part"]').first().innerText().then(t => /^Part \\d+[A-Z]\\s/.test(t)), 'Practice Part labels are malformed');
  await practice.close();

  await visit('/revision.html', '#revisionApp');
  await visit('/progress.html', '#progressApp');
  await visit('/start.html', '#startPage');
  await visit('/daily3.html', '#daily3App');
  await visit('/daily-practice.html', '#dailyPracticeApp');

  const desktop = await context.newPage();
  await desktop.setViewportSize({ width: 1366, height: 900 });
  await desktop.goto(baseURL + '/index.html', { waitUntil: 'domcontentloaded' });
  await desktop.locator('#homeHero h1').waitFor();
  const overflow = await desktop.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  assert.equal(overflow, false, 'Home page has horizontal overflow at laptop width');
  await desktop.close();

  console.log('Learner journey smoke tests passed:', JSON.stringify(results));
} catch (error) {
  failures.push(error.stack || String(error));
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(failures.join('\n\n'));
  process.exitCode = 1;
}
