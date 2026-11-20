// Separate contract: ordinary successful observations never include product identities.
export function classifyPriceObservation(probe, displayedPrice) {
  if (!probe?.eligible || !['visible_primary_price','structured_visible_price'].includes(probe.evidence)) return 'unknown';
  if (!(Number.isFinite(probe.product?.price) && probe.product.price > 0)) return 'extraction_missing';
  return displayedPrice === probe.product.price ? 'success' : 'display_missing';
}
export function createPriceReports(options) {
  return createMonitoringQueue({ ...options, key: 'piqoPriceObservationsV1', idField: 'observation_id', payloadField: 'observations' });
}

export function createMonitoringQueue({storage, endpoint, key, idField, payloadField, fetcher = fetch, now = Date.now, batchSize = 10}) {
  const max = 400;
  let serial = Promise.resolve(), flushing;
  const locked = fn => { const p = serial.catch(()=>{}).then(fn); serial = p; return p; };
  const fresh = rows => (Array.isArray(rows) ? rows : []).filter(r => now()-Date.parse(r.event.occurred_at)<86400000 && r.attempts<8).slice(-max);
  async function enqueue(event) {
    return locked(async()=>{
      const rows = fresh((await storage.get(key))[key]);
      if (rows.some(r=>r.event[idField]===event[idField])) return;
      rows.push({event,attempts:0,next:0}); await storage.set({[key]:rows.slice(-max)});
    });
  }
  function flush() {
    if (flushing) return flushing;
    flushing = (async()=>{
      const batch = await locked(async()=>{
        const rows = fresh((await storage.get(key))[key]);
        const batch = rows.filter(r=>r.next<=now()).slice(0,batchSize);
        for(const r of batch){r.attempts++;r.next=now()+Math.min(3600000,15000*2**r.attempts);}
        await storage.set({[key]:rows});return batch;
      });
      if(!batch.length)return;
      try {
        const response = await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',
          body:JSON.stringify({[payloadField]:batch.map(r=>r.event)}),signal:AbortSignal.timeout(8000)});
        if(!response.ok)return;
        const data = await response.json(), sent = new Set(batch.map(r=>r.event[idField]));
        const accepted = new Set((Array.isArray(data.accepted_ids)?data.accepted_ids:[]).filter(id=>sent.has(id)));
        await locked(async()=>{const rows=fresh((await storage.get(key))[key]);await storage.set({[key]:rows.filter(r=>!accepted.has(r.event[idField]))});});
      } catch { /* Retry the same observation id after restart; never block the product. */ }
    })().catch(()=>{}).finally(()=>{flushing=null;});
    return flushing;
  }
  return {enqueue,flush};
}
