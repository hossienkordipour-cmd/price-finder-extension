import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {assessProductMatch,buildSearchQuery,isPriceValid,normalizeProductText} from '../filters.js';
import {createDigikalaOfferVerifier,getDigikalaProductId} from '../digikala-offer.js';
const source=readFileSync(new URL('../background.js',import.meta.url),'utf8');
const name='کیبورد و ماوس بی‌سیم هیسکا مدل H-MK25',url='https://www.digikala.com/product/dkp-22109767/';
const signed='https://publisher.affilio.ir/click?utm_signature=exact-fixture&p='+url;
const calls=[];
let unrelated=false,missing=false;
const other={name,store:'باسلام',price:4150000,url:'https://basalam.com/product/123',source:'affilio',isAffiliate:true,availability:true};
const ctx={console:{log(){}},globalAffilioPrefix:null,assessProductMatch,buildSearchQuery,isPriceValid,normalizeProductText,
createDigikalaOfferVerifier,getDigikalaProductId,logApiResults(){},
searchPiqoApi:async q=>{calls.push(q);if(q==='H-MK25'&&!missing)return [{name,store:'دیجی کالا',price:4499000,url:signed,sourceUrl:url,source:'affilio',isAffiliate:true,availability:true}];return unrelated?[{...other}]:[];},
fetchWithTimeout:async()=>({ok:true,json:async()=>({data:{product:{id:22109767,title_fa:name,status:'marketable',default_variant:{id:456,status:'marketable',price:{selling_price:44990000}}}}})}),};
for(const fn of ['searchDigikala','searchTorob','searchEmalls','searchBasalam','searchDivar','searchSheypoor','searchMasterKala','searchDigipay','searchKalaoma','searchTechnolife','searchKhanoumi','searchGooshishop'])ctx[fn]=async()=>[];
ctx.searchDigikala=async()=>[{name,store:'دیجی‌کالا',url,price:4499000,availability:true}];
vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('async function searchPricesFromStores('),source.indexOf('\nasync function searchPiqoApi(')),ctx);
for(const nonempty of [false,true]){
 unrelated=nonempty;calls.length=0;
 const results=await ctx.searchPricesFromStores({name,price:4499000,sourceUrl:url});
 const dk=results.filter(x=>getDigikalaProductId(x)==='22109767');
 assert.equal(calls.filter(q=>q==='H-MK25').length,1,'Lookup must use exact model even when another merchant has results');
 assert.equal(dk.length,1);assert.equal(dk[0].url,signed);assert.equal(dk[0].price,4499000);
}
// No available same-product link: never manufacture one from a previous product's signature.
ctx.globalAffilioPrefix='https://publisher.affilio.ir/click?utm_signature=another-product';missing=true;
const direct=await ctx.searchPricesFromStores({name,price:4499000,sourceUrl:url});
assert.equal(direct.find(x=>getDigikalaProductId(x)==='22109767').url,url);
console.log('Affiliate model lookup: exact DKP, model query, other-merchant results, verified price and no reused signatures passed');
