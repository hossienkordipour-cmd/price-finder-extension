import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';
const content = await readFile(new URL('../content/content.js', import.meta.url), 'utf8');
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(process.argv[2] || 'https://www.technolife.com/product-297512/ماوس-بی-سیم-مدل-asus-mw.100', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('h1', { timeout: 15000 });
  await page.evaluate(() => {
    window.detected = [];
    window.chrome = { runtime: { sendMessage(message) { window.detected.push(message); }, getManifest() { return { name: 'PIQO DEV' }; }, getURL() { return 'about:blank'; }, onMessage: { addListener() {} } }, storage: { local: { get(_key, callback) { callback({}); }, set() {} } } };
  });
  await page.addScriptTag({ content });
  await page.waitForFunction(() => window.detected.some(m => m.product), { timeout: 8000 });
  console.log(JSON.stringify(await page.evaluate(() => ({
    extracted: window.detected.filter(m => m.product).at(-1)?.product,
    schema: [...document.querySelectorAll('script[type="application/ld+json"]')].map(el => el.textContent),
    carts: [...document.querySelectorAll('button')].filter(el => el.textContent.includes('افزودن به سبد خرید')).slice(0, 2).map(el => {
      let parent = el.parentElement;
      while (parent && !parent.querySelector('svg.icon-toman, [class*="price"], [class*="Price"]') && !/تومان/.test(parent.innerText)) parent = parent.parentElement;
      return parent?.outerHTML.slice(0, 22000);
    }),
  }))));
} finally { await browser.close(); }
