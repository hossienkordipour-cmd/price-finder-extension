import assert from "node:assert/strict";
import { parsePiqoApiResponse } from "../piqo-api-client.js";

const results = parsePiqoApiResponse({
  results: [
    {
      name: "گوشی سامسونگ A55",
      store: "فروشگاه نمونه",
      price: 18_000_000,
      originalPrice: 20_000_000,
      discount: 10,
      currency: "IRT",
      image: "https://cdn.example/product.jpg",
      url: "https://aflo.ir/tracked-product",
      sourceUrl: "https://shop.example/product",
      source: "affilio",
      isAffiliate: true,
      availability: true,
      condition: "new",
      code: "SKU-1",
    },
    {
      name: "ناموجود",
      store: "فروشگاه نمونه",
      price: 100,
      url: "https://aflo.ir/unavailable",
      availability: false,
    },
  ],
});

assert.equal(results.length, 1);
assert.equal(results[0].price, 18_000_000, "Affilio prices must remain in toman");
assert.equal(results[0].url, "https://aflo.ir/tracked-product");
assert.equal(results[0].isAffiliate, true);
assert.equal(results[0].source, "affilio");
assert.equal(results[0].productCode, "SKU-1");

assert.deepEqual(parsePiqoApiResponse(null), []);
assert.deepEqual(parsePiqoApiResponse({ results: "invalid" }), []);

console.log("PIQO API client tests passed");
