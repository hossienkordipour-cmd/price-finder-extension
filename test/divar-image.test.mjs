import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
const content = process.argv.includes('--baseline') ? execFileSync('git', ['show', 'HEAD:content/content.js'], { encoding: 'utf8' }) : await readFile(new URL('../content/content.js', import.meta.url), 'utf8');
const photo = 'https://s100.divarcdn.com/static/photo/neda/webp_post/example/phone.webp';
const nextPhoto = 'https://s100.divarcdn.com/static/photo/neda/webp_post/example/next.webp';
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', req => req.isNavigationRequest() ? req.respond({ status: 200, contentType: 'text/html', body: '<meta charset="utf-8"><meta property="og:image" content="https://divar.ir/logo.png"><h1>گوشی 3310اصلی</h1><img class="kt-image-block__image" src="https://mapimage.divarcdn.com/v8/mapimage">' }) : req.abort());
  await page.goto('https://divar.ir/v/phone/gaOHnUFB');
  await page.evaluate(() => {
    window.detected = [];
    window.chrome = { runtime: { sendMessage(m) { window.detected.push(m); }, getManifest() { return { name: 'PIQO DEV' }; }, getURL() { return 'about:blank'; }, onMessage: { addListener() {} } }, storage: { local: { get(_key, cb) { cb({}); }, set() {} } } };
  });
  await page.addScriptTag({ content });
  await page.waitForFunction(() => window.detected.some(m => m.product));
  // Simulate metadata arriving later without changing title, URL or price.
  await page.evaluate(url => document.querySelector('meta[property="og:image"]').content = url, photo);
  await page.waitForFunction(url => window.detected.at(-1).product.image === url, { timeout: 3000 }, photo);
  assert.equal(await page.evaluate(() => window.detected.find(m => m.product).product.image), null, 'A logo or map is not a listing photo');
  await page.evaluate(url => {
    const img = document.createElement('img'); img.className = 'kt-image-block__image'; img.src = url;
    document.body.append(img);
  }, nextPhoto);
  await page.waitForFunction(url => window.detected.at(-1).product.image === url, { timeout: 3000 }, nextPhoto);
  await page.evaluate(() => {
    document.querySelector('img[src*="/photo/"]').remove();
    document.querySelector('meta[property="og:image"]').content = 'https://divar.ir/logo.png';
  });
  await page.waitForFunction(() => window.detected.at(-1).product.image === null, { timeout: 3000 });
  console.log('Divar delayed photo, gallery priority and logo/map rejection tests passed');
} finally { await browser.close(); }
