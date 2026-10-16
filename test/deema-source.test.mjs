import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parsePrice } from '../price-utils.js';

const background = readFileSync(new URL('../background.js', import.meta.url), 'utf8');
const sidebar = readFileSync(new URL('../sidebar/sidebar.js', import.meta.url), 'utf8');
const globals = { URL, btoa, unescape, encodeURIComponent, console, parsePrice,
  beginApiRequest() {}, completeApiRequest() {} };
const source = vm.createContext({ ...globals });
vm.runInContext(background.slice(background.indexOf('const DEEMA_UNIVERSAL_LINK'),
  background.indexOf('async function searchDigikala(')), source);
const cards = vm.createContext({ ...globals });
vm.runInContext(sidebar.slice(sidebar.indexOf('function getAffiliateUrl('),
  sidebar.indexOf('\ndocument.getElementById("popup-close-btn")')), cards);

const base = 'https://deemanetwork.com/click/d/6e262f3e_1645_4f22_a310_e67585054a62/';
const targets = [
  ['تکنولایف', 'https://www.technolife.com/product-21162/هندزفری-بی-سیم-انکر-مدل-Soundcore-R50i'],
  ['تکنولایف', 'https://www.technolife.com/product-21162/test?variant=1&ref=hello%20world'],
  ['خانومی', 'https://www.khanoumi.com/products/hiska-hxke250-wireless-keyboard-93615'],
  ['گوشی شاپ', 'https://gooshishop.com/gsp-18051/گوشی-موبایل-سامسونگ-مدل-گلکسی-a16'],
];
for (const [store, target] of targets) {
  const encoded = source.createDeemaLink(target);
  assert.ok(encoded.startsWith(base));
  const payload = encoded.slice(base.length);
  assert.ok(!/[/?#]/.test(payload), 'Base64 must remain one URL path segment');
  assert.equal(Buffer.from(decodeURIComponent(payload), 'base64').toString('utf8'), new URL(target).href);
  assert.equal(cards.getAffiliateUrl(store, target), encoded, 'Background and sidebar must agree');
  assert.equal(cards.getAffiliateUrl(store, encoded), encoded, 'Do not double-wrap an existing affiliate link');
}
const affilio = 'https://publisher.affilio.ir/click?p=example&signature=keep-me';
assert.equal(cards.getAffiliateUrl('دیجی‌کالا', affilio), affilio);

// Search responses captured from the public stores: both use toman.
const technolifeItem = { code: 'TLP-21162', name: 'هندزفری بی سیم انکر مدل Soundcore R50i',
  discounted_price: 2929000, normal_price: 3200000, available: 1 };
source.fetchWithTimeout = async () => ({ ok: true, text: async () =>
  `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: {
    dehydratedState: { queries: [{ queryKey: ['search'], state: { data: { pages: [{ results: [technolifeItem] }] } } }] }
  } } })}</script>` });
let [offer] = await source.searchTechnolife('R50i');
assert.equal(offer.price, 2929000, 'Technolife prices must not be divided by ten');
assert.equal(offer.originalPrice, 3200000);
assert.equal(offer.url, cards.getAffiliateUrl('تکنولایف', offer.rawUrl));
technolifeItem.discounted_price = 0;
[offer] = await source.searchTechnolife('R50i');
assert.equal(offer.price, 3200000, 'Normal-price fallback also uses toman');
source.fetchWithTimeout = async () => ({ ok: true, json: async () => ({ data: { products: { items: [
  { slug: 'hiska-hxke250-wireless-keyboard-93615', effectivePrice: 4899000, basePrice: 5500000 }
] } } }) });
const [khanoumi] = await source.searchKhanoumi('HX-KE250');
assert.equal(khanoumi.price, 4899000);
assert.equal(khanoumi.originalPrice, 5500000);

// Gooshishop: prices already in Toman
const gooshishopItem = {
  Id: 18051,
  Name: 'گوشی موبایل سامسونگ مدل گلکسی A16',
  SeName: 'gsp-18051/گوشی-موبایل-سامسونگ-مدل-گلکسی-a16',
  StockAvailabilityType: 'InStock',
  StockQuantity: 5,
  ProductPrice: {
    Price: '55٬406٬000 تومان',
    PriceValue: 55406000,
    OldPriceValue: 57000000,
    DiscountPercentage: 3
  },
  DefaultPictureModel: {
    FullSizeImageUrl: '/images/thumbs/n/Product/test.jpeg'
  },
  ReviewOverviewModel: { RatingSum: 45, TotalReviews: 10 }
};
source.fetchWithTimeout = async () => ({
  ok: true,
  json: async () => ({
    success: true,
    result: { Products: [gooshishopItem] }
  })
});
const [gooshishop] = await source.searchGooshishop('A16');
assert.equal(gooshishop.price, 55406000, 'Gooshishop prices must be in Tomans');
assert.equal(gooshishop.originalPrice, 57000000);
assert.equal(gooshishop.store, 'گوشی شاپ');
assert.equal(gooshishop.url, cards.getAffiliateUrl('گوشی شاپ', gooshishop.rawUrl));
assert.equal(gooshishop.image, 'https://gooshishop.com/images/thumbs/n/Product/test.jpeg');
assert.equal(gooshishop.rating, 4.5);
assert.equal(gooshishop.source, 'deema');

console.log('Deema Persian URL encoding, sidebar parity, affiliate preservation and store price tests passed');
