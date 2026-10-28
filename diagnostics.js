// This wire format is an allowlist. Never forward the local API logger.
export const DIAGNOSTICS_KEY = 'piqoDiagnosticsV1';
export const MAX_EVENTS = 400;
export const MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const uuid = () => globalThis.crypto.randomUUID();
const names = new Set(['search_started', 'search_finished', 'request_finished', 'source_finished', 'results_presented', 'search_linked']);
const statuses = new Set(['success', 'empty', 'timeout', 'http_error', 'parse_error', 'network_error', 'cancelled', 'partial_failure', 'failed', 'completed']);
export const SOURCES = ['affilio', 'technolife', 'khanoumi', 'gooshishop', 'digikala', 'torob', 'emalls', 'basalam', 'divar', 'sheypoor', 'masterkala', 'digipay', 'kalaoma', 'unknown'];
export const ERROR_CODES = ['HTTP_ERROR','NETWORK_ERROR','TIMEOUT','PARSE_ERROR','CANCELLED','AFFILIO_NOT_CONFIGURED','AFFILIO_TIMEOUT','AFFILIO_UPSTREAM_ERROR','AFFILIO_INVALID_RESPONSE','DIVAR_NOT_CONFIGURED','DIVAR_TIMEOUT','DIVAR_UPSTREAM_ERROR','INVALID_UPSTREAM_RESPONSE','UPSTREAM_RATE_LIMITED','UPSTREAM_ERROR','DIVAR_MCP_TIMEOUT','DIVAR_MCP_UNAVAILABLE'];
export function sourceForUrl(value) {
  try {
    const host = new URL(value).hostname;
    if (host === 'api.piqoo.ir' || host === '127.0.0.1' || host === 'localhost') return new URL(value).pathname.includes('/divar/') ? 'divar' : 'affilio';
    return SOURCES.find(s => host === `${s}.com` || host.endsWith(`.${s}.com`) || host === `${s}.ir` || host.endsWith(`.${s}.ir`) || (s === 'digipay' && host.endsWith('mydigipay.com'))) || 'unknown';
  } catch { return 'unknown'; }
}
export function safeEvent(input, version, now = Date.now()) {
  if (!names.has(input.event_name)) return null;
  const event = { schema_version: 1, event_id: uuid(), event_name: input.event_name,
    occurred_at: new Date(now).toISOString(), extension_version: version };
  for (const key of ['search_id', 'source_request_id', 'network_search_id', 'session_id']) if (/^[\da-f-]{36}$/i.test(input[key] || '')) event[key] = input[key];
  if (input.event_name === 'search_started' && ['phone','laptop','computer_accessories','audio','tv','home_appliances','kitchen','clothing','shoes','vehicle_accessories','sports','tools','unknown'].includes(input.category)) {
    event.category=input.category;
    event.category_method=['title_rules','unknown'].includes(input.category_method)?input.category_method:'unknown';
    event.category_version=1;
    event.category_confidence=Number.isFinite(input.category_confidence)?Math.max(0,Math.min(1,input.category_confidence)):0;
  }
  if (SOURCES.includes(input.source)) event.source = input.source;
  if (statuses.has(input.status)) event.status = input.status;
  if (['network', 'client', 'shared', 'server', 'unknown'].includes(input.cache)) event.cache = input.cache;
  if (ERROR_CODES.includes(input.error_code)) event.error_code = input.error_code;
  if (['dev','release','unknown'].includes(input.build_channel)) event.build_channel = input.build_channel;
  if (['local','production','external','unknown'].includes(input.target_environment)) event.target_environment = input.target_environment;
  if (['piqo_search','divar_search','verify_offer','store_search','unknown'].includes(input.operation)) event.operation = input.operation;
  for (const key of ['duration_ms', 'result_count', 'accepted_count', 'displayed_count', 'http_status', 'first_result_ms']) {
    if (key in input) event[key] = Number.isFinite(input[key]) && input[key] >= 0 ? Math.round(input[key]) : null;
  }
  return event;
}
export function createDiagnostics({ storage, version, endpoint, buildChannel = 'unknown', fetcher = fetch, now = Date.now }) {
  let serial = Promise.resolve(), flushing = null;
  const locked = task => { const p = serial.catch(() => {}).then(task); serial = p; return p; };
  const fresh = rows => (Array.isArray(rows) ? rows : []).filter(r => now() - Date.parse(r.event.occurred_at) < MAX_AGE_MS && r.attempts < 5).slice(-MAX_EVENTS);
  async function emit(input) {
    try {
      const event = safeEvent({ ...input, build_channel: buildChannel }, version, now());
      if (!event) return;
      await locked(async () => {
        const rows = fresh((await storage.get(DIAGNOSTICS_KEY))[DIAGNOSTICS_KEY]);
        rows.push({ event, attempts: 0, next: 0 });
        await storage.set({ [DIAGNOSTICS_KEY]: rows.slice(-MAX_EVENTS) });
      });
    } catch { /* Diagnostics must never interrupt search. */ }
  }
  function flush() {
    if (flushing) return flushing;
    flushing = (async () => {
      let batch = [];
      await locked(async () => {
        const rows = fresh((await storage.get(DIAGNOSTICS_KEY))[DIAGNOSTICS_KEY]);
        batch = rows.filter(r => r.next <= now()).slice(0, 40);
        // Persist the attempt before the network call, including worker termination.
        for (const row of batch) { row.attempts++; row.next = now() + Math.min(3600000, 15000 * 2 ** row.attempts); }
        await storage.set({ [DIAGNOSTICS_KEY]: rows });
      });
      if (!batch.length) return;
      let accepted = [];
      try {
        const response = await fetcher(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: batch.map(r => r.event) }), signal: AbortSignal.timeout(8000), credentials: 'omit' });
        if (response.ok) {
          const body = await response.json();
          accepted = Array.isArray(body.accepted_ids) ? body.accepted_ids : [];
        }
      } catch { /* Backoff already persisted. */ }
      const sent = new Set(batch.map(r => r.event.event_id));
      const ack = new Set(accepted.filter(id => sent.has(id)));
      await locked(async () => {
        const rows = fresh((await storage.get(DIAGNOSTICS_KEY))[DIAGNOSTICS_KEY]).filter(r => !ack.has(r.event.event_id));
        await storage.set({ [DIAGNOSTICS_KEY]: rows });
      });
    })().catch(() => {}).finally(() => { flushing = null; });
    return flushing;
  }
  return { emit, flush };
}

