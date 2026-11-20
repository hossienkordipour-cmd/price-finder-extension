// Each visible opening/product is measured once. Rendering and metadata changes
// must settle first; requestAnimationFrame/IntersectionObserver alone are not a
// reliable signal for an iframe that its parent has been hidden.
(function(){
  let opening = null, open = false, visible = false, lastIdentity = '', timer, generation = 0;
  const measured = new Set(), ids = new Map();
  const attempts = new Map();
  const identity = () => currentProduct?.sourceUrl ? `${opening}|${currentProduct.sourceUrl}|${currentProduct.variantId||''}` : '';
  const active = () => open && visible && !guideViewOpen && document.visibilityState === 'visible' && Number.isInteger(currentTabId);
  const displayed = () => {
    const el = currentProductEl.querySelector('.card-price');
    if(!el || !el.getClientRects().length || getComputedStyle(el).visibility==='hidden')return null;
    const value = Number(el.textContent.replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d]/g,''));
    return value>0 ? value : null;
  };
  async function check(id, token) {
    if(!active() || identity()!==id || generation!==token || measured.has(id))return;
    try {
      const probe = await chrome.runtime.sendMessage({type:'PRICE_PROBE',tabId:currentTabId});
      if(!active() || identity()!==id || generation!==token)return;
      const retries = attempts.get(id) || 0;
      const sameProduct = probe?.open && probe.opening === opening && probe.product?.sourceUrl === currentProduct.sourceUrl &&
        (probe.product?.variantId || '') === (currentProduct.variantId || '');
      if ((!sameProduct || (!probe.eligible && !probe.excluded)) && retries < 3) {
        attempts.set(id, retries + 1);
        timer = setTimeout(() => void check(id, token), 3000);
        return;
      }
      if (!sameProduct) return;
      const response = await chrome.runtime.sendMessage({type:'PRICE_OBSERVATION',tabId:currentTabId,
        observation_id:ids.get(id),opening,page_url:probe.page_url,product_url:currentProduct.sourceUrl,
        extracted_price:probe.product.price,displayed_price:displayed()});
      if(response?.accepted)measured.add(id);
    } catch { /* Monitoring must not interrupt the panel. */ }
  }
  function schedule() {
    clearTimeout(timer); generation++;
    const id = identity();
    if(!active() || !id || measured.has(id))return;
    if(!ids.has(id))ids.set(id,crypto.randomUUID());
    const token = generation;
    timer = setTimeout(()=>void check(id,token),6000);
  }
  window.addEventListener('message',event=>{
    if(event.source!==window.parent || event.data?.type!=='PIQO_PANEL_LAYOUT')return;
    const changed = opening!==event.data.opening || open!==Boolean(event.data.open);
    if (opening !== event.data.opening) {
      measured.clear();
      ids.clear();
      attempts.clear();
    }
    opening = event.data.opening;open = Boolean(event.data.open);
    if(changed)schedule();
  });
  new IntersectionObserver(entries=>{const next=entries.some(e=>e.isIntersecting);if(next!==visible){visible=next;schedule();}}).observe(currentProductEl);
  new MutationObserver(schedule).observe(currentProductEl,{childList:true,subtree:true,characterData:true,attributes:true});
  document.addEventListener('visibilitychange',schedule);
  guideNavBtn?.addEventListener('click',schedule);
  // Metadata may arrive before the packaged sidebar obtains its tab identity.
  setInterval(()=>{const next=identity()+`|${currentTabId}|${guideViewOpen}`;if(next!==lastIdentity){lastIdentity=next;schedule();}},1000);
  window.parent.postMessage({type:'PIQO_PRICE_PANEL_READY'},'*');
})();
