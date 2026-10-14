import { parsePrice } from './price-utils.js';

export function getDigikalaProductId(offer) {
  for (const value of [offer?.url, offer?.sourceUrl]) {
    try {
      let url = new URL(value);
      if (url.hostname === 'publisher.affilio.ir' && url.searchParams.get('p')) url = new URL(url.searchParams.get('p'));
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) continue;
      if (!/^(www\.)?digikala\.com$/.test(url.hostname)) continue;
      const id = url.pathname.match(/^\/product\/dkp-(\d+)(?:\/|$)/)?.[1];
      if (id && Number.isSafeInteger(Number(id)) && Number(id) > 0) return id;
    } catch { /* Unknown destination is not evidence of a Digikala product. */ }
  }
  return null;
}

export function createDigikalaOfferVerifier(fetchPage) {
  const requests = new Map();
  let active = 0;
  const waiting = [];
  const schedule = async task => {
    if (active >= 4) await new Promise(resolve => waiting.push(resolve));
    else active++;
    try { return await task(); }
    finally { const next = waiting.shift(); if (next) next(); else active--; }
  };
  return async (offer, inputSource) => {
    const id = getDigikalaProductId(offer);
    if (!id) return offer;
    if (offer.priceVerified && offer.priceSource === 'digikala-product-api' && offer.variantId) {
      if (!requests.has(id)) requests.set(id, Promise.resolve(offer));
      return offer;
    }
    if (!requests.has(id)) requests.set(id, schedule(async () => {
      try {
        const response = await fetchPage(`https://api.digikala.com/v2/product/${id}/`, {
          timeout: 5000, logStore: 'دیجی‌کالا', logOperation: 'verify-offer', credentials: 'omit',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return null;
        return parseDigikalaVerifiedOffer(await response.json(), {}, id);
      } catch { return null; }
    }));
    const verified = await requests.get(id);
    // Preserve the pre-existing result on verification failure; no new deletion policy.
    if (!verified) return { ...offer, priceVerification: 'unavailable' };
    return {
      ...offer, name: verified.name || offer.name, price: verified.price,
      originalPrice: verified.originalPrice, discount: verified.discount,
      variantId: verified.variantId, sellerName: verified.sellerName, offerColor: verified.offerColor,
      offerWarranty: verified.offerWarranty, priceSource: verified.priceSource,
      priceVerified: true, priceCheckedAt: verified.priceCheckedAt, suppressSavings: true,
      priceInputSource: offer.priceInputSource || inputSource || offer.source || 'unknown',
      store: 'دیجی‌کالا', sourceUrl: `https://www.digikala.com/product/dkp-${id}/`,
      originalAffiliateUrl: offer.originalAffiliateUrl || (offer.source === 'affilio' && offer.isAffiliate && !offer.isMerged ? offer.url : undefined),
    };
  };
}

export function parseDigikalaVerifiedOffer(payload, candidate, productId) {
  const product = payload?.data?.product;
  const variant = product?.default_variant;
  if (!product || Number(product.id) !== Number(productId) || product.status !== 'marketable'
    || !variant?.id || variant.status !== 'marketable' || variant.price?.is_locked_for_digiplus
    || variant.price?.is_plus_early_access || variant.price?.marketable_stock === 0) return null;
  const rawPrice = Number(variant.price?.selling_price);
  if (!Number.isSafeInteger(rawPrice) || rawPrice <= 0) return null;
  const price = parsePrice(rawPrice, 'IRR');
  const originalPrice = Math.max(price, parsePrice(variant.price?.rrp_price || rawPrice, 'IRR'));
  return {
    ...candidate, name: product.title_fa || candidate.name,
    price, originalPrice, discount: Math.max(0, Math.round((originalPrice - price) / originalPrice * 100)),
    availability: true, variantId: variant.id,
    sellerName: variant.seller?.title || null, offerColor: variant.color?.title || null,
    offerWarranty: variant.warranty?.title_fa || null,
    priceSource: 'digikala-product-api', priceVerified: true, priceCheckedAt: Date.now(),
    // Product-page URLs do not guarantee selecting this seller in every session.
    suppressSavings: true,
  };
}
