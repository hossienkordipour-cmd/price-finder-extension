// Product details belong only to this explicit report channel, never diagnostic events.
export const PRICE_REPORT_KEY='piqoMissingPriceReportsV1';
export const REPORT_TTL=7*86400000;
export const REPORT_SOURCES={digikala:['digikala.com'],technolife:['technolife.com','technolife.ir'],khanoumi:['khanoumi.com'],gooshishop:['gooshishop.com'],etkala:['etkala.ir'],basalam:['basalam.com'],masterkala:['masterkala.com'],digipay:['mydigipay.com'],kalaoma:['kalaoma.com']};
export function normalizeReportUrl(raw,source){
 try{const url=new URL(raw),host=url.hostname.replace(/^www\./,'');if(url.protocol!=='https:'||url.username||url.password||!REPORT_SOURCES[source]?.includes(host)||url.port)return null;
  if(!url.pathname||url.pathname==='/'||/(?:^|\/)(?:search|login|signin|cart|checkout|account|profile|user)(?:\/|$)/i.test(url.pathname))return null;
  if(source==='digikala'){const id=url.pathname.match(/^\/product\/(dkp-\d+)(?:\/|$)/);if(!id)return null;url.pathname='/product/'+id[1]+'/';}
  if(source==='technolife'&&!/^\/product-\d+(?:\/|$)/.test(url.pathname))return null;
  url.search='';url.hash='';url.hostname=host;if(url.href.length>700)return null;return url.href;
 }catch{return null;}
}
export function safePriceReport(product,version,buildChannel,now=Date.now()){
 const url=normalizeReportUrl(product?.sourceUrl,product?.source);if(!url||!product?.name||Number(product.price)>0)return null;
 const name=String(product.name).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,300);
 if(name.length<3)return null;
 return {schema_version:1,report_id:crypto.randomUUID(),product_name:name,product_url:url,source:product.source,reason:'price_not_found',extension_version:version,build_channel:['dev','release'].includes(buildChannel)?buildChannel:'unknown',occurred_at:new Date(now).toISOString()};
}
export function createPriceReporter({storage,endpoint,version,buildChannel='unknown',fetcher=fetch,now=Date.now}){
 let serial=Promise.resolve(),flushing=null;
 const locked=fn=>{const p=serial.catch(()=>{}).then(fn);serial=p;return p;};
 const clean=state=>({queue:(Array.isArray(state?.queue)?state.queue:[]).filter(r=>now()-Date.parse(r.report.occurred_at)<REPORT_TTL&&r.attempts<32).slice(-100),seen:Object.fromEntries(Object.entries(state?.seen||{}).filter(([,v])=>now()-v<86400000).slice(-200))});
 const get=async()=>clean((await storage.get(PRICE_REPORT_KEY))[PRICE_REPORT_KEY]);
 const save=state=>storage.set({[PRICE_REPORT_KEY]:state});
 async function enqueue(product){try{return await locked(async()=>{const report=safePriceReport(product,version,buildChannel,now());if(!report)return {queued:false};const state=await get(),key=version+'|'+report.product_url;
  if(Object.hasOwn(state.seen,key)||state.queue.some(r=>r.report.product_url===report.product_url&&r.report.extension_version===version))return {queued:true,duplicate:true};
  if(state.queue.length>=100)return {queued:false}; // Preserve existing unsent reports; never evict to make space.
  state.queue.push({report,attempts:0,next:0});state.seen[key]=now();await save(state);return {queued:true};});}catch{return {queued:false};}}
 function flush(){if(flushing)return flushing;flushing=(async()=>{let batch=[];await locked(async()=>{const state=await get();batch=state.queue.filter(r=>r.next<=now()).slice(0,10);for(const row of batch){row.attempts++;row.next=now()+Math.min(6*3600000,30000*2**Math.min(row.attempts,10));}await save(state);});if(!batch.length)return;
  let accepted=[];try{const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify({reports:batch.map(r=>r.report)}),signal:AbortSignal.timeout(8000)});if(response.ok){const body=await response.json();accepted=Array.isArray(body.accepted_ids)?body.accepted_ids:[];}}catch{}
  const sent=new Set(batch.map(r=>r.report.report_id)),ack=new Set(accepted.filter(id=>sent.has(id)));await locked(async()=>{const state=await get();state.queue=state.queue.filter(r=>!ack.has(r.report.report_id));await save(state);});
 })().catch(()=>{}).finally(()=>{flushing=null;});return flushing;}
 return {enqueue,flush};
}
