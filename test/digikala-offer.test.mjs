import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseDigikalaVerifiedOffer } from '../digikala-offer.js';
const payload = { data: { product: { id: 15948785, status: 'marketable', title_fa: 'هواپز فیلیپس NA230', default_variant: {
  id: 81982707, status: 'marketable', color: { title: 'مشکی' }, seller: { title: 'پارس رایانه نو' },
  warranty: { title_fa: 'گارانتی 18 ماهه پارسا الکترونیک' }, price: { selling_price: 246000000, rrp_price: 249000000 },
} } } };
const candidate = { store: 'دیجی‌کالا', name: 'NA230', price: 16900000, url: 'https://www.digikala.com/product/dkp-15948785/' };
const offer = parseDigikalaVerifiedOffer(payload, candidate, 15948785);
assert.equal(offer.price, 24600000);
assert.equal(offer.variantId, 81982707);
assert.equal(offer.offerColor, 'مشکی');
assert.equal(candidate.price, 16900000);
assert.equal(parseDigikalaVerifiedOffer(payload, candidate, 99), null);
for (const update of [p => p.default_variant.status = 'out_of_stock', p => p.default_variant.price.marketable_stock = 0,
  p => p.default_variant.price.is_locked_for_digiplus = true, p => p.default_variant.price.is_plus_early_access = true,
  p => p.status = 'out_of_stock', p => p.default_variant.price.selling_price = 0]) {
  const copy = structuredClone(payload); update(copy.data.product);
  assert.equal(parseDigikalaVerifiedOffer(copy, candidate, 15948785), null);
}
const source = readFileSync(new URL('../sidebar/sidebar.js', import.meta.url), 'utf8');
const start = source.indexOf('function generateCardHtml(');
const end = source.indexOf('\nfunction showLoading(', start);
const context = { currentProduct: { price: 30000000 }, formatPrice: value => value.toLocaleString('fa-IR'), getAffiliateUrl: (_store, url) => url };
vm.createContext(context); vm.runInContext(source.slice(start, end), context);
const html = context.generateCardHtml(offer);
assert.ok(!html.includes('پارس رایانه نو') && !html.includes('گارانتی 18 ماهه'), 'Seller details stay internal, not card descriptions');
assert.ok(html.includes('دیجی‌کالا') && html.includes('هواپز فیلیپس NA230'));
assert.ok(!html.includes('ارزان تر'), 'No certain savings claim for product URL without bound seller');
assert.ok(!html.includes('در مقصد بررسی کن') && !html.includes('card-offer-details'));
assert.ok(!context.generateCardHtml({ ...offer, sellerName: '<script>test</script>' }).includes('<script>test</script>'));
console.log('Digikala offer availability, identity and compact card tests passed');
