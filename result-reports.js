import {normalizeReportUrl} from './missing-price.js';

const confirmedReasons = new Set([
  'invalid_link', 'invalid_price', 'model-mismatch', 'capacity-mismatch',
  'brand-mismatch', 'product-type-mismatch', 'accessory-instead-of-product',
  'accessory-type-mismatch', 'replica-mismatch',
]);

export function reportEvidence(trace) {
  return {
    sources: trace?.sources || [],
    hadRequestError: trace?.requests.some(row => !['success', 'empty', 'cancelled'].includes(row.status)) ?? false,
  };
}

export function buildResultReport({product, trace, count, failed, version, build, now = Date.now}) {
  const productUrl = normalizeReportUrl(product?.sourceUrl, product?.source);
  if (!productUrl || !trace?.id) return null;

  const {sources, hadRequestError} = trace.resultEvidence || reportEvidence(trace);
  const summary = sources.map(row => ({
    source: row.source,
    status: row.status,
    received: row.result_count,
    accepted: row.accepted_count,
    rejected: row.result_rejections || {},
  }));
  const confirmed = summary.some(row => Object.keys(row.rejected).some(reason => confirmedReasons.has(reason)));
  if (count > 0 && !confirmed) return null;

  const hadSourceError = hadRequestError || summary.some(row => row.status === 'failed' || row.status === 'parse_error');
  let type = 'unknown';
  if (count > 0) type = 'invalid_results';
  else if (failed || hadSourceError) type = 'source_failure';
  else if (summary.some(row => row.received > 0)) type = 'no_usable_results';
  else if (summary.length && summary.every(row => row.status === 'empty')) type = 'no_results';

  return {
    search_id: trace.id,
    product_url: productUrl,
    product_source: product.source,
    occurred_at: new Date(now()).toISOString(),
    extension_version: version,
    build_channel: build,
    cache: trace.cache,
    had_request_error: Boolean(hadSourceError || failed),
    type,
    result_count: count,
    sources: summary,
  };
}
