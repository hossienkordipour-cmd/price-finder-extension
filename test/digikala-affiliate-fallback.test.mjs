import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {assessProductMatch,buildSearchQuery,isPriceValid,normalizeProductText} from '../filters.js';
import {createDigikalaOfferVerifier,getDigikalaProductId} from '../digikala-offer.js';

const source=readFileSync(new URL('../background.js',import.meta.url),'utf8');
const name='قرص ویتامین "D3" یوروویتال مدل 1000 واحدی بسته 60 عددی';
const url='https://www.digikala.com/product/dkp-7158804/';
const signed='https://publisher.affilio.ir/click?utm_signature=fixture&p='+url;
const calls=[];
const context={console:{log(){}},globalAffilioPrefix:null,assessProductMatch,buildSearchQuery,isPriceValid,normalizeProductText,
 createDigikalaOfferVerifier,getDigikalaProductId,logApiResults(){},
 searchPiqoApi:async q=>{calls.push(q);return q==='قرص ویتامین D3'?[{name:'قرص ویتامین D3-1000 واحدی بسته 60 عددی',store:'دیجی کالا',price:160000,url:signed,sourceUrl:url,source:'affilio',isAffiliate:true,availability:true}]:[];},
 fetchWithTimeout:async()=>({ok:true,json:async()=>({data:{product:{id:7158804,title_fa:name,status:'marketable',default_variant:{id:123,status:'marketable',price:{selling_price:1600000}}}}})}),
};
for(const fn of ['searchDigikala','searchTorob','searchEmalls','searchBasalam','searchDivar','searchSheypoor','searchMasterKala','searchDigipay','searchKalaoma','searchTechnolife','searchKhanoumi','searchGooshishop'])context[fn]=async()=>[];
context.searchDigikala=async()=>[{name,store:'دیجی‌کالا',url,price:160000,availability:true}];
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('async function searchPricesFromStores('),source.indexOf('\nasync function searchPiqoApi(')),context);
const results=await context.searchPricesFromStores({name,price:160000});
assert.equal(calls.filter(q=>q==='قرص ویتامین D3').length,1,'Empty precise searches need one broader fallback');
assert.equal(results.length,1);assert.equal(results[0].url,signed,'Matching supplied tracking URL must survive verification/deduplication');
assert.equal(results[0].price,160000);assert.equal(getDigikalaProductId(results[0]),'7158804');
assert.equal(results[0].isAffiliate,true);
// Existing useful results do not incur another broad query.
calls.length=0;
context.searchPiqoApi=async q=>{calls.push(q);return [{name,store:'دیجی کالا',price:160000,url:signed,sourceUrl:url,source:'affilio',isAffiliate:true,availability:true}];};
await context.searchPricesFromStores({name,price:160000});
assert.ok(!calls.includes('قرص ویتامین D3'));
// Empty/offline affiliate search retains a usable direct result; no fabricated tracking URL.
context.globalAffilioPrefix=null;context.searchPiqoApi=async()=>[];
const direct=await context.searchPricesFromStores({name,price:160000});
assert.equal(direct[0].url,url);assert.ok(!direct[0].isAffiliate);
calls.length=0;context.searchPiqoApi=async q=>{calls.push(q);throw new Error('offline');};
assert.equal((await context.searchPricesFromStores({name,price:160000}))[0].url,url);
assert.equal(calls.length,3,'Failed precise requests must not trigger another request');
context.searchPiqoApi=async q=>{if(q==='قرص ویتامین D3')throw new Error('fallback offline');return [];};
assert.equal((await context.searchPricesFromStores({name,price:160000}))[0].url,url);
console.log('Digikala affiliate fallback: empty precise queries, exact-DKP signed link, verified price, bounded requests, empty/offline fallback passed');
