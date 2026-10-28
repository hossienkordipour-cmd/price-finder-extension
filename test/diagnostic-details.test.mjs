import assert from 'node:assert/strict';
import { createDiagnostics, createSearchTrace, safeEvent, DIAGNOSTICS_KEY } from '../diagnostics.js';
import { diagnosticFetch } from '../request-diagnostics.js';

const trace = createSearchTrace(null);
const payload = { error: { code: 'AFFILIO_NOT_CONFIGURED', message: 'private token: secret' } };
const response = new Response(JSON.stringify(payload),{ status:503, headers:{'content-type':'application/json'} });
const returned = await diagnosticFetch(async()=>response,trace)('http://127.0.0.1:3000/v1/search?q=private');
assert.deepEqual(await returned.json(),payload,'Error inspection must not consume the source response');
const event = trace.requests.at(-1);
assert.equal(event.http_status,503); assert.equal(event.error_code,'AFFILIO_NOT_CONFIGURED');
assert.equal(event.target_environment,'local'); assert.equal(event.operation,'piqo_search');
assert.equal(JSON.stringify(event).includes('private'),false);
assert.equal(JSON.stringify(event).includes('secret'),false);
for (const body of ['<html>private</html>',JSON.stringify({error:{code:'PRIVATE_SECRET'}}),'x'.repeat(5000)]) {
  await diagnosticFetch(async()=>new Response(body,{status:503,headers:{'content-type':'application/json'}}),trace)('https://api.piqoo.ir/v1/search');
  assert.equal(trace.requests.at(-1).error_code,'HTTP_ERROR');
}
await diagnosticFetch(async()=>new Response(JSON.stringify(payload),{status:503,headers:{'content-type':'application/json'}}),trace)('https://api.torob.com/search');
assert.equal(trace.requests.at(-1).error_code,'HTTP_ERROR','Vendor bodies are not collected');
assert.equal(trace.requests.at(-1).target_environment,'external');
// A stalled error body cannot stall the caller indefinitely.
let streamController;
const stalled=new Response(new ReadableStream({start(c){streamController=c;}}),{status:503,headers:{'content-type':'application/json'}});
await Promise.race([
 diagnosticFetch(async()=>stalled,trace)('https://api.piqoo.ir/v1/search'),
 new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Error inspection stalled the request')),1000);timer.unref();}),
]);
assert.equal(trace.requests.at(-1).error_code,'HTTP_ERROR');
streamController.close();
// Consume the successful response to complete its event.
const success=await diagnosticFetch(async()=>new Response('{"results":[]}'),trace)('https://api.piqoo.ir/v1/divar/search');
await success.json();
assert.equal(trace.requests.at(-1).target_environment,'production');
assert.equal(trace.requests.at(-1).operation,'divar_search');
assert.equal(trace.requests.at(-1).error_code,undefined);
const safe=safeEvent({event_name:'request_finished',error_code:'SECRET',build_channel:'made-up',target_environment:'https://secret',operation:'/private'},'1.1.0');
for(const key of ['error_code','build_channel','target_environment','operation']) assert.equal(key in safe,false);
let rows={}; const diagnostics=createDiagnostics({version:'1.1.0',buildChannel:'dev',endpoint:'http://localhost/events',storage:{get:async key=>({[key]:rows[key]}),set:async v=>Object.assign(rows,v)}});
await diagnostics.emit({event_name:'search_started',search_id:crypto.randomUUID(),build_channel:'release'});
assert.equal(rows[DIAGNOSTICS_KEY][0].event.build_channel,'dev','Build metadata cannot be overridden by event payload');
console.log('Diagnostic details: HTTP/code/context, bounded body inspection, response preservation and privacy passed');
