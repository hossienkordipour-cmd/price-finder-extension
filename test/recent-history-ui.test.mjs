import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import puppeteer from 'puppeteer-core';

let html = await readFile(new URL('../sidebar/sidebar.html', import.meta.url), 'utf8');
let css = await readFile(new URL('../sidebar/sidebar.css', import.meta.url), 'utf8');
const script = await readFile(new URL('../sidebar/sidebar.js', import.meta.url), 'utf8');
const content = await readFile(new URL('../content/content.js', import.meta.url), 'utf8');
for (const font of ['Regular', 'SemiBold', 'Bold', 'ExtraBold']) {
  const file = `YekanBakhFaNum-${font}.woff2`;
  css = css.replace(`url('${file}')`, `url('data:font/woff2;base64,${(await readFile(new URL('../sidebar/' + file, import.meta.url))).toString('base64')}')`);
}
for (const asset of ['primary-logo.png', 'assets/logo-character.png']) {
  html = html.replace(`src="${asset}"`, `src="data:image/png;base64,${(await readFile(new URL('../sidebar/' + asset, import.meta.url))).toString('base64')}"`);
}
html = html.replace('<link rel="stylesheet" href="sidebar.css" />', `<style>${css}</style>`).replace('<script src="sidebar.js"></script>', '');
const browser = await puppeteer.launch({executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true});
const screenshotDir = join(tmpdir(), 'piqo-recent-history-preview');
await mkdir(screenshotDir, {recursive: true});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({width: 380, height: 760});
  await page.setRequestInterception(true);
  page.on('request', request => /^(data:|about:)/.test(request.url()) ? request.continue() : request.abort());
  await page.setContent(html);
  await page.evaluate(() => {
    window.historyFixture = [];
    window.failClear = false;
    window.pendingHistory = [];
    window.chrome = {runtime: {onMessage: {addListener() {}}, sendMessage(message, callback) {
      if (message.type === 'GET_RECENT_HISTORY') {
        if (window.delayHistory) window.pendingHistory.push(() => callback({history: window.historyFixture}));
        else callback({history: window.historyFixture});
      }
      if (message.type === 'GET_TAB_STATE') callback({tabId: 1, state: null});
      if (message.type === 'CLEAR_RECENT_HISTORY') callback({success: !window.failClear});
    }}, tabs: {query(_options, callback) {callback([{id: 1, url: 'https://example.com'}]);}}};
  });
  await page.addScriptTag({content: script});
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.$eval('#recent-history-title', el => el.textContent), 'آخرین محصولات دیده‌شده');
  assert.deepEqual(await page.$$eval('.guide-item-text', els => els.map(el => {
    const style = getComputedStyle(el); return [style.fontSize, style.fontWeight];
  })), [['13px', '600'], ['13px', '600']], 'Guide links retain their original SemiBold typography');
  assert.equal(await page.$eval('#recent-history-card', el => el.classList.contains('hidden')), false);
  assert.equal(await page.$eval('#recent-history-empty', el => el.classList.contains('hidden')), false);
  assert.equal(await page.$eval('#clear-history-btn', el => el.classList.contains('hidden')), true);
  assert.equal(await page.$('.recent-footer'), null, 'The removed footer must not remain in the card');
  assert.equal(await page.evaluate(() => document.querySelector('.guide-card').getBoundingClientRect().bottom < document.querySelector('#recent-history-card').getBoundingClientRect().top), true, 'Guide appears before recent history');
  assert.equal(await page.$eval('#history-guide-btn', el => getComputedStyle(el).backgroundColor), 'rgb(23, 23, 23)');
  assert.equal(await page.$eval('#history-guide-btn', el => getComputedStyle(el).color), 'rgb(255, 255, 255)');
  await page.screenshot({path: join(screenshotDir, 'empty.png')});
  for (const selector of ['.guide-item', '#history-guide-btn']) {
    assert.deepEqual(await page.$eval(selector, el => [el.getAttribute('href'), el.target, el.rel]),
      ['https://piqoo.ir/tutorial/', '_blank', 'noopener noreferrer'], 'Both guide links open the online tutorial safely');
  }
  const cover = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect x="9" y="2" width="30" height="44" rx="4" fill="#164c38"/><path d="M16 13h17M16 18h14M16 34h17" stroke="#c5e8b2" stroke-width="2"/></svg>');
  const entries = [
    {name: 'مجموعه کتاب The Lord of the Rings اثر جی. آر. آر. تالکین', store: 'zabanmehrpub.com', price: 2450000},
    {name: 'گوشی سامسونگ Galaxy A55 ظرفیت ۲۵۶ گیگابایت', store: 'دیجی‌کالا', price: 32490000},
    {name: 'هدفون بی‌سیم انکر مدل Soundcore با عنوان طولانی برای بررسی چیدمان', store: 'تکنولایف', price: 2990000},
    {name: 'Near To The Wild Heart', store: 'nbooks.ir', price: null},
  ].map((item, index) => ({...item, url: `https://example.com/product/${index}`, image: index === 0 ? cover : ''}));
  // A real HTTPS image is added in a controlled fixture, without external requests.
  entries[0].image = 'https://example.com/book.png';
  await page.evaluate(items => renderRecentHistory(items), entries);
  assert.equal(await page.$$eval('.recent-item', els => els.length), 4);
  assert.deepEqual(await page.$eval('#recent-history-title', el => {
    const style = getComputedStyle(el);
    return [style.fontSize, style.fontWeight, style.letterSpacing];
  }), ['13px', '600', 'normal'], 'History title matches the supplied Figma typography');
  assert.equal(await page.$eval('#clear-history-btn', el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
  assert.equal(await page.$eval('#clear-history-btn', el => getComputedStyle(el).color), 'rgb(107, 114, 128)');
  assert.equal(await page.$eval('#clear-history-btn', el => el.querySelector('svg, img')), null, 'Clear history is a text-only button');
  assert.equal(await page.$eval('#clear-history-btn', el => el.textContent.trim()), 'پاک کردن');
  const truncation = await page.$eval('.recent-item-name', el => ({
    whiteSpace: getComputedStyle(el).whiteSpace, ellipsis: getComputedStyle(el).textOverflow,
    overflows: el.scrollWidth > el.clientWidth, height: el.clientHeight,
    lineHeight: parseFloat(getComputedStyle(el).lineHeight), title: el.title, text: el.textContent,
  }));
  assert.equal(truncation.whiteSpace, 'nowrap');
  assert.equal(truncation.ellipsis, 'ellipsis');
  assert.equal(truncation.overflows, true, 'Long titles are visually truncated');
  assert.ok(truncation.height <= Math.ceil(truncation.lineHeight), 'Product title uses one line');
  assert.equal(truncation.title, truncation.text, 'Full name remains available in the tooltip');
  const cardLayout = await page.$eval('.recent-item', el => {
    const box = selector => {const r = el.querySelector(selector).getBoundingClientRect(); return {x:r.x, y:r.y, width:r.width, height:r.height};};
    return {height:el.getBoundingClientRect().height, picture:box('.recent-item-picture'), name:box('.recent-item-name'), price:box('.recent-item-price'), store:box('.recent-item-store')};
  });
  assert.equal(cardLayout.picture.width, 64);
  assert.equal(cardLayout.picture.height, 64);
  assert.ok(cardLayout.height <= 82, 'History rows stay compact without shrinking text');
  assert.deepEqual(await page.$eval('.recent-item', el => {
    const style = getComputedStyle(el);
    return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
  }), ['8px', '8px', '8px', '16px'], 'Card padding matches the supplied reference');
  assert.ok(cardLayout.picture.x > cardLayout.name.x, 'Large picture stays on the right');
  assert.ok(Math.abs((cardLayout.store.y + cardLayout.store.height / 2) - (cardLayout.price.y + cardLayout.price.height / 2)) < 2, 'Store and price face each other on the same row');
  assert.ok(cardLayout.price.x < cardLayout.store.x, 'Price sits opposite the store');
  assert.ok(cardLayout.price.y > cardLayout.name.y, 'Price stays below the product title');
  assert.ok(cardLayout.store.y > cardLayout.name.y, 'Store stays underneath the title');
  assert.equal(await page.$eval('.recent-item', el => el.rel), 'noopener noreferrer');
  const historyRest = await page.$eval('.recent-item', el => {
    const style = getComputedStyle(el); return {background:style.backgroundColor, border:style.borderColor};
  });
  await page.hover('.recent-item');
  await page.waitForFunction(() => Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.recent-item')).transform).a - 1.02) < 0.0001);
  assert.deepEqual(await page.$eval('.recent-item', el => {
    const style = getComputedStyle(el); return {background:style.backgroundColor, border:style.borderColor};
  }), historyRest, 'History hover scales like search cards without tinting the background or border');
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion', value:'reduce'}]);
  assert.equal(await page.$eval('.recent-item', el => getComputedStyle(el).transform), 'none');
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion', value:'no-preference'}]);
  await page.mouse.move(4, 4);
  const priceSpacing = await page.$eval('.recent-item-price', el => {
    const style = getComputedStyle(el);
    const range = document.createRange(); range.selectNode(el.firstChild);
    const naturalWidth = range.getBoundingClientRect().width;
    el.style.fontVariantNumeric = 'tabular-nums';
    const tabularWidth = range.getBoundingClientRect().width;
    el.style.removeProperty('font-variant-numeric');
    return {variant:getComputedStyle(el).fontVariantNumeric, spacing:style.letterSpacing, text:el.firstChild.textContent, naturalWidth, tabularWidth};
  });
  assert.equal(priceSpacing.variant, 'normal');
  assert.equal(priceSpacing.spacing, 'normal');
  assert.equal(priceSpacing.text, (2450000).toLocaleString('fa-IR'));
  assert.ok(priceSpacing.naturalWidth < priceSpacing.tabularWidth, 'Natural Yekan Bakh numerals avoid the extra tabular spacing');
  assert.ok((await page.$eval('.recent-item-price.is-unknown', el => el.textContent)).includes('نامشخص'));
  // Supply the already-created cover locally for a representative visual preview.
  await page.$eval('.recent-item-picture', (el, src) => {
    const image = document.createElement('img'); image.className = 'recent-item-img'; image.src = src; image.alt = ''; el.append(image);
  }, cover);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(4, 4);
  await page.screenshot({path: join(screenshotDir, 'populated.png')});
  for (const width of [380, 420, 600]) {
    await page.setViewport({width, height: 600});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'History does not overflow horizontally');
  }
  await page.evaluate(() => {window.failClear = true;});
  await page.click('#clear-history-btn');
  assert.equal(await page.$$eval('.recent-item', els => els.length), 4, 'Failed clear must preserve visible history');
  await page.evaluate(() => {window.failClear = false; window.delayHistory = true; loadRecentHistory();});
  await page.click('#clear-history-btn');
  await page.evaluate(() => window.pendingHistory.forEach(callback => callback()));
  assert.equal(await page.$$eval('.recent-item', els => els.length), 0, 'A late history response cannot undo clear');
  assert.equal(await page.$eval('#recent-empty-title', el => el.textContent), 'سابقه‌ات پاک شد');
  assert.equal(await page.$eval('#recent-history-status', el => el.textContent), '');
  const unsafe = [{name: 'unsafe', url: 'javascript:alert(1)'}, {name: '<img src=x onerror=alert(1)>', url: 'https://example.com/safe', store: '<script>bad</script>', price: 1234}];
  await page.evaluate(items => renderRecentHistory(items), unsafe);
  assert.equal(await page.$$eval('.recent-item', els => els.length), 1);
  assert.equal(await page.$$eval('.recent-item-info img, .recent-item-info script', els => els.length), 0, 'Stored text is never injected as HTML');
  assert.deepEqual(errors, []);
  assert.deepEqual(await page.$eval('#popup-close-btn', el => {
    const r = el.getBoundingClientRect(); return [r.width, r.height];
  }), [32, 32]);
  assert.deepEqual(await page.$$eval('.header-actions svg', els => els.map(el => getComputedStyle(el).stroke)),
    ['rgb(97, 101, 108)', 'rgb(97, 101, 108)', 'rgb(97, 101, 108)'], 'Header icons share the supplied help icon color');
  assert.deepEqual(await page.$$eval('.header-actions svg', els => els.map(el => {
    const style = getComputedStyle(el); return [style.width, style.height];
  })), [['14px', '14px'], ['14px', '14px'], ['14px', '14px']]);
  assert.equal(await page.$eval('#guide-nav-btn', el => el.disabled), true);
  await page.evaluate(() => {
    currentProduct = {name:'محصول آزمایشی', price:100000, store:'تست'};
    showLoading();
  });
  await page.click('#guide-nav-btn');
  assert.equal(await page.$eval('#guide-state', el => getComputedStyle(el).display), 'flex');
  assert.equal(await page.$eval('#current-product', el => getComputedStyle(el).display), 'none');
  assert.equal(await page.$eval('#guide-nav-btn', el => el.getAttribute('aria-label')), 'بازگشت به محصول و نتایج');
  const guideHeader = await page.evaluate(() => {
    const rect = selector => {const r = document.querySelector(selector).getBoundingClientRect(); return {x:r.x, center:r.x+r.width/2};};
    return {back:rect('#guide-nav-btn'), logo:rect('.header-logo'), close:rect('#popup-close-btn'), header:rect('.header')};
  });
  assert.ok(guideHeader.close.x < guideHeader.logo.x && guideHeader.logo.x < guideHeader.back.x, 'Guide header has close on left and back on right');
  assert.ok(Math.abs(guideHeader.logo.center-guideHeader.header.center) < 1, 'Guide logo is centered in the panel');
  await page.evaluate(() => renderResults([{name:'نتیجه جدید', store:'تست', price:90000, url:'https://example.com/new', condition:'new'}]));
  assert.equal(await page.$eval('#results-state', el => getComputedStyle(el).display), 'none', 'Async results do not dismiss the guide');
  await page.focus('#guide-nav-btn');
  await page.keyboard.press('Enter');
  assert.notEqual(await page.$eval('#results-state', el => getComputedStyle(el).display), 'none');
  assert.equal(await page.$eval('body', el => el.classList.contains('guide-page')), false, 'Product header restores its original layout');
  assert.ok((await page.$eval('#results-list', el => el.textContent)).includes('نتیجه جدید'));
  await page.click('#guide-nav-btn');
  await page.evaluate(() => {currentProduct = null; updateEmptyOrGuideState();});
  assert.equal(await page.$eval('#guide-nav-btn', el => el.disabled), true);
  assert.equal(await page.$eval('body', el => el.classList.contains('guide-view-open')), false, 'Navigation clears the old return destination');
  const affiliateEntries = [
    {name:'دیما', store:'technolife.com', url:'https://www.technolife.com/product-123/test'},
    {name:'باسلام', store:'basalam.com', url:'https://basalam.com/shop/product/123'},
    {name:'افیلیو', url:'https://www.digikala.com/product/dkp-123/', affiliateUrl:'https://publisher.affilio.ir/click?signature=original'},
    {name:'عادی', url:'https://example.com/product/123'},
  ];
  await page.evaluate(items => renderRecentHistory(items), affiliateEntries);
  const affiliateHrefs = await page.$$eval('.recent-item', els => els.map(el => el.href));
  assert.equal(new URL(affiliateHrefs[0]).hostname, 'deemanetwork.com');
  assert.equal(new URL(affiliateHrefs[1]).hostname, 'a.bslm.ir');
  assert.equal(affiliateHrefs[2], affiliateEntries[2].affiliateUrl);
  assert.equal(affiliateHrefs[3], affiliateEntries[3].url);
  const popupPage = await browser.newPage();
  await popupPage.setContent('<div>product</div>');
  await popupPage.evaluate(() => {window.openEvents = []; window.chrome = {runtime: {getURL() {return 'about:blank';}, sendMessage(message) {window.openEvents.push(message); return Promise.resolve();}}};});
  await popupPage.addScriptTag({content: content.slice(content.indexOf('function togglePiqoPopup('), content.indexOf('// Listen for close request from the iframe'))});
  await popupPage.evaluate(() => {togglePiqoPopup(false); togglePiqoPopup(false);});
  assert.equal(await popupPage.evaluate(() => window.openEvents.filter(event => event.type === 'PIQO_OPENED').length), 1, 'Only opening the panel sends history intent, not closing');
  console.log('History UI: empty/populated/cleared, guide, clear failure/races, safe content, responsive layout and explicit open passed');
  console.log(`Previews: ${screenshotDir}`);
} finally {await browser.close();}
