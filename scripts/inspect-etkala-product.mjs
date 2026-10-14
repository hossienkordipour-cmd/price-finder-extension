import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';
const content = await readFile(new URL('../content/content.js', import.meta.url), 'utf8');
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  const response = await page.goto(process.argv[2] || 'https://etkala.ir/products/312702/رول-فیلم-استرچ-محافظ-غذایی-۵۰-متری-آیری-پلاست', { waitUntil: 'networkidle2', timeout: 45000 });
  await page.evaluate(() => {
    window.detected = [];
    window.chrome = { runtime: { sendMessage(m) { window.detected.push(m); }, getManifest() { return { name: 'PIQO DEV' }; }, getURL() { return 'about:blank'; }, onMessage: { addListener() {} } }, storage: { local: { get(_key, cb) { cb({}); }, set() {} } } };
  });
  await page.addScriptTag({ content });
  await page.waitForFunction(() => window.detected.some(m => m.product), { timeout: 3000 }).catch(() => {});
  console.log(JSON.stringify({ status: response.status(), ...await page.evaluate(() => ({
    extracted: window.detected.filter(m => m.product).at(-1)?.product || null,
    title: document.title,
    headings: [...document.querySelectorAll('h1')].map(e => e.outerHTML),
    schema: [...document.querySelectorAll('script[type="application/ld+json"]')].map(e => e.textContent),
    prices: [...document.querySelectorAll('[class*="price"], [id*="price"], [itemprop]')].slice(0, 35).map(e => e.outerHTML.slice(0, 4000)),
    buttons: [...document.querySelectorAll('button')].filter(e => /سبد|خرید/.test(e.textContent)).slice(0, 4).map(e => e.parentElement.outerHTML.slice(0, 8000)),
  })) }, null, 2));
} finally { await browser.close(); }
