import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { parsePrice } from '../price-utils.js';
import { parseDigikalaVerifiedOffer } from '../digikala-offer.js';
const source = process.argv.includes('--baseline') ? execFileSync('git', ['show', 'HEAD:background.js'], { encoding: 'utf8' }) : readFileSync(new URL('../background.js', import.meta.url), 'utf8');
const start = source.indexOf('async function searchDigikala(');
const end = source.indexOf('\n// ==============================', start + 10);
let reachable = true;
const context = { parsePrice,
  parseDigikalaVerifiedOffer,
  fetchWithTimeout: async url => {
    if (url.includes('/v2/product/')) {
      if (!reachable) throw new Error('timeout');
      return { ok: true, json: async () => ({ data: { product: { id: 15948785, status: 'marketable', default_variant: {
        id: 81982707, status: 'marketable', price: { selling_price: 246000000 }, seller: { title: 'پارس رایانه نو' },
      } } } }) };
    }
    return { ok: true, json: async () => ({ data: { products: [{ id: 15948785, title_fa: 'هواپز فیلیپس NA230', url: { uri: '/product/dkp-15948785/' }, default_variant: { status: 'marketable', price: { selling_price: 169000000 } } }] } }) };
  },
};
vm.createContext(context); vm.runInContext(source.slice(start, end), context);
const results = await context.searchDigikala('NA230');
assert.equal(results[0]?.price, 24600000, 'Search-feed price must be verified against the current product offer');
assert.equal(results[0]?.sellerName, 'پارس رایانه نو');
reachable = false;
assert.equal((await context.searchDigikala('NA230')).length, 0, 'No fallback to unverified stale search price');
console.log('Digikala product verification integration tests passed');
