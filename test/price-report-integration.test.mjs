import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {TabSearchRegistry,getTabStateKey,getPageKey} from '../tab-state.js';
import {classifyPriceObservation} from '../price-observations.js';
import {normalizeReportUrl} from '../missing-price.js';

test('actual background handler rejects closed/stale/untrusted observations and queues the controlled contract',async()=>{
 const listeners=[],queued=[],store={};
 let probe={open:true,opening:'open-1',page_url:'https://khanoumi.com/item/1',eligible:true,evidence:'visible_primary_price',
  product:{name:'Test product',source:'khanoumi',sourceUrl:'https://khanoumi.com/item/1?token=secret',price:null}};
 const runtime={getURL:path=>'chrome-extension://qa/'+path,getManifest:()=>({version:'1.1.0',version_name:'1.1.0-dev'}),
  onInstalled:{addListener(){}},onMessage:{addListener:fn=>listeners.push(fn)},sendMessage:()=>Promise.resolve()};
 const context=vm.createContext({console,Date,URL,setTimeout,clearTimeout,AbortController,TabSearchRegistry,getTabStateKey,getPageKey,
  normalizeProductText:v=>v,SearchResultCache:class{},PIQO_MONITORING_BASE_URL:'http://127.0.0.1:3000',classifyPriceObservation,normalizeReportUrl,
  createPriceReports:()=>({enqueue:async v=>queued.push(v),flush:async()=>{}}),chrome:{runtime,action:{onClicked:{addListener(){}}},
   tabs:{sendMessage:async()=>probe,onRemoved:{addListener(){}},onUpdated:{addListener(){}},onActivated:{addListener(){}}},
   storage:{local:{get:async key=>({[key]:store[key]}),set:async data=>Object.assign(store,data)}}}});
 const source=await readFile(new URL('../background.js',import.meta.url),'utf8');
 vm.runInContext(source.replace(/import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];?/g,''),context);
 const handler=listeners[0],sender={url:runtime.getURL('sidebar/sidebar.html'),tab:{id:1}};
 const base={type:'PRICE_OBSERVATION',tabId:1,observation_id:crypto.randomUUID(),opening:'open-1',page_url:probe.page_url,
  product_url:probe.product.sourceUrl,extracted_price:null,displayed_price:null};
 const send=(m=base,s=sender)=>new Promise(resolve=>{if(handler(m,s,resolve)!==true)resolve({rejected:true});});
 assert.equal((await send(base,{...sender,url:'https://malicious.example/sidebar/sidebar.html'})).rejected,true);
 assert.equal((await send({...base,tabId:2})).rejected,true);
 probe={...probe,open:false};assert.equal((await send()).ignored,true);
 probe={...probe,open:true};assert.equal((await send({...base,opening:'old-opening'})).ignored,true);
 assert.equal((await send({...base,page_url:'https://shop.example/other'})).ignored,true);
 assert.equal(queued.length,0);
 assert.equal((await send()).accepted,true);assert.equal(queued[0].outcome,'extraction_missing');
 assert.equal(queued[0].product_url,'https://khanoumi.com/item/1');assert.equal(queued[0].build_channel,'dev');
 probe={...probe,product:{...probe.product,price:120000}};
 assert.equal((await send({...base,extracted_price:null})).ignored,true,'reject a snapshot before newer price metadata');
 await send({...base,observation_id:crypto.randomUUID(),extracted_price:120000,displayed_price:120000});
 assert.equal(queued[1].outcome,'success');assert.equal('product_name' in queued[1],false);assert.equal('product_url' in queued[1],false);
 probe={...probe,excluded:true};await send({...base,extracted_price:120000});assert.equal(queued.length,2,'unavailable products are not queued');
});

test('actual sidebar monitor waits for an open visible stable panel, cancels on close and counts reopening',async()=>{
 const events={},timers=new Map(),messages=[];let timerId=0,intersection,mutation;
 const parent={postMessage(){}},product={sourceUrl:'https://shop.example/item',source:'unknown',price:120000};
 const price={textContent:'۱۲۰٬۰۰۰ تومان',getClientRects:()=>[{}]},card={querySelector:()=>price};
 const context=vm.createContext({console,crypto,Number,Set,Map,currentProduct:product,currentProductEl:card,currentTabId:1,guideViewOpen:false,
  guideNavBtn:{addEventListener(){}},getComputedStyle:()=>({visibility:'visible'}),
  setTimeout:fn=>{const id=++timerId;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),setInterval(){},
  IntersectionObserver:class{constructor(fn){intersection=fn;}observe(){}},MutationObserver:class{constructor(fn){mutation=fn;}observe(){}},
  window:{parent,addEventListener:(name,fn)=>events[name]=fn},document:{visibilityState:'visible',addEventListener:(name,fn)=>events[name]=fn},
  chrome:{runtime:{sendMessage:async m=>{messages.push(m);return m.type==='PRICE_PROBE'?{open:true,eligible:true,opening:opening,page_url:'https://shop.example/item',product}:{accepted:true};}}}});
 let opening='opening-1';
 vm.runInContext(await readFile(new URL('../sidebar/price-monitor.js',import.meta.url),'utf8'),context);
 const layout=open=>events.message({source:parent,data:{type:'PIQO_PANEL_LAYOUT',opening,open}});
 const tick=async()=>{const fns=[...timers.values()];timers.clear();for(const fn of fns)fn();await new Promise(r=>setImmediate(r));};
 intersection([{isIntersecting:true}]);await tick();assert.equal(messages.length,0,'hidden parent does not qualify');
 layout(true);assert.equal(timers.size,1);layout(false);await tick();assert.equal(messages.length,0,'closing before timeout cancels');
 layout(true);await tick();assert.equal(messages.filter(m=>m.type==='PRICE_OBSERVATION').length,1);
 assert.equal(messages.at(-1).displayed_price,120000);
 mutation();await tick();assert.equal(messages.filter(m=>m.type==='PRICE_OBSERVATION').length,1,'rerender does not duplicate observation');
 layout(false);opening='opening-2';layout(true);await tick();assert.equal(messages.filter(m=>m.type==='PRICE_OBSERVATION').length,2);
 assert.notEqual(messages.filter(m=>m.type==='PRICE_OBSERVATION')[0].observation_id,messages.at(-1).observation_id);
});
