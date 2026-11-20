import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {assessProductMatch, buildSearchQuery, isPriceValid, normalizeProductText} from '../filters.js';
import {buildResultReport} from '../result-reports.js';

const product = {
  name: 'گوشی اپل آیفون 15 ظرفیت 128 گیگابایت',
  source: 'digikala',
  sourceUrl: 'https://www.digikala.com/product/dkp-123/iphone?tracking=1#utm',
  price: 50_000_000,
};

test('actual aggregation preserves rejected counts and the report classifies the final outcome', async () => {
  const source = await readFile(new URL('../background.js', import.meta.url), 'utf8');
  const calls = {
    URL, buildSearchQuery, assessProductMatch, isPriceValid, normalizeProductText,
    console: {log() {}}, logApiResults() {},
    createDigikalaOfferVerifier: () => async offer => offer,
    getDigikalaProductId: () => null,
    fetchWithTimeout: () => {},
  };
  for (const name of ['searchPiqoApi','searchTechnolife','searchKhanoumi','searchGooshishop','searchDigikala',
    'searchTorob','searchEmalls','searchBasalam','searchDivar','searchSheypoor','searchMasterKala','searchDigipay','searchKalaoma']) {
    calls[name] = async () => [];
  }
  const base = {store: 'ترب', name: product.name, price: product.price, url: 'https://torob.com/p/valid'};
  calls.searchTorob = async () => [
    base,
    {...base, name: base.name.replace('128', '256')},
    {...base, url: ''},
    {...base, name: 'گوشی موبایل'},
    {...base, availability: false},
  ];
  vm.createContext(calls);
  vm.runInContext(source.slice(source.indexOf('async function searchPricesFromStores('),
    source.indexOf('\nasync function searchPiqoApi(')), calls);
  const trace = {id: crypto.randomUUID(), requests: [], sources: [], cache: 'network', source(row) {this.sources.push(row);}};
  const results = await calls.searchPricesFromStores(product, null, trace);
  assert.equal(results.length, 1);
  const input = {product, trace, count: results.length, version: '1.1.0', build: 'dev'};
  const report = buildResultReport(input);
  assert.equal(report.type, 'invalid_results');
  assert.equal(report.product_url, 'https://digikala.com/product/dkp-123/');
  assert.deepEqual({...report.sources.find(row => row.source === 'torob').rejected},
    {'capacity-mismatch': 1, invalid_link: 1, uncertain: 1, unavailable: 1});
  assert.equal(report.sources.find(row => row.source === 'torob').accepted, 1);
  assert.equal(JSON.stringify(report).includes(product.name), false);
  assert.equal(JSON.stringify(report).includes(base.url), false);
  assert.equal(buildResultReport({...input, product: {...product, source: 'manual'}}), null);
});

test('empty states, cache history and ambiguous matches remain distinct', () => {
  const source = (status, result_count, result_rejections = {}) =>
    ({source: 'digikala', status, result_count, accepted_count: result_count === null ? null : 0, result_rejections});
  const report = (sources, count = 0, extra = {}) => buildResultReport({
    product, count, version: '1.1.0', build: 'dev',
    trace: {id: crypto.randomUUID(), cache: 'network', requests: [], sources, ...extra},
  });
  assert.equal(report([source('empty', 0)]).type, 'no_results');
  assert.equal(report([source('success', 1, {uncertain: 1})]).type, 'no_usable_results');
  assert.equal(report([source('success', 1, {uncertain: 1})], 1), null);
  assert.equal(report([source('failed', null), source('empty', 0)]).type, 'source_failure');
  assert.equal(report([], 0, {cache: 'client'}).type, 'unknown');
  assert.equal(report([], 0, {cache: 'client', resultEvidence: {sources: [source('empty', 0)], hadRequestError: true}}).type, 'source_failure');
});
