const API_LOG_STORAGE_KEY = "apiRequestLogs";
const MAX_API_LOGS = 300;
const SECRET_QUERY_KEYS = new Set([
  "token", "access_token", "api_key", "apikey", "key", "authorization",
]);

let storageQueue = Promise.resolve();

export function sanitizeApiUrl(value) {
  try {
    const url = new URL(String(value));
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_QUERY_KEYS.has(key.toLowerCase())) {
        url.searchParams.set(key, "[redacted]");
      }
    }
    return url.toString();
  } catch {
    return String(value || "");
  }
}

function persistLog(entry) {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;
  storageQueue = storageQueue
    .then(() => chrome.storage.local.get([API_LOG_STORAGE_KEY]))
    .then(data => {
      const logs = Array.isArray(data[API_LOG_STORAGE_KEY]) ? data[API_LOG_STORAGE_KEY] : [];
      logs.push(entry);
      return chrome.storage.local.set({
        [API_LOG_STORAGE_KEY]: logs.slice(-MAX_API_LOGS),
      });
    })
    .catch(error => console.warn("[PIQO API][logger] ذخیره لاگ ناموفق بود", error));
}

function writeLog(entry) {
  const level = entry.stage === "error" || entry.stage === "http-error" ? "warn" : "log";
  const details = [
    entry.method,
    entry.url,
    entry.status ? `HTTP ${entry.status}` : null,
    Number.isFinite(entry.durationMs) ? `${entry.durationMs}ms` : null,
    Number.isFinite(entry.resultCount) ? `${entry.resultCount} results` : null,
  ].filter(Boolean).join(" | ");

  console[level](`[PIQO API][${entry.store}][${entry.stage}] ${details}`, entry);
  persistLog(entry);
  return entry;
}

function createId() {
  return globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function beginApiRequest({ store, url, method = "GET", operation = "search" }) {
  const context = {
    requestId: createId(),
    store,
    url: sanitizeApiUrl(url),
    method: method.toUpperCase(),
    operation,
    startedAt: Date.now(),
  };
  writeLog({
    ...context,
    stage: "request",
    timestamp: new Date(context.startedAt).toISOString(),
  });
  return context;
}

export function completeApiRequest(context, response, extra = {}) {
  const finishedAt = Date.now();
  return writeLog({
    ...context,
    ...extra,
    stage: response?.ok ? "response" : "http-error",
    status: response?.status || 0,
    durationMs: finishedAt - context.startedAt,
    timestamp: new Date(finishedAt).toISOString(),
  });
}

export function failApiRequest(context, error, extra = {}) {
  const finishedAt = Date.now();
  return writeLog({
    ...context,
    ...extra,
    stage: "error",
    durationMs: finishedAt - context.startedAt,
    error: error?.message || String(error),
    timestamp: new Date(finishedAt).toISOString(),
  });
}

export function logApiResults(store, resultCount, extra = {}) {
  return writeLog({
    requestId: extra.requestId || createId(),
    store,
    operation: extra.operation || "search",
    stage: "results",
    method: extra.method || "GET",
    url: sanitizeApiUrl(extra.url || ""),
    resultCount,
    error: extra.error,
    timestamp: new Date().toISOString(),
  });
}

export function logApiCache(stage, cacheKey, resultCount = 0) {
  return writeLog({
    requestId: createId(),
    store: "کش PIQO",
    operation: "search-cache",
    stage,
    method: "CACHE",
    url: cacheKey,
    resultCount,
    timestamp: new Date().toISOString(),
  });
}

export async function readApiLogs() {
  const data = await chrome.storage.local.get([API_LOG_STORAGE_KEY]);
  return Array.isArray(data[API_LOG_STORAGE_KEY]) ? data[API_LOG_STORAGE_KEY] : [];
}

export function clearApiLogs() {
  return chrome.storage.local.remove(API_LOG_STORAGE_KEY);
}

export { API_LOG_STORAGE_KEY, MAX_API_LOGS };
