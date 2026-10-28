export const CATEGORY_VERSION = 1;
export const CATEGORIES = ['phone','laptop','computer_accessories','audio','tv','home_appliances','kitchen','clothing','shoes','vehicle_accessories','sports','tools','unknown'];
// Local, bounded rules; never send the title or an arbitrary category from a page.
export function classifyCategory(product) {
  const name=String(product?.name||'').slice(0,500).toLowerCase().replace(/[ي]/g,'ی').replace(/ك/g,'ک').replace(/[\u200c_-]/g,' ');
  const rules=[
    ['computer_accessories',/ماوس|موس\s|کیبورد|صفحه کلید|فلش مموری|هارد|کارت گرافیک|\b(mouse|keyboard|ssd|gpu)\b/],
    ['audio',/هدفون|هندزفری|ایرباد|اسپیکر|\b(headphones?|earbuds?|speaker)\b/],
    ['laptop',/لپ\s*تاپ|نوت بوک|مک بوک|\b(laptop|macbook|notebook)\b/],
    ['phone',/گوشی موبایل|تلفن همراه|گوشی هوشمند|\b(iphone|smartphone)\b/],
    ['tv',/تلویزیون|\btelevision\b/],
    ['home_appliances',/یخچال|لباسشویی|ظرفشویی|جاروبرقی|کولر گازی/],
    ['kitchen',/سرخ کن|هواپز|چای ساز|قهوه ساز|اسپرسوساز|کتری|قابلمه|ماهیتابه/],
    ['clothing',/پیراهن|تیشرت|تی شرت|شلوار|کاپشن|مانتو/],
    ['shoes',/کفش|کتانی|صندل/],
    ['vehicle_accessories',/لاستیک خودرو|روغن موتور|لنت ترمز|باتری خودرو/],
    ['sports',/دمبل|تردمیل|توپ فوتبال|راکت تنیس/],
    ['tools',/دریل|پیچ گوشتی|آچار|فرز برقی/],
  ];
  // Accessory titles must not be mistaken for the device they fit.
  const accessory=/قاب|کاور|کیف|محافظ|گلس|شارژر|باتری/.test(name);
  const matches=rules.filter(([,re])=>re.test(name)).map(([category])=>category);
  const category=matches.length===1&&!(accessory&&['phone','laptop','tv'].includes(matches[0]))?matches[0]:'unknown';
  return {category,category_method:category==='unknown'?'unknown':'title_rules',category_confidence:category==='unknown'?0:0.8,category_version:CATEGORY_VERSION};
}
export function createUsageTracker({storage,endpoint,version,buildChannel='unknown',fetcher=fetch,now=Date.now,id=()=>crypto.randomUUID()}) {
  let serial=Promise.resolve(),lastSent=null;
  const touch=()=>{
    const task=serial.catch(()=>{}).then(async()=>{
      const key='piqoUsageSessionV1',old=(await storage.get(key))[key],time=now();
      const session=old&&time-old.last<30*60000&&time-old.created<8*3600000&&time>=old.last?{...old,last:time}:{id:id(),created:time,last:time};
      await storage.set({[key]:session});return session.id;
    });serial=task;return task;
  };
  return {touch,async active(){
    try {const session_id=await touch();if(lastSent!==null&&now()-lastSent<45000&&now()>=lastSent)return;lastSent=now();await fetcher(endpoint,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id,occurred_at:new Date(now()).toISOString(),extension_version:version,build_channel:buildChannel}),signal:AbortSignal.timeout(4000)});}catch{/* Presence is best effort, never replayed from an offline queue. */}
  }};
}
