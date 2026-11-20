import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyPriceObservation,createPriceReports} from '../price-observations.js';

test('missing extraction and missing display require independent primary-price evidence',()=>{
 const probe={eligible:true,evidence:'visible_primary_price',product:{price:null}};
 assert.equal(classifyPriceObservation(probe,null),'extraction_missing');
 assert.equal(classifyPriceObservation({...probe,product:{price:120000}},null),'display_missing');
 assert.equal(classifyPriceObservation({...probe,product:{price:120000}},120000),'success');
 assert.equal(classifyPriceObservation({...probe,product:{price:120000}},12000),'display_missing');
 assert.equal(classifyPriceObservation({...probe,eligible:false},null),'unknown');
 assert.equal(classifyPriceObservation({...probe,evidence:'unknown'},null),'unknown');
});
test('durable retry and partial acknowledgement preserve event identity and concurrent enqueue',async()=>{
 const data={},storage={get:async key=>({[key]:structuredClone(data[key])}),set:async v=>Object.assign(data,structuredClone(v))};
 let now=Date.now(),fail=true,posts=[];
 const options={storage,endpoint:'http://localhost/v1/price-observations',now:()=>now,fetcher:async(url,options)=>{
  const rows=JSON.parse(options.body).observations;posts.push(rows);
  if(fail)throw new Error('offline');return {ok:true,json:async()=>({accepted_ids:[rows[0].observation_id,'unrelated']})};
 }};
 let queue=createPriceReports(options);
 const a={observation_id:crypto.randomUUID(),occurred_at:new Date(now).toISOString(),outcome:'success'};
 await queue.enqueue(a);await queue.enqueue(a);await queue.flush();assert.equal(posts[0].length,1);
 queue=createPriceReports(options);now+=60000;fail=false;
 const b={...a,observation_id:crypto.randomUUID()};await queue.enqueue(b);await queue.flush();
 assert.equal(posts[1][0].observation_id,a.observation_id);
 now+=60000;await queue.flush();assert.deepEqual(posts[2].map(r=>r.observation_id),[b.observation_id]);
 now+=60000;await queue.flush();assert.equal(posts.length,3);
});
