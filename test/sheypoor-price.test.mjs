import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
const content = process.argv.includes('--baseline') ? execFileSync('git', ['show', 'HEAD:content/content.js'], { encoding: 'utf8' }) : await readFile(new URL('../content/content.js', import.meta.url), 'utf8');
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  const html = `<meta charset="utf-8"><section><h1>پژو 207i دنده‌ای TU3 1405 سفید</h1>
    <strong><span id="price" class="text-heading-4-bolder !text-heading-3-bolder">۲,۲۷۵,۰۰۰,۰۰۰<span><svg viewBox="0 0 24 24"></svg></span></span></strong></section>
    <p>مدل ۱۴۰۵، کارکرد ۰، قسط ماهانه ۲۵,۰۰۰,۰۰۰ تومان</p>
    <article>پیشنهاد مشابه<strong><span class="!text-heading-3-bolder">۱,۵۰۰,۰۰۰,۰۰۰<span><svg></svg></span></span></strong></article>`;
  await page.setRequestInterception(true);
  page.on('request', req => req.isNavigationRequest() ? req.respond({ status: 200, contentType: 'text/html', body: html }) : req.abort());
  await page.goto('https://www.sheypoor.com/v/car-457193375.html');
  await page.evaluate(() => {
    window.detected = [];
    window.chrome = { runtime: { sendMessage(m) { window.detected.push(m); }, getManifest() { return { name: 'PIQO DEV' }; }, getURL() { return 'about:blank'; }, onMessage: { addListener() {} } }, storage: { local: { get(_key, cb) { cb({}); }, set() {} } } };
  });
  await page.addScriptTag({ content });
  await page.waitForFunction(() => window.detected.some(m => m.product));
  assert.equal(await page.evaluate(() => window.detected.at(-1).product.price), 2275000000, 'Read current listing price in toman, not installment or recommendation');
  await page.evaluate(() => document.querySelector('#price').textContent = 'توافقی');
  await page.waitForFunction(() => window.detected.at(-1).product.price === null, { timeout: 3000 });
  await page.evaluate(() => document.querySelector('#price').textContent = '۲۲,۷۵۰,۰۰۰,۰۰۰ ریال');
  await page.waitForFunction(() => window.detected.at(-1).product.price === 2275000000, { timeout: 3000 });
  await page.evaluate(() => document.querySelector('#price').textContent = '۲,۲۷۵,۰۰۰,۰۰۰');
  await page.waitForFunction(() => window.detected.at(-1).product.price === null, { timeout: 3000 });
  await page.evaluate(() => document.querySelector('#price').remove());
  assert.equal(await page.evaluate(() => window.detected.at(-1).product.price), null);
  console.log('Sheypoor scoped price, explicit units, negotiable and unknown tests passed');
} finally { await browser.close(); }
