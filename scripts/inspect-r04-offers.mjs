import puppeteer from 'puppeteer-core';
import { parseDigikalaVerifiedOffer } from '../digikala-offer.js';
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  for (const url of ['https://api.piqoo.ir/v1/search?q=NA230',
    'https://api.digikala.com/v2/product/15948785/',
    'https://www.digikala.com/product/dkp-15948785/']) {
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      if (url.includes('api.piqoo')) {
        const payload = JSON.parse(await response.text());
        console.log(JSON.stringify({ source: 'affilio-backend', status: response.status(), results: payload.results?.map(({ name, store, price, sourceUrl, code }) => ({ name, store, price, sourceUrl, code })) }));
      } else if (url.includes('api.digikala')) {
        const payload = JSON.parse(await response.text()); const product = payload.data?.product;
        const summarize = v => ({ id: v.id, status: v.status, seller: v.seller?.title, color: v.color?.title,
          warranty: v.warranty?.title_fa, price: v.price?.selling_price / 10, stock: v.price?.marketable_stock,
          locked: v.price?.is_locked_for_digiplus });
        console.log(JSON.stringify({ source: 'digikala-api', status: response.status(), title: product?.title_fa,
          verified: parseDigikalaVerifiedOffer(payload, { url: 'https://www.digikala.com/product/dkp-15948785/' }, 15948785),
          defaultVariant: product?.default_variant && summarize(product.default_variant), variants: product?.variants?.map(summarize), statusProduct: product?.status }));
      } else {
        await page.waitForSelector('h1', { timeout: 12000 });
        await page.waitForSelector('[data-testid="price-final"]', { timeout: 12000 });
        console.log(JSON.stringify({ source: 'destination', data: await page.evaluate(() => ({
          title: document.querySelector('h1')?.textContent,
          buttons: [...document.querySelectorAll('button[data-testid="add-to-cart"]')].map(el => ({ variant: el.dataset.addToCartVariantId, cro: el.dataset.croId })),
          prices: [...document.querySelectorAll('[data-testid="price-final"]')].map(el => el.textContent),
          sellers: document.body.innerText.match(/.{0,50}(?:ورلد شاپ|فروشنده|موجود در انبار).{0,100}/g)?.slice(0, 15),
        })) }));
      }
    } catch (error) { console.log(JSON.stringify({ url, error: error.message })); }
  }
} finally { await browser.close(); }
