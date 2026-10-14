import puppeteer from 'puppeteer-core';
import { parseAmirStorePrice } from '../merchant-price.js';

const browser=await puppeteer.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
try {
  const page=await browser.newPage();
  const query='R50i A3949';
  for(const url of [
    `https://api.piqoo.ir/v1/search?q=${encodeURIComponent(query)}`,
    `https://www.mydigipay.com/search/0?query=${encodeURIComponent(query)}`,
    'http://amiirstore.com/product/هدفون-بلوتوثی-انکر-مدل-soundcore-r50i-a3949-بدون-قابلیت/',
  ]) {
    if (process.argv.includes('--verify-only') && !url.includes('amiirstore.com')) continue;
    try {
      const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
      const raw=await response.text();
      if(url.includes('/v1/search')) {
        const payload=JSON.parse(raw);
        console.log(JSON.stringify({source:'affilio-backend',status:response.status(),results:payload.results?.map(({store,name,price,currency,sourceUrl})=>({store,name,price,currency,sourceUrl}))}));
      } else if(url.includes('mydigipay')) {
        const blocks=raw.split('<article>').slice(1);
        const matching=blocks.filter(block=>/amiirstore|امیر/.test(block));
        console.log(JSON.stringify({source:'digipay',status:response.status(),cards:blocks.length,rawCards:matching.slice(0,3).map(block=>block.slice(0,8000))}));
        console.log(JSON.stringify({source:'digipay-rendered',cards:await page.evaluate(()=>[...document.querySelectorAll('article')].filter(el=>/امیر|amiirstore/.test(el.outerHTML)).map(el=>({text:el.innerText,html:el.outerHTML.slice(0,8000)})).slice(0,3))}));
      } else {
        if (process.argv.includes('--verify-only')) {
          const price = parseAmirStorePrice(raw, url, page.url());
          console.log(JSON.stringify({ source: 'merchant-adapter', status: response.status(), price, currency: 'IRT' }));
          if (price === null) console.log(JSON.stringify({ scripts: raw.match(/<script[^>]*ld\+json[^>]*>/g), priceMarkup: raw.match(/.{0,80}current-price[\s\S]{0,500}/g)?.slice(0,2) }));
          if (price !== 2950000) throw new Error('Live merchant price did not match the R03 evidence; review current page');
          continue;
        }
        console.log(JSON.stringify({source:'merchant',status:response.status(),url:page.url(),data:await page.evaluate(()=>({title:document.title,h1:document.querySelector('h1')?.textContent,prices:[...document.querySelectorAll('.price, [itemprop="price"]')].slice(0,8).map(el=>el.outerHTML),schema:[...document.querySelectorAll('script[type="application/ld+json"]')].map(el=>el.textContent).slice(0,4),body:document.body.innerText.slice(0,5000)}))}));
      }
    } catch(error) {
      console.log(JSON.stringify({url,error:error.message}));
      if (process.argv.includes('--verify-only')) process.exitCode = 1;
    }
  }
} finally {await browser.close();}
