import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createDigikalaOfferVerifier} from '../digikala-offer.js';
const source=readFileSync(new URL('../background.js',import.meta.url),'utf8');
const signed='https://publisher.affilio.ir/click?utm_signature=original&p=https%3A%2F%2Fwww.digikala.com%2Fproduct%2Fdkp-11801878%2F';
const old={name:'R50i',store:'دیجی‌کالا',price:2770000,url:signed,variantId:77976548,priceVerified:true,priceSource:'digikala-product-api',isAffiliate:true};
const other={name:'R50i',store:'زیتو',price:2590000,url:'https://zitu.ir/product/r50i'};
let requests=0,failed=false;
const context={createDigikalaOfferVerifier,normalizeProductText:x=>x,buildSearchQuery:x=>x,logApiCache(){},
 searchCache:{get:async()=>({results:[old,other]})},fetchWithTimeout:async(_url,options)=>{
  requests++; assert.equal(options.credentials,'include'); if(failed)throw Error('offline');
  return {ok:true,json:async()=>({data:{product:{id:11801878,title_fa:'R50i',status:'marketable',default_variant:{id:79463095,status:'marketable',seller:{title:'فونسرا'},price:{selling_price:27500000}}}}})};
 }};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('async function searchPrices('),source.indexOf('async function searchMasterKala(')),context);
const progress=[];
const result=await context.searchPrices({name:'R50i'},{onProgress:items=>progress.push(items)});
assert.equal(requests,1,'Previously verified cached prices must be checked again');
assert.equal(result[0].price,2750000); assert.equal(result[0].variantId,79463095);
assert.equal(result[0].url,signed,'Supplied affiliate link stays byte-for-byte unchanged');
assert.equal(result[1],other,'Other stores are untouched');
assert.equal(progress[0][0].price,2750000,'Do not briefly display stale cached price');
assert.equal(old.price,2770000,'Keep original cache evidence unchanged');
failed=true;
const fallback=await context.searchPrices({name:'R50i'});
assert.equal(fallback[0].price,2770000); assert.equal(fallback[0].url,signed);
assert.equal(fallback[0].priceVerification,'unavailable');
console.log('Cached Digikala prices refresh before display; affiliate links and failure fallback preserved');
