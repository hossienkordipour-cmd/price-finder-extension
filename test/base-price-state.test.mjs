import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {TabSearchRegistry,getTabStateKey,getPageKey} from '../tab-state.js';

const baseline=process.argv.includes('--baseline');
const source=baseline ? execFileSync('git',['show','HEAD:background.js'],{encoding:'utf8'}) : await readFile(new URL('../background.js',import.meta.url),'utf8');
const storage={};
const context=vm.createContext({console,Date,setTimeout,clearTimeout,AbortController,TabSearchRegistry,getTabStateKey,getPageKey,normalizeProductText:value=>value,SearchResultCache:class{},chrome:{
  runtime:{onInstalled:{addListener(){}},onMessage:{addListener(){}},sendMessage(){return Promise.resolve();}},
  action:{onClicked:{addListener(){}}},tabs:{onRemoved:{addListener(){}},onUpdated:{addListener(){}},onActivated:{addListener(){}}},
  storage:{local:{async get(keys){return Object.fromEntries(keys.map(key=>[key,storage[key]]));},async set(value){Object.assign(storage,value);}}},
}});
vm.runInContext(source.replace(/import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];?/g,''),context);
vm.runInContext('searchPrices = () => new Promise(resolve => {globalThis.resolveSearch=resolve;})',context);
const product={name:'Anker R50i A3949',source:'digikala',sourceUrl:'https://www.digikala.com/product/dkp-11801878/',price:null};
context.product=product;
await vm.runInContext('registerDetectedProduct(1,product)',context);
vm.runInContext('startTabSearch(1,product)',context);
await new Promise(resolve=>setImmediate(resolve));
context.updated={...product,price:3_003_100};
await vm.runInContext('registerDetectedProduct(1,updated)',context);
context.resolveSearch([]);
await new Promise(resolve=>setImmediate(resolve));
await new Promise(resolve=>setImmediate(resolve));
assert.equal(storage[getTabStateKey(1)].currentProduct.price,3_003_100,'an in-flight search must not overwrite newer selected price');
console.log('PASS: latest base price survives search completion');
