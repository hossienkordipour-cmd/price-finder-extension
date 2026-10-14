import assert from 'node:assert/strict';
import { createDigikalaOfferVerifier, getDigikalaProductId } from '../digikala-offer.js';
const direct = { name: 'HX-KEG460', store: 'دیجی‌کالا', price: 17790000, url: 'https://www.digikala.com/product/dkp-21372366/' };
const signed = { ...direct, source: 'affilio', isAffiliate: true, url: 'https://publisher.affilio.ir/click?utm_signature=original&p=' + encodeURIComponent(direct.url) };
assert.equal(getDigikalaProductId(signed), '21372366');
assert.equal(getDigikalaProductId({ url: 'https://evil.example/product/dkp-21372366/' }), null);
assert.equal(getDigikalaProductId({ url: 'https://www.digikala.com.evil.example/product/dkp-21372366/' }), null);
let calls = 0;
const verify = createDigikalaOfferVerifier(async (url, options) => {
  calls++; assert.ok(url.endsWith('/21372366/')); assert.equal(options.credentials, 'omit');
  return { ok: true, json: async () => ({ data: { product: { id: 21372366, status: 'marketable', title_fa: 'HX-KEG460', default_variant: {
    id: 81467417, status: 'marketable', price: { selling_price: 196680000 },
  } } } }) };
});
const [first, second] = await Promise.all([verify(direct, 'دیجی‌پی'), verify(signed, 'افیلیو')]);
assert.equal(calls, 1);
assert.equal(first.price, 19668000); assert.equal(second.price, 19668000);
assert.equal(first.priceInputSource, 'دیجی‌پی');
assert.equal(second.url, signed.url); assert.equal(second.originalAffiliateUrl, signed.url);
assert.equal(direct.price, 17790000, 'Do not mutate source evidence');
const snapp = { ...direct, store: 'اسنپ‌شاپ', url: 'https://snappshop.ir/product/snp-982944724', price: 19490000 };
assert.equal(await verify(snapp), snapp); assert.equal(calls, 1);
const failed = createDigikalaOfferVerifier(async () => { throw new Error('timeout'); });
const fallback = await failed(direct);
assert.equal(fallback.price, direct.price); assert.equal(fallback.url, direct.url);
assert.equal(fallback.priceVerification, 'unavailable');
assert.notEqual(fallback.priceVerified, true);
console.log('Shared Digikala lookup, signed links, untouched stores and unchanged failure fallback passed');
