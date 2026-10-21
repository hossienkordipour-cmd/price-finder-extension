const $ = selector => document.querySelector(selector);
const money = value => value.toLocaleString('fa-IR');
const basePrice = 12490000;
const originalProductHeading = document.querySelector('.product-details h1').innerHTML;
const tutorialCopy = Object.freeze({
  startTitle:'قبل از خرید، پیکو رو باز کن',
  startBody:'روی «ارزون‌ترش هست؟» بزن تا قیمت همین محصول رو در فروشگاه‌های دیگه ببینی.',
  startHint:'از دکمهٔ پیکو شروع کن',
  compareTitle:'همین محصول، با قیمت کمتر',
  compareBody:'روی پیشنهاد مشخص‌شده بزن تا وارد فروشگاهش بشی.',
  compareHint:'پیشنهاد مشخص‌شده رو باز کن',
  successBody:'آیفون ۱۷ رو در دیجی‌کالا باز کن و پیکو رو امتحان کن.',
  firstStore:'فروشگاه اول · قیمت تمرینی',
  nextStore:'فروشگاه دوم · قیمت تمرینی',
});
// Keep static helper copy here alongside the text used during state changes.
for (const [selector,text] of Object.entries({
  '.practice-badge':'بدون خرید واقعی',
  '#coach-restart':'تکرار آموزش',
  '#buy-note':'این صفحه تمرینیه؛ چیزی به سبد خرید اضافه نمی‌شه.',
  '.merchant-arrival b':'همون محصول، توی یک فروشگاه دیگه',
  '.merchant-arrival p':'در خرید واقعی، ادامهٔ خرید توی سایت فروشنده انجام می‌شه.',
  '.shop-footer>span:first-child':'این فروشگاه و قیمت‌هاش فقط برای آموزش‌اند.',
  '.results-disclaimer':'قیمت‌ها تمرینی‌اند؛ با انتخاب پیشنهاد، وارد فروشگاه نمونه می‌شی.',
  '#success>small':'قیمت‌ها تمرینی‌اند؛ خریدی انجام نشده.',
})) document.querySelector(selector).textContent = text;
const offers = [
  {id:'one', store:'آوا مارکت', price:10890000},
  {id:'two', store:'موج دیجیتال', price:11290000},
  {id:'three', store:'نوا شاپ', price:11990000},
];
let searchTimer;
let toastTimer;
let generation = 0;
let coachFrame = 0;
let celebrationTimer;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function clearCelebration() {
  clearTimeout(celebrationTimer);
  document.querySelector('#celebration')?.remove();
}
function celebrate() {
  clearCelebration();
  if (reducedMotion.matches) return;
  const layer = document.createElement('div');
  layer.id = 'celebration'; layer.setAttribute('aria-hidden','true');
  document.body.append(layer);
  const colors = ['#00a95c','#53c792','#a9e8ca','#12332a','#e5bd58'];
  const count = innerWidth < 620 ? 38 : 68;
  for (let index = 0; index < count; index++) {
    const piece = document.createElement('i');
    piece.className = `confetti-piece shape-${index % 4}`;
    piece.style.left = `${(index+.2+Math.random()*.6)/count*100}%`;
    piece.style.backgroundColor = colors[index % colors.length];
    const size = 8 + Math.random()*11;
    piece.style.width = `${size}px`; piece.style.height = `${size*(index%4===0 ? 2.3 : 1)}px`;
    layer.append(piece);
    const drift = (Math.random()-.5)*220;
    const turn = (Math.random()>.5 ? 1 : -1)*(220+Math.random()*480);
    const sway = 20+Math.random()*34;
    const phase = Math.random()*Math.PI*2;
    const frames = Array.from({length:13},(_,frame)=>{
      const t = frame/12;
      const x = drift*t + (Math.sin(phase+t*Math.PI*4)-Math.sin(phase))*sway;
      const y = -100 + (innerHeight+240)*Math.pow(t,1.16);
      return {offset:t,transform:`translate3d(${x}px,${y}px,0) rotate(${turn*t}deg) rotateY(${t*650}deg)`,opacity:t<.85 ? 1 : (1-t)/.15};
    });
    piece.animate(frames,{duration:4500+Math.random()*1900,delay:Math.random()*1200-200,easing:'linear',fill:'both'});
  }
  celebrationTimer = setTimeout(clearCelebration,8000);
}
reducedMotion.addEventListener('change',event=>{if(event.matches)clearCelebration();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearCelebration();});
function positionCoach() {
  coachFrame = 0;
  const coach = $('#coach');
  if (coach.hidden) return;
  const height = Math.ceil(coach.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--coach-height', `${height}px`);
  if (innerWidth <= 900) return;
  const step = document.body.dataset.step;
  const target = step === 'start' ? $('#piqo-widget') : $('.demo-target') || $('.base-product');
  const bounds = target.getBoundingClientRect();
  const panel = $('#piqo-panel').getBoundingClientRect();
  const width = coach.getBoundingClientRect().width;
  const left = Math.max(16, (step === 'start' ? bounds.left : panel.left) - width - 22);
  const top = Math.max(20, Math.min(innerHeight-height-20, bounds.top+bounds.height/2-height/2));
  coach.style.setProperty('--coach-left', `${Math.round(left)}px`);
  coach.style.setProperty('--coach-top', `${Math.round(top)}px`);
  coach.style.setProperty('--coach-arrow', `${Math.round(Math.max(22, Math.min(height-22, bounds.top+bounds.height/2-top)))}px`);
}
function scheduleCoach() { if (!coachFrame) coachFrame = requestAnimationFrame(positionCoach); }
// Reserve the coach's actual height on narrow screens, including wrapped text.
const coachObserver = new ResizeObserver(() => {
  scheduleCoach();
});
coachObserver.observe($('#coach'));
coachObserver.observe($('#piqo-widget'));
window.addEventListener('resize',scheduleCoach);
$('#piqo-panel').addEventListener('scroll',scheduleCoach,{passive:true});

function announce(text) { $('#announcement').textContent = text; }
function progress(step) {
  document.querySelectorAll('.progress li').forEach((item,index) => {
    item.classList.toggle('complete', index < step);
    if(index === step) item.setAttribute('aria-current','step');
    else item.removeAttribute('aria-current');
  });
}
function renderOffers() {
  const sorted = [...offers].sort((a,b) => $('#sort').value === 'expensive' ? b.price-a.price : a.price-b.price);
  $('#offer-list').replaceChildren(...sorted.map((offer,index) => {
    const button = document.createElement('button');
    const isTutorialTarget = offer.id === 'one';
    button.type = 'button'; button.className = `offer-card${isTutorialTarget ? ' demo-target' : ''}`; button.dataset.offer = offer.id;
    button.disabled = !isTutorialTarget;
    button.setAttribute('aria-label', `باز کردن فروشگاه نمونهٔ ${offer.store}، قیمت تمرینی ${money(offer.price)} تومان`);
    // These are fixed, local tutorial fixtures, never API or user-provided HTML.
    button.innerHTML = `<img class="offer-image" src="./assets/airpods-pro.jpg" width="72" height="72" alt=""><div class="offer-info"><h3>هدفون بی‌سیم اپل مدل AirPods Pro</h3><p class="offer-store">${offer.store} · نو</p><div class="offer-bottom"><strong class="offer-price">${money(offer.price)} <small>تومان</small></strong><span class="discount">${money(Math.round((basePrice-offer.price)/basePrice*100))}٪ ارزان‌تر</span></div></div>`;
    const media = document.createElement('div');
    media.className = 'offer-media';
    const image = button.querySelector('.offer-image');
    image.replaceWith(media); media.append(image);
    const overlayDiscount = button.querySelector('.discount').cloneNode(true);
    overlayDiscount.classList.add('image-discount');
    overlayDiscount.setAttribute('aria-hidden','true');
    media.append(overlayDiscount);
    button.querySelector('.offer-store').textContent = offer.store;
    if (isTutorialTarget) {
      const pointer = document.createElementNS('http://www.w3.org/2000/svg','svg');
      pointer.setAttribute('class','tutorial-pointer');
      pointer.setAttribute('viewBox','0 0 48 64');
      pointer.setAttribute('aria-hidden','true');
      pointer.innerHTML = '<path d="M15 33V8a5 5 0 0 1 10 0v18a5 5 0 0 1 8 3 5 5 0 0 1 8 4l1 14c0 9-6 15-15 15h-3c-5 0-9-2-12-6L3 43c-4-6 2-12 7-7l5 5Z" fill="#efb900" stroke="#dca800" stroke-width="1.5" stroke-linejoin="round"/>';
      button.append(pointer);
    }
    button.addEventListener('click',() => chooseOffer(offer));
    return button;
  }));
  scheduleCoach();
}
function reset(focus = true) {
  clearCelebration();
  generation++; clearTimeout(searchTimer); clearTimeout(toastTimer);
  document.body.dataset.step = 'start';
  $('#piqo-panel').hidden = true; $('.scrim').hidden = false;
  $('#practice').inert = true; $('.lesson-header').inert = true;
  $('#success').hidden = true; $('#coach').hidden = false;
  $('#panel-help').disabled = false;
  $('#piqo-widget').hidden = false; $('#piqo-widget').setAttribute('aria-expanded','false');
  $('#demo-loading').hidden = true; $('#demo-results').hidden = true;
  $('#sample-toast').hidden = true; $('#coach-restart').hidden = true;
  $('#sort').value = 'match'; $('#offer-list').replaceChildren();
  $('#offer-list').classList.remove('offer-grid');
  $('#layout-toggle').setAttribute('aria-pressed','false');
  $('#layout-toggle').setAttribute('aria-label','نمایش شبکه‌ای پیشنهادها');
  updateLayoutIcon(false);
  $('#condition').value = 'all';
  $('#merchant-arrival').hidden = true;
  $('#step-label').textContent = 'قدم ۱ از ۳';
  $('#coach-title').textContent = tutorialCopy.startTitle;
  $('#coach-copy').textContent = tutorialCopy.startBody;
  $('#coach-hint').innerHTML = `<i aria-hidden="true"></i> ${tutorialCopy.startHint}`;
  $('#page-price').textContent = money(basePrice);
  $('.product-details h1').innerHTML = originalProductHeading;
  $('#shop-name').textContent = 'دیجینو'; $('#seller-label').textContent = 'فروشنده: دیجینو';
  $('#shop-tagline').textContent = 'دنیای دیجیتال تو';
  $('.shop-mark').textContent = 'د';
  $('.warranty').textContent = tutorialCopy.firstStore;
  progress(0); announce('قدم اول: برای شروع آموزش، دکمهٔ پیکو رو بزن.');
  if(focus) { $('#piqo-widget').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
  scheduleCoach();
}
function openPanel() {
  if(document.body.dataset.step !== 'start') return;
  const current = ++generation;
  document.body.dataset.step = 'loading';
  $('#coach').hidden = true;
  $('#panel-help').disabled = true;
  $('#piqo-panel').hidden = false; $('.scrim').hidden = false;
  $('#practice').inert = true; $('.lesson-header').inert = true;
  $('#piqo-widget').hidden = true; $('#piqo-widget').setAttribute('aria-expanded','true');
  $('#demo-loading').hidden = false; $('#coach-restart').hidden = false;
  $('#step-label').textContent = 'قدم ۲ از ۳';
  progress(1);
  $('#panel-close').focus({preventScroll:true});
  scheduleCoach();
  announce('پنل پیکو باز شد. پیشنهادهای تمرینی در حال آماده‌شدن‌اند.');
  searchTimer = setTimeout(() => {
    if(current !== generation) return;
    document.body.dataset.step = 'compare';
    $('#coach').hidden = false;
    $('#panel-help').disabled = false;
    $('#demo-loading').hidden = true; $('#demo-results').hidden = false;
    renderOffers();
    $('#coach-title').textContent = tutorialCopy.compareTitle;
    $('#coach-copy').textContent = tutorialCopy.compareBody;
    $('#coach-hint').innerHTML = `<i aria-hidden="true"></i> ${tutorialCopy.compareHint}`;
    // Reserve the newly visible coach height before the comparison is painted.
    cancelAnimationFrame(coachFrame); positionCoach();
    announce('پیشنهادها آماده‌ست. برای ادامه، پیشنهاد مشخص‌شده رو انتخاب کن. دو پیشنهاد دیگه غیرفعال‌اند.');
  }, 850);
}
function chooseOffer(offer) {
  if(document.body.dataset.step !== 'compare') return;
  generation++; clearTimeout(searchTimer);
  document.body.dataset.step = 'merchant';
  $('#piqo-panel').hidden = true; $('.scrim').hidden = true;
  $('#practice').inert = false; $('.lesson-header').inert = false;
  $('#coach').hidden = true; $('#success').hidden = false;
  $('#page-price').textContent = money(offer.price);
  $('.product-details h1').innerHTML = 'هدفون بی‌سیم اپل<br><span lang="en" dir="ltr">AirPods Pro</span>';
  $('#shop-name').textContent = offer.store; $('#seller-label').textContent = `فروشنده: ${offer.store}`;
  $('#shop-tagline').textContent = 'یک انتخاب هوشمندانه‌تر';
  $('.shop-mark').textContent = offer.store.charAt(0);
  $('.warranty').textContent = tutorialCopy.nextStore;
  $('#merchant-arrival').hidden = false;
  $('#chosen-store').textContent = offer.store;
  $('#chosen-price').textContent = money(offer.price);
  $('#saving-amount').textContent = money(basePrice-offer.price);
  $('#success-copy').textContent = tutorialCopy.successBody;
  progress(2); $('#success-title').focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'instant'});
  announce(`آموزش کامل شد. اختلاف قیمت در این تمرین ${money(basePrice-offer.price)} تومانه؛ خریدی انجام نشده.`);
  celebrate();
}
$('#piqo-widget').addEventListener('click', openPanel);
$('#sort').addEventListener('change',renderOffers);
function updateLayoutIcon(grid) {
  $('#layout-toggle svg').innerHTML = grid
    ? '<path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round"/>'
    : '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>';
}
$('#layout-toggle').addEventListener('click',() => {
  const grid = $('#offer-list').classList.toggle('offer-grid');
  $('#layout-toggle').setAttribute('aria-pressed',String(grid));
  $('#layout-toggle').setAttribute('aria-label',grid ? 'نمایش فهرستی پیشنهادها' : 'نمایش شبکه‌ای پیشنهادها');
  updateLayoutIcon(grid);
  scheduleCoach();
});
$('#panel-close').addEventListener('click',() => reset());
$('#panel-help').addEventListener('click',() => $('#coach-title').focus({preventScroll:true}));
$('#coach-restart').addEventListener('click',() => reset());
document.querySelectorAll('.restart').forEach(button => button.addEventListener('click',() => reset()));
document.addEventListener('keydown',event => {
  if ($('#piqo-panel').hidden) return;
  if (event.key === 'Escape') { reset(); return; }
  if (event.key !== 'Tab') return;
  const controls = [...document.querySelectorAll('#piqo-panel button, #piqo-panel select, #coach button')].filter(el => !el.disabled && el.getClientRects().length);
  const first = controls[0], last = controls.at(-1);
  if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) { event.preventDefault(); first.focus(); }
});
$('.sample-buy').addEventListener('click',() => {
  $('#sample-toast').textContent = document.body.dataset.step === 'merchant'
    ? 'این خرید تمرینیه. برای مقایسهٔ واقعی، «حالا واقعی امتحانش کن» رو بزن.'
    : 'این صفحه تمرینیه؛ برای مقایسهٔ قیمت، روی پیکو بزن.';
  clearTimeout(toastTimer); $('#sample-toast').hidden = false;
  toastTimer = setTimeout(() => {$('#sample-toast').hidden = true;},5000);
});
// All tutorial fixtures are new; either choice includes the same offers.
const conditionLabel = document.createElement('label');
conditionLabel.innerHTML = '<span class="sr-only">وضعیت کالا</span><select id="condition"><option value="all">وضعیت کالا</option><option value="new">نو</option></select>';
$('.condition-chip').replaceWith(conditionLabel);
$('#condition').addEventListener('change',renderOffers);
reset(false);
