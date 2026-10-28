import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as stateTools from '../tab-state.js';
import {createSearchTrace} from '../diagnostics.js';
const source=await readFile(new URL('../background.js',import.meta.url),'utf8');
const product={name:'private product',source:'manual'};
const storage={},events=[],wire=[],completed=[],pending=[];
const area={async get(keys){return Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(storage[k])]))},async set(v){Object.assign(storage,structuredClone(v));},async remove(){}};
const ctx=vm.createContext({console,Date,URL,setTimeout,clearTimeout,AbortController,...stateTools,createSearchTrace,normalizeProductText:v=>v,
 createDiagnostics:()=>({emit:e=>{wire.push(e);return Promise.resolve();},flush:async()=>{}}),
 createSurvey:()=>({complete:async id=>completed.push(id)}),SearchResultCache:class{},PIQO_API_BASE_URL:'https://api.piqoo.ir',PIQO_MONITORING_BASE_URL:'http://127.0.0.1:3000',chrome:{
 runtime:{getManifest:()=>({version:'1.1.0'}),onInstalled:{addListener(){}},onMessage:{addListener(){}},sendMessage:m=>{events.push(m);return Promise.resolve();}},action:{onClicked:{addListener(){}}},
 tabs:{onRemoved:{addListener(){}},onUpdated:{addListener(){}},onActivated:{addListener(){}}},storage:{local:area}}});
vm.runInContext(source.replace(/import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];?/g,''),ctx);
ctx.pending=pending;ctx.product=product;
vm.runInContext('searchPrices=(product,options)=>new Promise(resolve=>pending.push({options,resolve}))',ctx);
await vm.runInContext('startTabSearch(1,product)',ctx);
assert.ok(pending[0].options.trace,'Real search receives its trace');
const id=storage['tabState:1'].searchId;assert.ok(id);
pending[0].options.onProgress([{name:'result'}]);await new Promise(r=>setImmediate(r));
await vm.runInContext("(async()=>persistTabState(1,{...(await chrome.storage.local.get(['tabState:1']))['tabState:1'],firstPresented:true}))()",ctx);
pending[0].resolve([{name:'result'}]);await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
assert.equal(storage['tabState:1'].searchId,id,'Final write preserves identity');
assert.equal(storage['tabState:1'].firstPresented,true,'Final results cannot reset the first-paint acknowledgement');
assert.equal(wire.filter(e=>e.event_name==='search_finished').length,1);
assert.deepEqual(completed,[id]);
assert.equal(events.at(-1).searchId,id);
await vm.runInContext('startTabSearch(2,product)',ctx);
await vm.runInContext("invalidateTabPage(2,'https://example.com/next',true)",ctx);
assert.equal(wire.at(-1).status,'cancelled');
pending[1].resolve([]);await new Promise(r=>setImmediate(r));
assert.equal(wire.filter(e=>e.search_id===pending[1].options.trace.id&&e.event_name==='search_finished').length,1,'Late completion cannot finish cancelled search twice');
assert.equal(completed.length,1,'Cancelled searches do not qualify for survey');
// Exercise the actual cache/shared-request coordinator, without calling stores.
const part=source.slice(source.indexOf('async function searchPrices('),source.indexOf('\nasync function searchMasterKala('));
let resolveNetwork,calls=0;
const sharedCtx=vm.createContext({console,Promise,Map,normalizeProductText:v=>v,buildSearchQuery:v=>v,logApiCache(){},
 searchCache:{get:async()=>null,set:async()=>{}},inFlightSearches:new Map(),searchPricesFromStores:()=>{calls++;return new Promise(r=>resolveNetwork=r);}});
vm.runInContext(part,sharedCtx);sharedCtx.a=createSearchTrace(null);sharedCtx.b=createSearchTrace(null);
const first=vm.runInContext("searchPrices({name:'same'}, {trace:a})",sharedCtx);await new Promise(r=>setImmediate(r));
const second=vm.runInContext("searchPrices({name:'same'}, {trace:b})",sharedCtx);await new Promise(r=>setImmediate(r));
resolveNetwork([]);await Promise.all([first,second]);
assert.equal(calls,1);assert.equal(sharedCtx.b.networkId,sharedCtx.a.id);
console.log('Background integration: trace propagation, final identity, one completion, cancellation, survey count and shared network request passed');
