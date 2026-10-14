import { getCurrencyUnit, parsePrice } from './price-utils.js';

function productKey(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
      || url.port || !['amiirstore.com', 'www.amiirstore.com'].includes(url.hostname)
      || !url.pathname.startsWith('/product/')) return null;
    return decodeURIComponent(url.pathname).replace(/\/+$/, '').toLowerCase();
  } catch { return null; }
}
export function needsMerchantPriceCheck(url) {
  try { return ['amiirstore.com', 'www.amiirstore.com'].includes(new URL(url).hostname); }
  catch { return false; }
}

// Limited to Amir Store's verified format. Never infer units from magnitude.
export function parseAmirStorePrice(html, requestedUrl, responseUrl = requestedUrl) {
  const key = productKey(requestedUrl);
  if (!key || productKey(responseUrl) !== key) return null;
  const products = [];
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]);
      const nodes = Array.isArray(data) ? data : (data['@graph'] || [data]);
      products.push(...nodes.filter(node => [node['@type']].flat().includes('Product')));
    } catch { /* Malformed JSON cannot verify a price. */ }
  }
  const offers = products.flatMap(product => [product.offers].flat().filter(Boolean))
    .filter(offer => productKey(offer.url) === key);
  if (offers.length !== 1) return null;
  const offer = offers[0];
  const unit = getCurrencyUnit(offer.priceCurrency);
  if (!unit || !/^https?:\/\/schema\.org\/InStock$/.test(offer.availability)
    || !/^\d+(?:\.0+)?$/.test(String(offer.price))) return null;
  const price = parsePrice(String(Number(offer.price)), unit);
  if (price <= 0) return null;
  // Related-product cards reuse current-price; only the main global component counts.
  const components = [...html.matchAll(/<div\b(?=[^>]*\bdata-prk-price-sync-context=["']global["'])[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi)];
  const visiblePrices = components.flatMap(component => [...component[1].matchAll(/<span\b[^>]*class=["'][^"']*\bcurrent-price\b[^"']*["'][^>]*>\s*([^<]+)<\/span>\s*<span\b[^>]*class=["'][^"']*\bcurrency-symbol\b[^"']*["'][^>]*>\s*([^<]+)<\/span>/gi)]);
  if (!visiblePrices.length || visiblePrices.some(match => !getCurrencyUnit(match[2])
    || parsePrice(match[1], match[2]) !== price)) return null;
  return price;
}
export async function verifyDigipayMerchantOffer(offer, fetchPage) {
  if (!needsMerchantPriceCheck(offer.url)) return offer;
  if (!productKey(offer.url)) return null;
  try {
    const response = await fetchPage(offer.url, {
      timeout: 5000, logStore: 'امیر استور', logOperation: 'verify-price', credentials: 'omit',
    });
    if (!response.ok) return null;
    const price = parseAmirStorePrice(await response.text(), offer.url, response.url || offer.url);
    return price === null ? null : {
      ...offer, price, source: 'digipay', priceVerified: true,
      priceSource: 'merchant-page', priceCheckedAt: Date.now(),
    };
  } catch { return null; }
}
