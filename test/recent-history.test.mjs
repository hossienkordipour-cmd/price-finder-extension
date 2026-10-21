import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import * as stateTools from '../tab-state.js';

const source = await readFile(new URL('../background.js', import.meta.url), 'utf8');
const storage = {};
const listeners = {};
let clock = 1000;
class FixedDate extends Date { static now() { return clock; } }
const local = {
  async get(keys) { await Promise.resolve(); return Object.fromEntries(keys.map(k => [k, storage[k]])); },
  async set(values) { await Promise.resolve(); Object.assign(storage, structuredClone(values)); },
  async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete storage[key]; },
};
const context = vm.createContext({console, Date: FixedDate, URL, setTimeout, clearTimeout, AbortController,
  ...stateTools, normalizeProductText: value => value.toLowerCase().trim(), SearchResultCache: class {},
  chrome: {storage: {local}, action: {onClicked: {addListener() {}}},
    runtime: {onInstalled: {addListener() {}}, onMessage: {addListener(fn) {listeners.message = fn;}}, sendMessage() {return Promise.resolve();}},
    tabs: {onRemoved: {addListener(fn) {listeners.removed = fn;}}, onUpdated: {addListener() {}}, onActivated: {addListener() {}}}},
});
vm.runInContext(source.replace(/import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];?/g, ''), context);
vm.runInContext('searchPrices = async () => []', context);
const call = (fn, ...args) => {context.args = args; return vm.runInContext(`${fn}(...args)`, context);};
const history = () => storage.recent_products_history || [];
const product = (id, overrides = {}) => ({name: `محصول ${id}`, source: 'generic', store: 'example.com',
  price: 250000, sourceUrl: `https://example.com/product/${id}`, ...overrides});
const message = (payload, sender = {}) => new Promise(resolve => listeners.message(payload, sender, resolve));

const first = product(1), second = product(2);
await call('registerDetectedProduct', 1, first);
assert.equal(history().length, 0, 'Simply detecting a product must not record browsing history');
await call('startTabSearch', 1, first);
assert.equal(history().length, 0, 'An automatic search is not an intentional panel open');
await call('recordOpenedProduct', 1, first.sourceUrl);
assert.equal(history().length, 1, 'Opening a cached product records it too');
const initialTime = history()[0].viewedAt;
const signedLink = 'https://publisher.affilio.ir/click?signature=keep-exact&p=' + encodeURIComponent(first.sourceUrl);
await call('attachHistoryAffiliateLinks', [{sourceUrl: second.sourceUrl, url: signedLink}]);
assert.ok(!history()[0].affiliateUrl, 'Different product destinations cannot attach affiliate links');
await call('attachHistoryAffiliateLinks', [{sourceUrl: first.sourceUrl, url: signedLink}]);
assert.equal(history()[0].affiliateUrl, signedLink, 'Exact supplied signed link is preserved');
assert.equal(history()[0].viewedAt, initialTime);
clock = 2000;
await call('registerDetectedProduct', 1, {...first, price: 310000, image: 'https://example.com/photo.png'});
assert.equal(history()[0].price, 310000);
assert.equal(history()[0].affiliateUrl, signedLink, 'Metadata refresh preserves the affiliate destination');
assert.equal(history()[0].viewedAt, initialTime, 'Metadata updates do not change order/time');
await call('invalidateTabPage', 1, second.sourceUrl, true);
await call('registerDetectedProduct', 1, second);
assert.equal(history().length, 1, 'Navigating while the panel exists is not a new user action');
await call('recordOpenedProduct', 1, second.sourceUrl);
assert.equal(history()[0].url, second.sourceUrl);

await call('invalidateTabPage', 1, first.sourceUrl, true);
await call('registerDetectedProduct', 1, {...first, sourceUrl: first.sourceUrl + '?utm_source=test'});
clock = 3000;
await call('recordOpenedProduct', 1, first.sourceUrl);
assert.equal(history().length, 2);
assert.equal(history()[0].url, first.sourceUrl, 'Tracking variants do not create duplicate products');
assert.equal(history()[0].viewedAt, 3000);

await call('invalidateTabPage', 2, product(3).sourceUrl, true);
await call('recordOpenedProduct', 2, product(3).sourceUrl);
await call('registerDetectedProduct', 2, product(3));
assert.equal(history()[0].url, product(3).sourceUrl, 'Opening before delayed detection still records the product');
await call('registerDetectedProduct', 3, product(3, {sourceUrl: 'https://other.example/product/3'}));
await call('recordOpenedProduct', 3, 'https://other.example/product/3');
assert.equal(history().length, 4, 'Same titles from distinct product URLs remain distinct');

const count = history().length;
assert.equal((await message({type: 'PIQO_OPENED', url: first.sourceUrl}, {tab: {id: 1, url: second.sourceUrl}})).success, false);
assert.equal(history().length, count, 'A mismatched sender URL cannot record a different page');
await call('saveToRecentHistory', product(9, {source: 'manual'}));
await call('saveToRecentHistory', product(9, {sourceUrl: 'javascript:alert(1)'}));
assert.equal(history().length, count);
assert.equal((await message({type: 'CLEAR_RECENT_HISTORY'})).success, true);
await call('registerDetectedProduct', 1, {...first, price: 350000});
assert.equal(history().length, 0, 'Cleared history must not reappear on delayed metadata updates');
const queuedOpen = call('recordOpenedProduct', 1, first.sourceUrl);
await message({type: 'CLEAR_RECENT_HISTORY'});
await queuedOpen;
assert.equal(history().length, 0, 'An earlier panel-open still queued when clear is pressed must be canceled');

await Promise.all(Array.from({length: 12}, async (_, i) => {
  const item = product(100 + i);
  await call('registerDetectedProduct', 100 + i, item);
  await call('recordOpenedProduct', 100 + i, item.sourceUrl);
}));
assert.equal(history().length, 10, 'Concurrent tabs share a bounded serialized history');
assert.equal(new Set(history().map(item => item.url)).size, 10);
const response = await message({type: 'GET_RECENT_HISTORY'});
assert.equal(response.history.length, 10);
console.log('Recent history: explicit opens, cached/late products, navigation, metadata, deduplication, clear and concurrent tabs passed');
