import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
let content = await readFile(new URL('../content/content.js', import.meta.url), 'utf8');
if (process.argv.includes('--without-fix')) content = content.replace("product = extractEtkala();", "product = extractGeneric();");
content = content.replace('function extractGeneric() {', 'window.testExtractEtkala = extractEtkala; function extractGeneric() {');
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const html = `<meta charset="utf-8"><meta property="og:title" content="فروشگاه اینترنتی اتکالا"><meta property="og:type" content="website"><h1>رول فیلم استرچ محافظ غذایی ۵۰ متری آیری پلاست</h1><img alt="product-image-0" src="/product.webp"><div><div class="direction-reverse"><span id="price" class="text-cool-gray-950">۳۰۰،۰۰۰ تومانء</span><span class="line-through">۶۰۰،۰۰۰</span></div><button>افزودن به سبد خرید</button></div><article><span>۵۳۱،۰۰۰ تومان</span><button>add item</button></article>`;
try {
  async function open(path) {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', req => req.isNavigationRequest() ? req.respond({status:200,contentType:'text/html',body:html}) : req.abort());
    await page.goto('https://etkala.ir' + path);
    await page.evaluate(() => {
      window.detected=[];
      window.chrome={runtime:{sendMessage(m){window.detected.push(m)},getManifest(){return{name:'PIQO DEV'}},getURL(){return'about:blank'},onMessage:{addListener(){}}},storage:{local:{get(k,cb){cb({})},set(){}}}};
    });
    await page.addScriptTag({content});
    return page;
  }
  const page = await open('/products/312702/film');
  await page.waitForFunction(() => window.detected.some(m=>m.product), {timeout:2500});
  let product = await page.evaluate(()=>window.detected.filter(m=>m.product).at(-1).product);
  assert.equal(product.name,'رول فیلم استرچ محافظ غذایی ۵۰ متری آیری پلاست');
  assert.equal(product.price,300000);
  assert.equal(product.image,'https://etkala.ir/product.webp');
  await page.evaluate(()=>document.querySelector('#price').textContent='۴,۰۰۰,۰۰۰ ریال');
  await page.waitForFunction(()=>window.detected.filter(m=>m.product).at(-1).product.price===400000,{timeout:2500});
  await page.evaluate(()=>document.querySelector('#price').textContent='ناموجود');
  await page.waitForFunction(()=>window.detected.filter(m=>m.product).at(-1).product.price===null,{timeout:2500});
  for (const path of ['/', '/search/category/361']) {
    const normal = await open(path);
    assert.equal(await normal.evaluate(()=>window.testExtractEtkala()),null);
    await normal.close();
  }
  console.log('Etkala title, scoped sale price, image, dynamic unknown and non-product controls passed');
} finally { await browser.close(); }
