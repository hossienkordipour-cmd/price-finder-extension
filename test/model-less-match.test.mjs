import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
let code = await readFile(new URL('../filters.js', import.meta.url), 'utf8');
if (process.argv.includes('--without-fix')) code = code.replace('const conceptMatch = assessConceptMatch(source, target);', 'const conceptMatch = null;');
const { assessProductMatch, buildSearchQuery } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const base = 'کیسه فریزر رولی پرفراژ ۱۵۰ عددی لندی';
for (const used of [true,false]) {
  const bad = assessProductMatch(base,'کود گوسفندی کیسه ایی ۱۵۰',used);
  assert.equal(bad.accepted,false,'Screenshot: fertilizer is not a freezer bag');
  assert.ok(bad.reasons.includes('product-type-mismatch'));
  assert.equal(assessProductMatch(base,'کیسه فریزر رولی لندی ۱۵۰ عددی',used).accepted,true);
  assert.equal(assessProductMatch(base,'کیسه فریزر لندی ۱۵۰ عددی بسته ۳ تایی',used).accepted,false,'Do not compare one pack with three');
  assert.equal(assessProductMatch(base,'کیسه فریزر رولی لندی ۱۰۰ عددی رول ۱۵۰ متری',used).accepted,false,'Shared number cannot hide quantity conflict');
  assert.equal(assessProductMatch(base,'کیسه زباله رولی لندی ۱۵۰ عددی',used).accepted,false);
  assert.equal(assessProductMatch(base,'کیسه فریزر گلرنگ ۱۵۰ عددی',used).accepted,false);
  assert.equal(assessProductMatch(base,'کیسه فریزر ۱۵۰ عددی',used).accepted,true,'Short but clear category should survive');
  assert.notEqual(assessProductMatch(base,'کیسه فریزر ۱۵۰ عددی',used).confidence,'high');
  assert.equal(assessProductMatch(base,'کیسه رولی لندی ۱۵۰ عددی',used).accepted,false,'Generic bag title has insufficient type evidence');
  assert.equal(assessProductMatch('مایع ظرفشویی گلرنگ ۱ لیتر','مایع ظرفشویی گلرنگ ۱۰۰۰ میلی لیتر',used).accepted,true);
  assert.equal(assessProductMatch('مایع ظرفشویی گلرنگ ۱ لیتر','مایع دستشویی گلرنگ ۱ لیتر',used).accepted,false);
  assert.equal(assessProductMatch('رول فیلم استرچ محافظ غذایی ۵۰ متری آیری پلاست','سلفون محافظ غذایی آیری پلاست ۱۰۰ متری',used).accepted,false);
  assert.equal(assessProductMatch('رول فیلم استرچ محافظ غذایی ۵۰ متری آیری پلاست','سلفون محافظ غذایی آیری پلاست ۵۰ متری',used).accepted,true);
  assert.equal(assessProductMatch('سلفون آیری پلاست ۵۰ متری','محافظ غذایی آیری پلاست ۵۰ متری',used).accepted,true);
  assert.equal(assessProductMatch('مایع ظرفشویی گلرنگ 500ml','مایع دستشویی گلرنگ 500ml',used).accepted,false,'Measurement is not a model identifier');
  assert.equal(assessProductMatch('مایع ظرفشویی گلرنگ 500ml','مایع ظرفشویی گلرنگ 0.5 لیتر',used).accepted,true);
}
assert.match(buildSearchQuery(base),/^کیسه فریزر/,'Query should lead with product concept, not an isolated count');
console.log('Model-less compound types, quantities, units, brands and query tests passed');
