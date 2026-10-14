import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { assessProductMatch, buildSearchQuery, isPriceValid, normalizeProductText } from '../filters.js';
import { parsePiqoApiResponse } from '../piqo-api-client.js';
import { createDigikalaOfferVerifier, getDigikalaProductId } from '../digikala-offer.js';

// Exercise the actual aggregation function without network requests or Chrome.
const source = readFileSync(new URL('../background.js', import.meta.url), 'utf8');
const start = source.indexOf('async function searchPricesFromStores(');
const end = source.indexOf('\nasync function searchPiqoApi(', start);
assert.ok(start >= 0 && end > start);
const name = 'هدفون بلوتوثی انکر مدل SoundCore R50i A3949';
let directCalls = 0;
const links = ['https://aflo.ir/snapp-offer-1', 'https://aflo.ir/snapp-offer-2'];
const offers = parsePiqoApiResponse({ results: links.map((url, index) => ({
  name, store: index ? 'اسنپ‌شاپ' : 'اسنپ شاپ',
  price: 2_000_000 + index * 100_000, url, availability: true,
})) });
const context = {
  createDigikalaOfferVerifier, getDigikalaProductId,
  fetchWithTimeout: async () => { throw new Error('Fixture has no product lookup'); },
  console: { log() {} }, globalAffilioPrefix: null,
  assessProductMatch, buildSearchQuery, isPriceValid, normalizeProductText,
  logApiResults() {},
  searchPiqoApi: async () => offers.map(item => ({ ...item })),
  searchSnappShopDirect: async () => { directCalls++; return []; },
};
for (const fn of ['searchDigikala', 'searchTorob', 'searchEmalls', 'searchBasalam',
  'searchDivar', 'searchSheypoor', 'searchMasterKala', 'searchDigipay', 'searchKalaoma']) {
  context[fn] = async () => [];
}
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);
const results = await context.searchPricesFromStores({ name }, null);
assert.equal(directCalls, 0, 'Direct SnappShop search must remain disabled');
assert.equal(results.length, 2, 'Affilio SnappShop offers must survive aggregation');
assert.deepEqual(Array.from(results, item => item.url), links, 'Tracking URLs must stay unchanged');
assert.ok(results.every(item => item.store === 'اسنپ‌شاپ' && item.isAffiliate && item.source === 'affilio'));

context.searchPiqoApi = async () => [];
assert.equal((await context.searchPricesFromStores({ name }, null)).length, 0);
assert.equal(directCalls, 0, 'Empty Affilio results must not fall back to direct search');
console.log('SnappShop Affilio-only source tests passed');

const dkName = 'هواپز فیلیپس NA230';
const suppliedLink = 'https://publisher.affilio.ir/click?utm_signature=original&p=https://www.digikala.com/product/dkp-15948785/';
context.searchPiqoApi = async () => [{ name: dkName, store: 'دیجی کالا', price: 16900000, availability: true,
  source: 'affilio', isAffiliate: true, sourceUrl: 'https://www.digikala.com/product/dkp-15948785/', url: suppliedLink }];
context.searchDigikala = async () => [{ name: dkName, store: 'دیجی‌کالا', price: 24600000, availability: true,
  priceSource: 'digikala-product-api', priceVerified: true, variantId: 81982707, sellerName: 'پارس رایانه نو',
  suppressSavings: true, url: 'https://www.digikala.com/product/dkp-15948785/' }];
const verifiedResults = await context.searchPricesFromStores({ name: dkName, price: 30000000 });
assert.equal(verifiedResults.length, 1);
assert.equal(verifiedResults[0].price, 24600000, 'Do not replace verified price with stale affiliate feed');
assert.equal(verifiedResults[0].url, suppliedLink, 'Preserve matching affiliate link byte-for-byte');
assert.equal(verifiedResults[0].sellerName, 'پارس رایانه نو');
console.log('Verified Digikala price and original affiliate link merge tests passed');
