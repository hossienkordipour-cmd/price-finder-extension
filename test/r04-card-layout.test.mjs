import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import puppeteer from 'puppeteer-core';
const source = readFileSync(new URL('../sidebar/sidebar.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../sidebar/sidebar.css', import.meta.url), 'utf8');
const context = { currentProduct: { price: 30000000 }, formatPrice: value => value.toLocaleString('fa-IR'), getAffiliateUrl: (_store, url) => url };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function generateCardHtml('), source.indexOf('\nfunction showLoading(')), context);
const html = context.generateCardHtml({ name: 'هواپز فیلیپس NA230', store: 'دیجی‌کالا', price: 24600000,
  url: 'https://example.test/', priceSource: 'digikala-product-api', sellerName: 'پارس رایانه نو',
  offerColor: 'مشکی', offerWarranty: 'گارانتی 18 ماهه پارسا الکترونیک', suppressSavings: true });
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  await page.setRequestInterception(true); page.on('request', req => req.abort());
  await page.setViewport({ width: 380, height: 800 });
  await page.setContent(`<meta charset="utf-8"><style>${css}</style><div class="results-list" id="results-list">${html}</div>`);
  for (const mode of ['list', 'grid']) {
    if (mode === 'grid') await page.$eval('#results-list', el => el.classList.add('grid-view'));
    assert.equal(await page.$$eval('.card-offer-details', els => els.length), 0);
    const report = await page.$eval('.card-content', el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth,
      height: el.clientHeight, scrollHeight: el.scrollHeight, text: el.textContent }));
    assert.ok(report.width > 0 && report.height > 0);
    assert.ok(report.scrollWidth <= report.width + 1, 'Compact card must not overflow');
    assert.ok(!report.text.includes('در مقصد بررسی کن') && !report.text.includes('پارس رایانه نو'));
    assert.ok(report.text.includes('دیجی‌کالا'));
  }
  console.log('R04 compact card without descriptions list/grid layout tests passed');
} finally { await browser.close(); }
