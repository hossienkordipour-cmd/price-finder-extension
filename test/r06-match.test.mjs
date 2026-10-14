import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
let source = await readFile(new URL('../filters.js', import.meta.url), 'utf8');
if (process.argv.includes('--without-fix')) source = source.replace('conflictingCapacities(source.capacities, target.capacities)', 'conflictingExplicitSets(source.capacities, target.capacities)').replace('conflictingIdentifiers(source.identifiers, target.identifiers)', 'conflictingExplicitSets(source.identifiers, target.identifiers)');
const { assessProductMatch } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
for (const used of [false,true]) {
  assert.equal(assessProductMatch('Samsung A55 RAM 8GB 256GB','Samsung A55 RAM 8GB 128GB',used).accepted,false,'Shared RAM must not hide storage conflict');
  assert.equal(assessProductMatch('Anker R50i A3949','Anker R50i A3959',used).accepted,false,'Shared model token must not hide conflicting second code');
  assert.equal(assessProductMatch('Anker R50i A3949','Anker R50i',used).accepted,true,'Abbreviated model is not an explicit conflicting code');
  assert.equal(assessProductMatch('Samsung A55 256GB','Samsung A55 RAM 8GB 256GB',used).accepted,true,'Additional RAM detail must not reject matching storage');
  assert.equal(assessProductMatch('Philips NA230/00','Philips NA230/10',used).accepted,false);
}
console.log('R06 explicit capacity and secondary model conflicts passed');
