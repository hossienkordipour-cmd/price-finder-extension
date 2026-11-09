// Isolated content-script world; no page text or HTML is sent with a report.
(() => {
 const stableMs=15000;
 function createDetector({read,send,visible=()=>document.visibilityState==='visible',ready=()=>document.readyState==='complete',now=Date.now}){
  let opened=false,started=null,key='',sent=new Set(),busy=false;
  async function check(){if(!opened||busy)return;const value=read();if(!value||!visible()||!ready()||value.loading||value.unavailable){started=null;return;}
   const identity=value.product.sourceUrl+'|'+(value.product.variantId||'');if(identity!==key){key=identity;started=null;}
   if(Number(value.product.price)>0){started=null;return;}if(sent.has(identity))return;
   if(started===null){started=now();return;}if(now()-started<stableMs)return;
   busy=true;try{const result=await send(value.product);if(result?.queued)sent.add(identity);}catch{}finally{busy=false;}
  }
  return {open(){opened=true;started=null;void check();},close(){opened=false;started=null;},navigate(){started=null;key='';sent=new Set();},check};
 }
 globalThis.PiqoPriceReportDetection={createDetector,stableMs};
})();
