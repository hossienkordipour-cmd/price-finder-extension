import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const { assessProductMatch, buildSearchQuery } = process.argv.includes('--baseline')
  ? await import('data:text/javascript;base64,' + Buffer.from(execFileSync('git', ['show', 'HEAD:filters.js'])).toString('base64'))
  : await import('../filters.js');
const mouse = 'ماوس بی سیم مدل ASUS MW.100';
// Representative complete bundle title: screenshot's full title is truncated.
const bundle = 'لپ تاپ گیمینگ ASUS سری TUF همراه با موس بی سیم';
assert.equal(assessProductMatch(mouse, bundle, true).accepted, false, 'A laptop bundled with a mouse is not a mouse offer');
assert.equal(assessProductMatch(mouse, 'ماوس بی سیم ASUS MW100', true).accepted, true);
assert.equal(assessProductMatch(mouse, 'ماوس بی سیم ASUS MW200', true).accepted, false);
assert.match(buildSearchQuery(mouse), /mw100/);
console.log('Mouse model and laptop bundle matching tests passed');
