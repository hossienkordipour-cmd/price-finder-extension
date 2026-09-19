import assert from "node:assert/strict";
import {
  assessProductMatch,
  buildSearchQuery,
  normalizeProductText,
} from "../filters.js";

assert.equal(normalizeProductText("سامسونگ S24 اولترا ۲۵۶ گیگابایت"), "samsung s24 ultra 256gb");

const exactModel = assessProductMatch(
  "گوشی سامسونگ Galaxy S24 Ultra ظرفیت 256 گیگابایت",
  "Samsung Galaxy S24 Ultra 256GB دو سیم کارت"
);
assert.equal(exactModel.accepted, true);
assert.equal(exactModel.confidence, "high");

const wrongCapacity = assessProductMatch(
  "Apple iPhone 15 Pro Max 256GB",
  "گوشی اپل iPhone 15 Pro Max 128 گیگ"
);
assert.equal(wrongCapacity.accepted, false);
assert.ok(wrongCapacity.reasons.includes("capacity-mismatch"));

const wrongModel = assessProductMatch(
  "گوشی Samsung Galaxy A55 256GB",
  "Samsung Galaxy A35 256GB"
);
assert.equal(wrongModel.accepted, false);
assert.ok(wrongModel.reasons.includes("model-mismatch"));

const wrongNumericModel = assessProductMatch(
  "Apple iPhone 15 Pro Max 256GB",
  "Apple iPhone 14 Pro Max 256GB"
);
assert.equal(wrongNumericModel.accepted, false);
assert.ok(wrongNumericModel.reasons.includes("number-mismatch"));

const missingVariant = assessProductMatch(
  "Apple iPhone 15 Pro 256GB",
  "Apple iPhone 15 256GB"
);
assert.equal(missingVariant.accepted, false);
assert.ok(missingVariant.reasons.includes("variant-mismatch"));

const extraVariant = assessProductMatch(
  "Apple iPhone 15 256GB",
  "Apple iPhone 15 Pro 256GB"
);
assert.equal(extraVariant.accepted, false);
assert.ok(extraVariant.reasons.includes("variant-mismatch"));

const accessory = assessProductMatch(
  "گوشی Samsung Galaxy S24 Ultra 256GB",
  "قاب محافظ Samsung Galaxy S24 Ultra"
);
assert.equal(accessory.accepted, false);
assert.ok(accessory.reasons.includes("accessory-instead-of-product"));

const query = buildSearchQuery("خرید گوشی سامسونگ Galaxy S24 Ultra ظرفیت ۲۵۶ گیگابایت رنگ مشکی");
assert.match(query, /s24/);
assert.match(query, /256gb/);
assert.match(query, /ultra/);

console.log("product matching tests passed");
