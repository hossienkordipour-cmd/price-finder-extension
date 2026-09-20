import assert from "node:assert/strict";
import {
  DEFAULT_SEARCH_CACHE_MAX_ENTRIES,
  DEFAULT_SEARCH_CACHE_TTL_MS,
  SearchResultCache,
} from "../search-cache.js";

function createStorage() {
  const values = {};
  return {
    async get(keys) {
      return Object.fromEntries(keys.map(key => [key, values[key]]));
    },
    async set(update) {
      Object.assign(values, update);
    },
    async remove(key) {
      delete values[key];
    },
  };
}

let currentTime = 1_000;
const cache = new SearchResultCache(createStorage(), {
  ttlMs: 100,
  maxEntries: 2,
  now: () => currentTime,
});

await cache.set("phone", [{ id: 1 }]);
assert.deepEqual((await cache.get("phone")).results, [{ id: 1 }]);

currentTime += 101;
assert.equal(await cache.get("phone"), null);

await cache.set("one", [1]);
currentTime += 1;
await cache.set("two", [2]);
currentTime += 1;
await cache.set("three", [3]);
assert.equal(await cache.get("one"), null);
assert.deepEqual((await cache.get("three")).results, [3]);

assert.equal(DEFAULT_SEARCH_CACHE_TTL_MS, 10 * 60 * 1000);
assert.equal(DEFAULT_SEARCH_CACHE_MAX_ENTRIES, 30);

console.log("search cache tests passed");
