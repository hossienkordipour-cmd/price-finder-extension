import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
const content = process.argv.includes('--baseline') ? execFileSync('git', ['show', 'HEAD:content/content.js'], { encoding: 'utf8' }) : await readFile(new URL('../content/content.js', import.meta.url), 'utf8');
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  const html = `<meta charset="utf-8"><h1>آیفون ۱۵ پرومکس</h1>
    <div class="kt-unexpandable-row"><p class="kt-unexpandable-row__title">حافظهٔ داخلی</p><p class="kt-unexpandable-row__value">۵۱۲ گیگابایت</p></div>
    <div class="kt-unexpandable-row"><p class="kt-unexpandable-row__title">قیمت</p><p id="price" class="kt-unexpandable-row__value">‏۲۲۰,۰۰۰,۰۰۰ تومان (مقطوع)</p></div>
    <p>توضیحات: سال ۲۰۲۶، سلامت باتری ۸۵، اقساط ۱۰,۰۰۰,۰۰۰ تومان</p>`;
  await page.setRequestInterception(true);
  page.on('request', req => req.isNavigationRequest() ? req.respond({ status: 200, contentType: 'text/html', body: html }) : req.abort());
  await page.goto('https://divar.ir/v/iphone/gaOv2KD2');
  await page.evaluate(() => {
    window.detected = [];
    window.chrome = { runtime: { sendMessage(m) { window.detected.push(m); }, getManifest() { return { name: 'PIQO DEV' }; }, getURL() { return 'about:blank'; }, onMessage: { addListener() {} } }, storage: { local: { get(_key, cb) { cb({}); }, set() {} } } };
  });
  await page.addScriptTag({ content });
  await page.waitForFunction(() => window.detected.some(m => m.product));
  assert.equal(await page.evaluate(() => window.detected.at(-1).product.name), 'آیفون ۱۵ پرومکس');
  assert.equal(await page.evaluate(() => window.detected.at(-1).product.price), 220000000);
  await page.evaluate(() => document.querySelector('#price').textContent = 'توافقی');
  await page.waitForFunction(() => window.detected.at(-1).product.price === null, { timeout: 3000 });
  await page.evaluate(() => document.querySelector('#price').textContent = '۲,۲۰۰,۰۰۰,۰۰۰ ریال');
  await page.waitForFunction(() => window.detected.at(-1).product.price === 220000000, { timeout: 3000 });
  await page.evaluate(() => document.querySelector('#price').textContent = '۲۲۰,۰۰۰,۰۰۰');
  await page.waitForFunction(() => window.detected.at(-1).product.price === null, { timeout: 3000 });
  console.log('Divar full title, labeled price, negotiable and explicit units tests passed');
} finally { await browser.close(); }
