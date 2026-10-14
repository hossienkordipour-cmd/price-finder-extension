import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const source = process.argv.includes('--baseline')
  ? execFileSync('git', ['show', 'HEAD:background.js'], { encoding: 'utf8' })
  : readFileSync(new URL('../background.js', import.meta.url), 'utf8');
const start = source.indexOf('async function searchDigipay(');
const end = source.indexOf('\nasync function searchPricesFromStores(', start);
const url = 'http://amiirstore.com/product/soundcore-r50i-a3949/';
const html = `<article><div class="store-logo"><img alt="امیر استور"></div>
<img class="blend-multiply" alt="SoundCore R50i A3949" src="image.webp">
<a onclick="goToProduct('${url}', 'amiirstore.com')"></a>
<div class="price"><span>29,500,000</span><span>تومان</span></div></article>`;
let verified = 0;
let available = true;
const context = {
  needsMerchantPriceCheck: () => true,
  fetchWithTimeout: async () => ({ ok: true, text: async () => html }),
  verifyDigipayMerchantOffer: async offer => {
    verified++;
    return available ? { ...offer, price: 2950000, priceVerified: true } : null;
  },
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);
let results = await context.searchDigipay('R50i A3949');
assert.equal(results[0]?.price, 2950000, 'Use verified merchant price, not mislabeled Digipay amount');
assert.equal(verified, 1);
assert.equal(results[0].url, url);
available = false;
results = await context.searchDigipay('R50i A3949');
assert.equal(results.length, 0, 'Unverified merchant offer must not fall back to known bad price');
console.log('Digipay merchant-price integration tests passed');
