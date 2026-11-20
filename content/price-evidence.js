// Conservative evidence independent of the main extractor. Never scan arbitrary
// page amounts: installments, old prices and recommended products are not proof.
(function(){
  const digits = text => String(text||'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const number = text => Number(digits(text).replace(/[^\d]/g,''));
  const normalized = text => String(text||'').replace(/[ي]/g,'ی').replace(/[ك]/g,'ک').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
  function visible(el) {
    if(!el?.getClientRects().length)return false;
    for(let node=el;node;node=node.parentElement){
      const style=getComputedStyle(node);
      if(style.display==='none'||style.visibility==='hidden'||style.opacity==='0'||node.getAttribute('aria-hidden')==='true')return false;
    }
    return true;
  }
  function excluded(el) {
    if(el.closest('del,s,aside,nav,[aria-hidden="true"],#piqo-widget-container,#piqo-popup-iframe'))return true;
    for(let node=el;node;node=node.parentElement)if(
      /recommend|related|carousel|suggest|installment|insurance|old.price|price.old|discount|line-through/i.test(`${node.id} ${node.className}`)||
      getComputedStyle(node).textDecoration.includes('line-through'))return true;
    return false;
  }
  function probe(product) {
    if(!product?.name||product.source==='manual')return {eligible:false,evidence:'unknown'};
    const root=document.querySelector('main')||document.body;
    const primary='[data-testid="price-final"],dds-price[slot="price"][variant="price"],[data-theme-animation="price-container"],[itemprop="offers"] [itemprop="price"]';
    const nodes=[...root.querySelectorAll(primary+', [itemprop="price"],.price,.product-price,[class*="product-price"],[class*="final-price"]')].filter(el=>visible(el)&&!excluded(el));
    const positive=el=>{const text=digits(el.textContent).trim();return text.length<90&&/\d/.test(text)&&number(text)>0;};
    // Only use JSON-LD for this product, never ItemList or unrelated nested products.
    const products=[];
    for(const script of [...document.querySelectorAll('script[type="application/ld+json"]')].slice(0,20)){
      if(script.textContent.length>250000)continue;
      try {const parsed=JSON.parse(script.textContent);for(const node of Array.isArray(parsed)?parsed:[parsed]){
        const graph=Array.isArray(node?.['@graph'])?node['@graph']:[node];
        products.push(...graph.filter(p=>[p?.['@type']].flat().some(t=>String(t).split(/[\/#]/).pop()==='Product')));
      }} catch { /* Invalid structured data is not evidence. */ }
    }
    const name=normalized(product.name);
    const matching=products.filter(p=>{const n=normalized(p.name);return n.length>=4&&name.length>=4&&(n.includes(name)||name.includes(n));});
    const offers=matching.flatMap(p=>[p.offers].flat().filter(Boolean));
    if(offers.some(o=>/OutOfStock|SoldOut|Discontinued/i.test(o.availability||'')))return {eligible:false,excluded:true,evidence:'unknown'};
    const microproducts=[...root.querySelectorAll('[itemtype$="/Product"],[itemtype$="#Product"]')].filter(el=>normalized(el.querySelector('[itemprop="name"]')?.textContent)===name);
    if(microproducts.some(el=>/OutOfStock|SoldOut|Discontinued/i.test(el.querySelector('[itemprop="availability"]')?.getAttribute('href')||'')))return {eligible:false,excluded:true,evidence:'unknown'};
    // Explicit current primary price is useful even if the main extraction failed.
    if(product.source==='digikala'){
      const buttons=[...root.querySelectorAll('[data-cro-id="pdp-add-to-cart"],[data-cro-id="pdp-mini-add-to-cart"]')].filter(b=>visible(b)&&!b.disabled);
      const button=buttons.find(b=>b.getAttribute('data-cro-id')==='pdp-add-to-cart')||buttons[0];
      for(let scope=button?.parentElement;scope&&scope!==root&&scope!==document.body;scope=scope.parentElement){
        if(scope.querySelectorAll('[data-cro-id="pdp-add-to-cart"],[data-cro-id="pdp-mini-add-to-cart"]').length>1)break;
        if(nodes.some(el=>scope.contains(el)&&el.matches(primary)&&positive(el)))return {eligible:true,evidence:'visible_primary_price'};
        if(scope.querySelector('dds-price-group'))break;
      }
    }
    if (product.source === 'technolife') {
      const carts = [...root.querySelectorAll('button')].filter(button => visible(button) && button.textContent.includes('افزودن به سبد خرید'));
      const button = carts.find(cart => !cart.disabled && cart.querySelector('svg.icon-pdpCart'));
      for (let scope = button?.parentElement; scope && scope !== root && scope !== document.body; scope = scope.parentElement) {
        if (carts.filter(cart => scope.contains(cart)).length > 1) break;
        const prices = [...scope.querySelectorAll('p, span')].filter(element => {
          const unit = element.nextElementSibling;
          if (!/^[\d,٬\s]+$/.test(digits(element.textContent).trim()) || !/^(تومان|ریال)$/.test(unit?.textContent.trim() || '')) return false;
          if (!visible(unit) || !visible(element) || excluded(element) || !positive(element)) return false;
          for (let parent = element.parentElement; parent && parent !== scope; parent = parent.parentElement) {
            if (!parent.contains(button) && /بیمه|اقساط/.test(parent.textContent)) return false;
          }
          return true;
        });
        if (prices.length) return new Set(prices.map(element => number(element.textContent))).size === 1
          ? {eligible:true,evidence:'visible_primary_price'} : {eligible:false,evidence:'unknown'};
      }
    }
    if(microproducts.some(scope=>/InStock|LimitedAvailability|OnlineOnly/i.test(scope.querySelector('[itemprop="availability"]')?.getAttribute('href')||'')&&
      nodes.some(el=>scope.contains(el)&&el.matches('[itemprop="price"]')&&positive(el))))return {eligible:true,evidence:'visible_primary_price'};
    for(const offer of offers){
      if(!/InStock|LimitedAvailability|OnlineOnly/i.test(offer.availability||''))continue;
      const amount=Number(offer.price),currency=String(offer.priceCurrency||'').toUpperCase();
      if(!(amount>0)||!['IRR','IRT','TOMAN'].includes(currency))continue;
      const toman=currency==='IRR'?Math.round(amount/10):amount;
      if(nodes.some(el=>{
        if(!positive(el)||el.closest('a[href]'))return false;
        const text=el.textContent||'',raw=number(text);
        return /تومان|ریال/.test(el.parentElement?.textContent||'') && (raw===toman||(/ریال/.test(text)&&raw===amount));
      }))return {eligible:true,evidence:'structured_visible_price'};
    }
    return {eligible:false,evidence:'unknown'};
  }
  globalThis.piqoPriceEvidence={probe};
})();
