import { sourceForUrl, uuid, ERROR_CODES } from './diagnostics.js';

function requestContext(value) {
  try {
    const url = new URL(value), local = ['127.0.0.1','localhost','[::1]'].includes(url.hostname);
    const owned = local || url.hostname === 'api.piqoo.ir';
    return { target_environment: local ? 'local' : owned ? 'production' : 'external',
      operation: owned && url.pathname === '/v1/search' ? 'piqo_search'
        : owned && url.pathname === '/v1/divar/search' ? 'divar_search'
        : url.hostname === 'api.digikala.com' && /^\/v2\/product\/\d+\/$/.test(url.pathname) ? 'verify_offer' : 'store_search' };
  } catch { return { target_environment: 'unknown', operation: 'unknown' }; }
}

// Read only a tiny, time-bounded clone of an owned API's JSON error.
// No raw message/body/URL is retained; the caller's response remains consumable.
async function knownErrorCode(response, context) {
  if (!['local','production'].includes(context.target_environment) || !/application\/json/i.test(response.headers?.get('content-type') || '')) return null;
  let reader, timer;
  try {
    reader = response.clone().body?.getReader();
    if (!reader) return null;
    return await Promise.race([
      (async () => {
        const chunks = []; let length = 0;
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          length += part.value.byteLength;
          if (length > 4096) return null;
          chunks.push(part.value);
        }
        const bytes = new Uint8Array(length); let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
        const code = JSON.parse(new TextDecoder().decode(bytes))?.error?.code;
        return ERROR_CODES.includes(code) ? code : null;
      })(),
      new Promise(resolve => { timer = setTimeout(() => resolve(null),150); }),
    ]);
  } catch { return null; }
  finally { clearTimeout(timer); void reader?.cancel().catch(() => {}); }
}

// Only known response envelopes are checked. Unknown HTML layouts are never
// reported as a verified zero: their parsed count is tracked at the source layer.
export function inspectPayload(source, url, data) {
  const path = new URL(url).pathname;
  let list;
  if (source === 'affilio' || source === 'divar') list = data?.results;
  else if (source === 'digikala') {
    if (path.includes('/product/')) return { valid: Boolean(data?.data?.product), count: null };
    list = data?.data?.products;
  } else if (source === 'torob') list = data?.results;
  else if (source === 'khanoumi') list = data?.data?.products?.items;
  else if (source === 'gooshishop') list = data?.result?.Products;
  else if (source === 'basalam') list = data?.products ?? data?.data?.items ?? data?.items ?? data?.results;
  else if (source === 'masterkala') list = data?.products;
  else if (source === 'sheypoor') list = Array.isArray(data?.data) ? data.data : data?.data?.items;
  else if (source === 'kalaoma') list = data;
  else return { valid: data !== null && typeof data === 'object', count: null };
  return { valid: Array.isArray(list), count: Array.isArray(list) ? list.length : null };
}

export function diagnosticFetch(fetcher, trace) {
  if (!trace) return fetcher;
  return async (url, options = {}) => {
    const started = Date.now(), source = sourceForUrl(url), source_request_id = uuid();
    const context = requestContext(url);
    let done = false, response;
    const finish = (status, count = null, cache = 'network', errorCode = null) => {
      if (done) return;
      done = true;
      trace.request({ source, source_request_id, status, duration_ms: Date.now() - started,
        http_status: response?.status ?? null, result_count: count, cache, ...context,
        ...(errorCode ? { error_code: errorCode } : {}) });
    };
    try {
      response = await fetcher(url, options);
      if (!response.ok) { finish('http_error',null,'network',await knownErrorCode(response,context) || 'HTTP_ERROR'); return response; }
      return new Proxy(response, { get(target, key) {
        if (key === 'json' || key === 'text') return async () => {
          try {
            const data = await target[key]();
            let checked = key === 'json' ? inspectPayload(source, url, data) : { valid: typeof data === 'string' && data.length > 0, count: null };
            if (key === 'text' && source === 'technolife') {
              const match = data.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
              const body = match ? JSON.parse(match[1]) : null;
              const list = body?.props?.pageProps?.dehydratedState?.queries?.find(q => q.queryKey?.[0] === 'search')?.state?.data?.pages?.[0]?.results;
              checked = { valid: Array.isArray(list), count: Array.isArray(list) ? list.length : null };
            }
            if (!checked.valid) { finish('parse_error',null,'network','PARSE_ERROR'); throw new SyntaxError('Invalid source envelope'); }
            const cache = key === 'json' && ['hit', 'stale', 'fresh'].includes(data?.meta?.cache) ? 'server' : 'network';
            finish(checked.count === 0 ? 'empty' : 'success', checked.count, cache);
            return data;
          } catch (error) { finish(error?.name === 'AbortError' ? 'timeout' : 'parse_error',null,'network',error?.name === 'AbortError' ? 'TIMEOUT' : 'PARSE_ERROR'); throw error; }
        };
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      } });
    } catch (error) {
      const status = error?.name === 'TimeoutError' || error?.name === 'AbortError' ? (options.signal?.aborted ? 'cancelled' : 'timeout') : 'network_error';
      finish(status,null,'network',status === 'cancelled' ? 'CANCELLED' : status === 'timeout' ? 'TIMEOUT' : 'NETWORK_ERROR');
      throw error;
    }
  };
}