export function createSearchTrace(diagnostics, searchId = uuid(), clock = Date.now, metadata = {}) {
  const started = clock(), requests = [], sources = [], events = [];
  const trace = { id: searchId, cache: 'network', networkId: searchId,
    emit(event) { const value = { search_id: trace.id, ...event }; events.push(value); void diagnostics?.emit(value); },
    request(event) { requests.push(event); trace.emit({ event_name: 'request_finished', ...event }); },
    source(event) { sources.push(event); trace.emit({ event_name: 'source_finished', ...event }); },
    link(other) { trace.cache = 'shared'; trace.networkId = other.id; trace.emit({ event_name: 'search_linked', network_search_id: other.id, cache: 'shared' }); },
    finish(count, cancelled = false, failed = false) {
      const errors = requests.filter(r => !['success', 'empty'].includes(r.status)).length + sources.filter(s => ['parse_error', 'failed'].includes(s.status)).length;
      const successes = requests.some(r => ['success', 'empty'].includes(r.status));
      const status = cancelled ? 'cancelled' : failed ? 'failed' : errors ? (successes ? 'partial_failure' : 'failed') : 'completed';
      trace.emit({ event_name: 'search_finished', status, cache: trace.cache, network_search_id: trace.networkId,
        duration_ms: clock() - started, result_count: count, first_result_ms: null });
      return status;
    }, started, requests, sources, events };
  trace.emit({ event_name: 'search_started', cache: 'unknown', ...metadata });
  return trace;
}
