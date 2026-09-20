import assert from "node:assert/strict";
import { MAX_API_LOGS, sanitizeApiUrl } from "../api-logger.js";

assert.equal(MAX_API_LOGS, 300);
assert.equal(
  sanitizeApiUrl("https://example.com/search?q=phone&token=secret"),
  "https://example.com/search?q=phone&token=%5Bredacted%5D"
);
assert.equal(
  sanitizeApiUrl("https://example.com/?API_KEY=secret&safe=yes"),
  "https://example.com/?API_KEY=%5Bredacted%5D&safe=yes"
);
assert.equal(sanitizeApiUrl("not-a-url"), "not-a-url");

console.log("api logger tests passed");
