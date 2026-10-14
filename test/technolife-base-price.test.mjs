import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
const content = process.argv.includes('--baseline') ? execFileSync('git', ['show', 'HEAD:content/content.js'], { encoding: 'utf8' }) : await readFile(new URL('../content/content.js', import.meta.url), 'utf8');
const insuranceCase = process.argv.includes('--insurance');
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  const html = `<meta charset="utf-8"><h1>ماوس بی سیم مدل ASUS MW.100</h1>
  <script type="application/ld+json">{"@type":"Product","name":"ماوس بی سیم مدل ASUS MW.100","offers":{"lowPrice":699900,"priceCurrency":"IRR"}}</script>
  <article id="selected">${insuranceCase ? '<section id="insurance"><p>بیمه به کالا اضافه شد</p><button>حذف بیمه</button><span class="line-through">492,000</span><span><span>311,600</span><span>تومان</span></span></section>' : ''}<p>100,100 <span>تومان تخفیف</span></p><div><p class="line-through">800,000</p><p id="final">${insuranceCase ? '16,400,000' : '699,900'}</p><span>تومان</span></div>
  <div><button><svg class="icon-pdpCart"></svg>افزودن به سبد خرید</button></div></article>
  <article><p>قسط ماهانه 50,000 تومان</p><div><p>728,000</p><span>تومان</span></div><button>افزودن به سبد خرید</button></article>`;
  await page.setRequestInterception(true);
  page.on('request', req => req.isNavigationRequest() ? req.respond({ status: 200, contentType: 'text/html', body: html }) : req.abort());
  await page.goto('https://www.technolife.com/product-297512/mouse');
  await page.evaluate(() => {
    window.detected = [];
    window.chrome = { runtime: { sendMessage(m) { window.detected.push(m); }, getManifest() { return { name: 'PIQO DEV' }; }, getURL() { return 'about:blank'; }, onMessage: { addListener() {} } }, storage: { local: { get(_key, callback) { callback({}); }, set() {} } } };
  });
  await page.addScriptTag({ content });
  await page.waitForFunction(() => window.detected.some(m => m.product));
  assert.equal(await page.evaluate(() => window.detected.at(-1).product.price), insuranceCase ? 16400000 : 699900, 'Read product price, not insurance or mislabeled JSON-LD');
  if (insuranceCase) {
    await page.evaluate(() => document.querySelector('#insurance span span').textContent = '400,000');
    assert.equal(await page.evaluate(() => window.detected.at(-1).product.price), 16400000);
  }
  await page.evaluate(() => document.querySelector('#final').textContent = '710,000');
  await page.waitForFunction(() => window.detected.at(-1).product.price === 710000, { timeout: 3000 });
  await page.evaluate(() => document.querySelector('#final').remove());
  await page.waitForFunction(() => window.detected.at(-1).product.price === null, { timeout: 3000 });
  await page.evaluate(() => {
    const p = document.createElement('p'); p.textContent = '7,100,000'; p.id = 'final';
    const unit = document.querySelector('#selected div span'); unit.textContent = 'ریال'; unit.before(p);
  });
  await page.waitForFunction(() => window.detected.at(-1).product.price === 710000, { timeout: 3000 });
  await page.evaluate(() => document.querySelector('#selected svg.icon-pdpCart').closest('button').disabled = true);
  await page.waitForFunction(() => window.detected.at(-1).product.price === null, { timeout: 3000 });
  console.log('Technolife selected price, updates, explicit units and unknown tests passed');
  await page.evaluate(() => { history.pushState({}, '', '/category/mouse'); document.body.append(document.createElement('div')); });
  await page.waitForFunction(() => !document.getElementById('piqo-widget-container'), { timeout: 3000 });
  console.log('Technolife category page is not detected as a product');
} finally { await browser.close(); }
