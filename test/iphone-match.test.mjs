import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const { assessProductMatch, normalizeProductText } = process.argv.includes('--baseline')
  ? await import('data:text/javascript;base64,' + Buffer.from(execFileSync('git', ['show', 'HEAD:filters.js'])).toString('base64'))
  : await import('../filters.js');
const source = 'آیفون ۱۵ پرومکس';
assert.equal(normalizeProductText(source), 'iphone 15 pro max');
for (const name of ['باتری آیفون ۱۵ پرومکس iPhone 15 Pro Max', 'Iphone 15 pro max / کینگ کپی ۱۵',
  'گوشی آیفون ۱۵ پرو', 'گوشی آیفون ۱۵', 'باتری iphone 15 promax', 'Replica iPhone 15 Pro Max']) {
  assert.equal(assessProductMatch(source, name, true).accepted, false, name);
}
assert.equal(assessProductMatch(source, 'Apple iPhone 15 Pro Max', true).accepted, true);
assert.equal(assessProductMatch(source, 'آیفون ۱۵ پرومکس سلامت باتری ۸۵', true).accepted, true);
assert.equal(assessProductMatch('باتری iPhone 15 Pro Max', 'باتری iPhone 15 Pro Max اصل').accepted, true);
console.log('iPhone variants, batteries and replica matching tests passed');
