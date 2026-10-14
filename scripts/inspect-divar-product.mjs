import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';
const content = await readFile(new URL('../content/content.js', import.meta.url), 'utf8');
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.argv[2] || 'https://divar.ir/v/آیفون-۱۵-پرومکس/gaOv2KD2', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('h1', { timeout: 15000 });
  await page.evaluate(() => {
    window.detected = [];
    window.chrome = { runtime: { sendMessage(m) { window.detected.push(m); }, getManifest() { return { name: 'PIQO DEV' }; }, getURL() { return 'about:blank'; }, onMessage: { addListener() {} } }, storage: { local: { get(_key, cb) { cb({}); }, set() {} } } };
  });
  await page.addScriptTag({ content });
  await page.waitForFunction(() => window.detected.some(m => m.product), { timeout: 8000 });
  console.log(JSON.stringify({ imageProbe: await page.evaluate(async () => {
    const urls = [document.querySelector('meta[property="og:image"]')?.content,
      document.querySelector('img.kt-image-block__image[src*="/photo/"]')?.src].filter(Boolean);
    return Promise.all(urls.map(url => new Promise(resolve => {
      const img = new Image();
      const timeout = setTimeout(() => resolve({ url, error: 'timeout' }), 5000);
      img.onload = () => { clearTimeout(timeout); resolve({ url, width: img.naturalWidth, height: img.naturalHeight }); };
      img.onerror = () => { clearTimeout(timeout); resolve({ url, error: 'load-error' }); };
      img.src = url;
    })));
  }) }));
  console.log(JSON.stringify(await page.evaluate(() => ({
    extracted: window.detected.filter(m => m.product).at(-1)?.product,
    rows: [...document.querySelectorAll('.kt-unexpandable-row')].map(el => el.outerHTML),
    h1: document.querySelector('h1')?.outerHTML,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    images: [...document.querySelectorAll('img')].map(el => ({ html: el.outerHTML, parent: el.parentElement?.className, loaded: el.complete && el.naturalWidth > 0 })).slice(0, 15),
    body: document.body.innerText.slice(0, 4000),
  }))));
} finally { await browser.close(); }
