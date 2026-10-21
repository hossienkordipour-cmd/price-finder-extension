import {cp,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {tutorialFiles} from './tutorial-files.mjs';
const output=fileURLToPath(new URL('../dist/tutorial/',import.meta.url));
for(const [name,source]of tutorialFiles){
  const target=path.join(output,name);await mkdir(path.dirname(target),{recursive:true});await cp(source,target);
}
console.log(`Standalone tutorial built: ${output}`);
