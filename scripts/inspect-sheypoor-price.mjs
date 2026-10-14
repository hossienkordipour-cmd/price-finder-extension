import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';
const content = await readFile(new URL('../content/content.js', import.meta.url), 'utf8');
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  await page.goto('https://www.sheypoor.com/v/و-207i-دنده-ا-tu3-1405-سف-د-457193375.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('h1', { timeout: 15000 });
  await page.evaluate(() => {
    window.detected = [];
    window.chrome = { runtime: { sendMessage(m) { window.detected.push(m); }, getManifest() { return { name: 'PIQO DEV' }; }, getURL() { return 'about:blank'; }, onMessage: { addListener() {} } }, storage: { local: { get(_key, cb) { cb({}); }, set() {} } } };
  });
  await page.addScriptTag({ content });
  await page.waitForFunction(() => window.detected.some(m => m.product), { timeout: 8000 });
  console.log(JSON.stringify(await page.evaluate(() => ({
    extracted: window.detected.filter(m => m.product).at(-1)?.product,
    priceMarkup: [...document.querySelectorAll('body *')].filter(el => el.textContent.trim().length < 45 && /۲,۲۷۵,۰۰۰,۰۰۰|2,275,000,000/.test(el.textContent)).map(el => el.outerHTML.slice(0, 5000)).slice(0, 3),
  }))));
} finally { await browser.close(); }
