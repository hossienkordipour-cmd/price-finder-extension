import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const { assessProductMatch, buildSearchQuery } = process.argv.includes('--baseline')
  ? await import('data:text/javascript;base64,' + Buffer.from(execFileSync('git', ['show', 'HEAD:filters.js'])).toString('base64'))
  : await import('../filters.js');
const source = 'سرخ کن بدون روغن ایکس ویژن مدل AF-6085';
for (const target of ['سرخ کن بدون روغن سیلور کرست', 'سرخ کن بدون روغن DSP مدل 2089',
  'سرخ کن بدون روغن ایکس ویژن مدل AF-6086']) {
  assert.equal(assessProductMatch(source, target, true).accepted, false, target);
}
assert.equal(assessProductMatch(source, 'سرخ کن X.Vision AF6085', true).accepted, true);
assert.equal(assessProductMatch(source, 'سرخ کن ایکس ویژن AF 6085', false).accepted, true);
assert.match(buildSearchQuery(source), /af6085/);
console.log('Air fryer brand and explicit model matching tests passed');
