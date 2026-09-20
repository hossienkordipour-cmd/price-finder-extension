export const SEARCH_CACHE_STORAGE_KEY = "searchResultCacheV2";
export const DEFAULT_SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
export const DEFAULT_SEARCH_CACHE_MAX_ENTRIES = 30;

export class SearchResultCache {
  constructor(storage, options = {}) {
    this.storage = storage;
    this.ttlMs = options.ttlMs ?? DEFAULT_SEARCH_CACHE_TTL_MS;
    this.maxEntries = options.maxEntries ?? DEFAULT_SEARCH_CACHE_MAX_ENTRIES;
    this.now = options.now ?? (() => Date.now());
    this.writeQueue = Promise.resolve();
  }

  async get(key) {
    await this.writeQueue;
    const data = await this.storage.get([SEARCH_CACHE_STORAGE_KEY]);
    const cache = data[SEARCH_CACHE_STORAGE_KEY] || {};
    const entry = cache[key];
    if (!entry || this.now() - entry.cachedAt > this.ttlMs) return null;
    return entry;
  }

  set(key, results) {
    this.writeQueue = this.writeQueue.then(async () => {
      const data = await this.storage.get([SEARCH_CACHE_STORAGE_KEY]);
      const cache = data[SEARCH_CACHE_STORAGE_KEY] || {};
      const cachedAt = this.now();
      cache[key] = { cachedAt, results };

      const entries = Object.entries(cache)
        .sort(([, first], [, second]) => second.cachedAt - first.cachedAt)
        .slice(0, this.maxEntries);

      await this.storage.set({
        [SEARCH_CACHE_STORAGE_KEY]: Object.fromEntries(entries),
      });
    });
    return this.writeQueue;
  }

  clear() {
    this.writeQueue = this.writeQueue.then(() => this.storage.remove(SEARCH_CACHE_STORAGE_KEY));
    return this.writeQueue;
  }
}
