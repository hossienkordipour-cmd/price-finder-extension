import assert from "node:assert/strict";
import { getCurrencyUnit, parsePrice, toTomans } from "../price-utils.js";

assert.equal(toTomans("۱۲۳٬۴۵۰", "TOMAN"), 123450);
assert.equal(toTomans("1,234,500", "IRR"), 123450);
assert.equal(parsePrice("۹۹۰٬۰۰۰ ریال"), 99000);
assert.equal(parsePrice("۹۹٬۰۰۰ تومان"), 99000);
assert.equal(parsePrice(99000, "IRR"), 9900);
assert.equal(getCurrencyUnit("price: IRR"), "IRR");
assert.equal(getCurrencyUnit("بدون واحد"), null);
assert.equal(toTomans("نامشخص", "TOMAN"), 0);
console.log("price-utils tests passed");