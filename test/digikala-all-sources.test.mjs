import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { assessProductMatch, buildSearchQuery, isPriceValid, normalizeProductText } from '../filters.js';
import { createDigikalaOfferVerifier, getDigikalaProductId } from '../digikala-offer.js';
const source = readFileSync(new URL('../background.js', import.meta.url), 'utf8');
const name = 'کیبورد گیمینگ هیسکا مدل HX-KEG460';
const url = 'https://www.digikala.com/product/dkp-21372366/';
const signed = 'https://publisher.affilio.ir/click?utm_signature=original&p=' + url;
const context = { console: { log() {} }, globalAffilioPrefix: null, assessProductMatch, buildSearchQuery, isPriceValid, normalizeProductText, logApiResults() {},
  createDigikalaOfferVerifier, getDigikalaProductId,
  searchPiqoApi: async () => [{ name, store: 'دیجی کالا', price: 19668000, url: signed, sourceUrl: url, source: 'affilio', availability: true, isAffiliate: true }],
  searchDigipay: async () => [{ name, store: 'دیجی‌کالا', price: 17790000, url, availability: true }, { name, store: 'اسنپ‌شاپ', price: 19490000, url: 'https://snappshop.ir/product/snp-982944724', availability: true }],
  fetchWithTimeout: async () => ({ ok: true, json: async () => ({ data: { product: { id: 21372366, title_fa: name, status: 'marketable', default_variant: { id: 81467417, status: 'marketable', price: { selling_price: 196680000 } } } } }) }),
};
for (const fn of ['searchDigikala','searchTorob','searchEmalls','searchBasalam','searchDivar','searchSheypoor','searchMasterKala','searchKalaoma']) context[fn] = async () => [];
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('async function searchPricesFromStores('), source.indexOf('\nasync function searchPiqoApi(')), context);
const progress = [];
const results = await context.searchPricesFromStores({ name, price: 19668000 }, items => progress.push(items.map(x => ({ ...x }))));
assert.ok(progress.every(items => items.every(x => x.store !== 'دیجی‌کالا' || x.price === 19668000)), 'Do not briefly show stale Digipay price');
const dk = results.filter(x => x.store === 'دیجی‌کالا');
assert.equal(dk.length, 1);
assert.equal(dk[0].price, 19668000);
assert.equal(dk[0].url, signed);
assert.equal(results.find(x => x.store === 'اسنپ‌شاپ')?.price, 19490000);
console.log('All Digikala sources corrected before progress, merged by DKP; SnappShop unchanged');
