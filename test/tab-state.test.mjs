import assert from "node:assert/strict";
import { getTabStateKey, TabSearchRegistry } from "../tab-state.js";

const registry = new TabSearchRegistry();
const firstTabFirstRequest = registry.begin(10);
const secondTabFirstRequest = registry.begin(20);
const firstTabSecondRequest = registry.begin(10);

assert.equal(firstTabFirstRequest, 1);
assert.equal(secondTabFirstRequest, 1);
assert.equal(firstTabSecondRequest, 2);
assert.equal(registry.isCurrent(10, firstTabFirstRequest), false);
assert.equal(registry.isCurrent(10, firstTabSecondRequest), true);
assert.equal(registry.isCurrent(20, secondTabFirstRequest), true);
assert.equal(getTabStateKey(10), "tabState:10");

registry.clear(10);
assert.equal(registry.isCurrent(10, firstTabSecondRequest), false);

console.log("tab state tests passed");
