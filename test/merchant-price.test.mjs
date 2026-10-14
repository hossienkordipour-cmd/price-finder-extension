import assert from 'node:assert/strict';
import { parseAmirStorePrice, verifyDigipayMerchantOffer } from '../merchant-price.js';
const url = 'http://amiirstore.com/product/r50i/';
const offer = { url, price: 29500000, name: 'R50i A3949' };
function page({ amount = '29500000', currency = 'IRR', availability = 'https://schema.org/InStock',
  destination = url, visible = '2,950,000', unit = 'تومان' } = {}) {
  return `<script type="application/ld+json">${JSON.stringify({ '@graph': [{ '@type': 'Product', offers: {
    price: amount, priceCurrency: currency, availability, url: destination,
  } }] })}</script><div data-prk-price-sync-context="global"><div class="old-price">9,000,000</div><div>
  <span class="current-price">${visible}</span><span class="currency-symbol">${unit}</span></div></div>
  <div><span class="current-price">3,560,000</span><span class="currency-symbol">تومان</span></div>`;
}
assert.equal(parseAmirStorePrice(page(), url), 2950000);
assert.equal(parseAmirStorePrice(page({ amount: '2950000', currency: 'IRT' }), url), 2950000);
assert.equal(parseAmirStorePrice(page({ amount: '29500000', currency: 'IRT', visible: '29,500,000' }), url), 29500000, 'Never divide every large number');
assert.equal(parseAmirStorePrice(page({ visible: '۲٬۹۵۰٬۰۰۰' }), url), 2950000);
for (const input of [page({ currency: '' }), page({ availability: 'https://schema.org/OutOfStock' }),
  page({ visible: '3,000,000' }), page({ destination: 'http://amiirstore.com/product/other/' }),
  page({ unit: '' }), '<script type="application/ld+json">broken</script>']) {
  assert.equal(parseAmirStorePrice(input, url), null);
}
assert.equal(parseAmirStorePrice(page(), url, 'https://other.com/product/r50i/'), null);
assert.equal(parseAmirStorePrice(page() + page(), url), null, 'Multiple offers are ambiguous');
assert.equal(parseAmirStorePrice(page(), 'http://amiirstore.com/'), null);
let calls = 0;
const fetchPage = async (requested, options) => {
  calls++; assert.equal(requested, url); assert.equal(options.credentials, 'omit');
  assert.equal(options.timeout, 5000);
  return { ok: true, url, text: async () => page() };
};
const result = await verifyDigipayMerchantOffer(offer, fetchPage);
assert.equal(result.price, 2950000);
assert.equal(result.priceSource, 'merchant-page');
assert.equal(offer.price, 29500000, 'Do not mutate upstream evidence');
const other = { ...offer, url: 'https://other.com/product/r50i/' };
assert.equal(await verifyDigipayMerchantOffer(other, fetchPage), other);
assert.equal(calls, 1);
assert.equal(await verifyDigipayMerchantOffer(offer, async () => { throw new Error('timeout'); }), null);
assert.equal(await verifyDigipayMerchantOffer(offer, async () => ({ ok: false })), null);
console.log('Merchant price verification tests passed');
