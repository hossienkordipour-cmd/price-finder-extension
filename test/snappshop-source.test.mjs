import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { assessProductMatch, buildSearchQuery, isPriceValid, normalizeProductText } from '../filters.js';
import { parsePiqoApiResponse } from '../piqo-api-client.js';

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
