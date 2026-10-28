
// The host viewport, not this 380px iframe's width, decides sheet presentation.
const sheetHandle = document.getElementById('sheet-handle');
function applyPiqoPanelLayout(mobile, expanded = false) {
  document.body.classList.toggle('mobile-sheet',mobile);
  document.documentElement.classList.toggle('mobile-sheet-root',mobile);
  sheetHandle?.setAttribute('aria-expanded',String(expanded));
  sheetHandle?.setAttribute('aria-label',expanded ? 'کوچک‌کردن پنل پیکو' : 'بزرگ‌کردن پنل پیکو');
}
applyPiqoPanelLayout(window.parent !== window && new URLSearchParams(location.search).get('presentation') === 'sheet');
window.addEventListener('message',event=>{
  if (event.source !== window.parent || event.data?.type !== 'PIQO_PANEL_LAYOUT' || typeof event.data.mobile !== 'boolean') return;
  applyPiqoPanelLayout(event.data.mobile,Boolean(event.data.expanded));
});
sheetHandle?.addEventListener('click',()=>window.parent.postMessage('TOGGLE_PIQO_SHEET','*'));
let sheetDrag = null;
sheetHandle?.addEventListener('pointerdown',event=>{
  if (!document.body.classList.contains('mobile-sheet') || event.button !== 0) return;
  sheetDrag = {id:event.pointerId,y:event.clientY};
  sheetHandle.setPointerCapture(event.pointerId);
});
sheetHandle?.addEventListener('pointerup',event=>{
  if (!sheetDrag || sheetDrag.id !== event.pointerId) return;
  const distance = event.clientY-sheetDrag.y;
  sheetDrag = null;
  if (Math.abs(distance)<48) return; // A tap uses the accessible click action.
  // A completed swipe must not also trigger the synthetic click.
  sheetHandle.addEventListener('click',event=>event.stopImmediatePropagation(),{capture:true,once:true});
  if (distance>72) window.parent.postMessage('CLOSE_PIQO_POPUP','*');
  else if (distance < -48 && sheetHandle.getAttribute('aria-expanded') !== 'true') window.parent.postMessage('TOGGLE_PIQO_SHEET','*');
});
sheetHandle?.addEventListener('pointercancel',()=>{sheetDrag=null;});
document.addEventListener('keydown',event=>{
  if (event.key === 'Escape' && window.parent !== window) window.parent.postMessage('CLOSE_PIQO_POPUP','*');
});

let currentProduct = null;
let allResults = [];
let currentTabId = null;
let latestRequestId = 0;
let diagnosticSearchId = null;
let presentedCount = 0;
let resultsVisibleInViewport = false;
let guideViewOpen = false;
const guideNavBtn = document.getElementById('guide-nav-btn');

function updateGuideNavigation() {
  if (!guideNavBtn) return;
  if (!currentProduct) guideViewOpen = false;
  document.body.classList.toggle('guide-view-open', guideViewOpen);
  document.body.classList.toggle('guide-page', guideViewOpen || !currentProduct);
  guideNavBtn.disabled = !currentProduct;
  const label = guideViewOpen ? 'بازگشت به محصول و نتایج' : 'راهنما و سابقه';
  guideNavBtn.setAttribute('aria-label', label);
  guideNavBtn.setAttribute('title', label);
  guideNavBtn.setAttribute('aria-pressed', String(guideViewOpen));
}

const emptyState = document.getElementById("empty-state");
const guideState = document.getElementById("guide-state");
const recentHistoryCard = document.getElementById("recent-history-card");
const recentHistoryList = document.getElementById("recent-history-list");
const clearHistoryBtn = document.getElementById("clear-history-btn");
const recentHistoryEmpty = document.getElementById("recent-history-empty");
let recentHistoryVersion = 0;
const loadingState = document.getElementById("loading-state");
const resultsState = document.getElementById("results-state");
const errorState = document.getElementById("error-state");
const currentProductEl = document.getElementById("current-product");
const resultsListEl = document.getElementById("results-list");
const sortFilter = document.getElementById("sort-filter");
const conditionFilter = document.getElementById("condition-filter");

function acknowledgeResultsPresented() {
  if (!presentedCount || !diagnosticSearchId || !resultsVisibleInViewport) return;
  const renderedSearchId = diagnosticSearchId;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (document.visibilityState !== 'visible' || !resultsVisibleInViewport || guideViewOpen || renderedSearchId !== diagnosticSearchId) return;
    chrome.runtime.sendMessage({ type: 'RESULTS_PRESENTED', tabId: currentTabId, searchId: renderedSearchId, count: presentedCount }).catch(() => {});
  }));
}
new IntersectionObserver(entries => {
  resultsVisibleInViewport = entries.some(entry => entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0);
  if (resultsVisibleInViewport) acknowledgeResultsPresented();
}).observe(resultsListEl);
document.addEventListener('visibilitychange', acknowledgeResultsPresented);

let currentTabUrl = "";

function isGoogleUrl(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === 'google.com' || host === 'www.google.com' || host.endsWith('.google.com') || host.includes('google.');
  } catch (e) {
    return false;
  }
}

function loadRecentHistory() {
  if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.sendMessage) return;
  const version = ++recentHistoryVersion;
  chrome.runtime.sendMessage({ type: "GET_RECENT_HISTORY" }, (response) => {
    if (version !== recentHistoryVersion) return;
    if (chrome.runtime.lastError || !response) return;
    const items = response.history || [];
    renderRecentHistory(items);
  });
}

function renderRecentHistory(items, cleared = false) {
  if (typeof recentHistoryCard === "undefined" || !recentHistoryCard || !recentHistoryList) return;
  const safeUrl = value => {
    try { const url = new URL(value); return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : ""; }
    catch { return ""; }
  };
  const displayItems = (Array.isArray(items) ? items : []).filter(item => item?.name && safeUrl(item.url)).slice(0, 4);
  recentHistoryList.replaceChildren();
  const boxIcon = '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z"/><path d="m4 7 8 4 8-4M12 11v10"/></svg>';
  for (const item of displayItems) {
    const row = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'recent-item';
    const host = new URL(item.url).hostname.replace(/^www\./, '');
    const affiliateStore = ({'basalam.com': 'basalam', 'technolife.com': 'technolife', 'khanoumi.com': 'khanoumi', 'gooshishop.com': 'gooshishop'})[host];
    link.href = safeUrl(item.affiliateUrl) || safeUrl(getAffiliateUrl(affiliateStore || item.store || item.source, item.url)) || safeUrl(item.url);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const picture = document.createElement('span');
    picture.className = 'recent-item-picture';
    picture.innerHTML = boxIcon;
    if (safeUrl(item.image)) {
      const image = document.createElement('img');
      image.className = 'recent-item-img'; image.alt = ''; image.width = 64; image.height = 64;
      image.src = safeUrl(item.image); image.loading = 'lazy';
      image.addEventListener('error', () => image.remove(), { once: true });
      picture.append(image);
    }
    const info = document.createElement('div'); info.className = 'recent-item-info';
    const name = document.createElement('div'); name.className = 'recent-item-name';
    name.textContent = item.name; name.title = item.name; name.dir = 'auto';
    const meta = document.createElement('div'); meta.className = 'recent-item-meta';
    const store = document.createElement('span'); store.className = 'recent-item-store';
    store.textContent = item.store || 'فروشگاه'; store.dir = 'auto'; store.title = store.textContent;
    const price = document.createElement('div'); price.className = 'recent-item-price';
    if (Number.isFinite(item.price) && item.price > 0) {
      price.textContent = formatPrice(item.price);
      const unit = document.createElement('span'); unit.textContent = 'تومان'; price.append(unit);
    } else { price.textContent = 'قیمت نامشخص'; price.classList.add('is-unknown'); }
    const headline = document.createElement('div'); headline.className = 'recent-item-headline';
    headline.append(name); meta.append(store, price); info.append(headline, meta);
    link.append(picture, info); row.append(link); recentHistoryList.append(row);
  }
  const hasItems = displayItems.length > 0;
  recentHistoryList.classList.toggle('hidden', !hasItems);
  recentHistoryEmpty?.classList.toggle('hidden', hasItems);
  clearHistoryBtn?.classList.toggle('hidden', !hasItems);
  const emptyTitle = document.getElementById('recent-empty-title');
  if (emptyTitle) emptyTitle.textContent = cleared ? 'سابقه‌ات پاک شد' : 'هنوز محصولی اینجا نیست';
  const status = document.getElementById('recent-history-status');
  if (status) status.textContent = '';
  recentHistoryCard.classList.remove("hidden");
}

function updateEmptyOrGuideState() {
  updateGuideNavigation();
  if (currentProduct) {
    if (typeof guideState !== "undefined" && guideState) guideState.classList.add("hidden");
    return;
  }
  if (typeof emptyState !== "undefined" && emptyState) emptyState.classList.add("hidden");
  if (typeof guideState !== "undefined" && guideState) {
    guideState.classList.remove("hidden");
    if (typeof loadRecentHistory === "function") loadRecentHistory();
  }
}

// Initial load
updateEmptyOrGuideState();

// ==========================================
// سیستم افیلیت مارکتینگ (همکاری در فروش)
// ==========================================
function getAffiliateUrl(store, originalUrl) {
  if (!originalUrl) return "#";
  
    if (store === "باسلام" || store === "basalam") {
    // کد افیلیت باسلام
    try {
      // استفاده از btoa برای انکد کردن آدرس مقصد به Base64
      const b64 = btoa(unescape(encodeURIComponent(originalUrl)));
      return `https://a.bslm.ir/api/v1/tracking/click/g/466ef6e231e4f71cf496b350123065d3?b64=${b64}`;
    } catch (e) {
      console.error("Base64 encoding failed for URL:", originalUrl);
      return originalUrl;
    }
  }

  // دیما: تکنولایف، خانومی و گوشی شاپ
  if (store === "تکنولایف" || store === "خانومی" || store === "گوشی شاپ" || store === "technolife" || store === "khanoumi" || store === "gooshishop") {
    if (originalUrl.includes("deemanetwork.com")) return originalUrl;
    try {
      // Match the background encoder, including Persian product paths.
      const b64 = btoa(unescape(encodeURIComponent(new URL(originalUrl).href)));
      return `https://deemanetwork.com/click/d/6e262f3e_1645_4f22_a310_e67585054a62/${encodeURIComponent(b64)}`;
    } catch (e) {
      console.error("Deema Base64 encoding failed for URL:", originalUrl);
      return originalUrl;
    }
  }
  
  // دیجی‌کالا و سایر پلتفرم‌ها رو هم میشه اینجا اضافه کرد
  
  return originalUrl;
}

document.getElementById("popup-close-btn").addEventListener("click", () => {
  window.parent.postMessage("CLOSE_PIQO_POPUP", "*");
});
guideNavBtn?.addEventListener('click', () => {
  if (!currentProduct) return;
  guideViewOpen = !guideViewOpen;
  updateGuideNavigation();
  if (guideViewOpen) loadRecentHistory();
  window.scrollTo(0, 0);
});

const guideToggle = document.getElementById("guide-accordion-toggle");
if (guideToggle) {
  guideToggle.addEventListener("click", () => {
    const card = guideToggle.closest(".guide-card");
    if (card) guideToggle.setAttribute('aria-expanded', String(!card.classList.toggle("collapsed")));
  });
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      ++recentHistoryVersion;
      clearHistoryBtn.disabled = true;
      chrome.runtime.sendMessage({ type: "CLEAR_RECENT_HISTORY" }, (response) => {
        clearHistoryBtn.disabled = false;
        if (chrome.runtime.lastError || !response?.success) {
          const status = document.getElementById('recent-history-status');
          if (status) status.textContent = 'سابقه پاک نشد؛ دوباره امتحان کن.';
          return;
        }
        renderRecentHistory([], true);
        document.getElementById('history-guide-btn')?.focus();
      });
    }
  });
}



document.getElementById("manual-search-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = document.getElementById("manual-search-input").value.trim();
  if (!query) return;
  currentProduct = { name: query, price: null, image: null, store: "جستجوی دستی", source: "manual" };
  chrome.runtime.sendMessage({ type: "START_SEARCH", tabId: currentTabId, product: currentProduct });
});

// Custom dropdown logic
document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
  const header = dropdown.querySelector('.dropdown-header');
  const list = dropdown.querySelector('.dropdown-list');
  const items = dropdown.querySelectorAll('.dropdown-item');
  const isMulti = dropdown.classList.contains('multiple');
  const clearBtn = dropdown.querySelector('.clear-filter');
  const headerText = dropdown.querySelector('.header-text');
  
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      items.forEach(i => i.classList.add('selected')); // all selected
      headerText.innerText = 'وضعیت کالا';
      clearBtn.classList.add('hidden');
      renderResults(allResults, false);
    });
  }

  header.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.dropdown-list').forEach(l => {
      if (l !== list) l.classList.add('hidden');
    });
    list.classList.toggle('hidden');
  });

  items.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      
      if (!isMulti) {
        dropdown.dataset.value = item.dataset.value;
        header.innerHTML = item.innerHTML;
        items.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        list.classList.add('hidden');
      } else {
        item.classList.toggle('selected');
        
        // Prevent deselecting both (if user tries to deselect the last one, block it)
        const selectedItems = Array.from(items).filter(i => i.classList.contains('selected'));
        if (selectedItems.length === 0) {
          item.classList.add('selected');
          return;
        }
        
        if (selectedItems.length === 1) {
          const valText = selectedItems[0].querySelector('span').innerText;
          headerText.innerText = 'وضعیت کالا: ' + valText;
          clearBtn.classList.remove('hidden');
        } else {
          headerText.innerText = 'وضعیت کالا';
          clearBtn.classList.add('hidden');
        }
      }
      
      renderResults(allResults, false);
    });
  });
});

document.addEventListener('click', () => {
  document.querySelectorAll('.dropdown-list').forEach(l => l.classList.add('hidden'));
});

chrome.runtime.onMessage.addListener((message) => {
  if (!Number.isInteger(currentTabId) || message.tabId !== currentTabId) return;
  if (message.requestId && message.requestId < latestRequestId) return;

  if (message.type === 'PAGE_CHANGED') {
    latestRequestId = message.requestId || latestRequestId;
    currentProduct = null;
    allResults = [];
    currentProductEl.innerHTML = '';
    currentProductEl.classList.add('hidden');
    resultsListEl.innerHTML = '';
    resultsState.classList.add('hidden');
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    if (typeof updateEmptyOrGuideState === 'function') {
      updateEmptyOrGuideState();
    } else {
      emptyState.classList.remove('hidden');
    }
    return;
  }

  if (message.type === "PRODUCT_METADATA_UPDATED") {
    currentProduct = message.product;
    currentProductEl.innerHTML = generateCardHtml(currentProduct, true);
    currentProductEl.classList.remove("hidden");
    if (!resultsState.classList.contains("hidden")) renderResults(allResults, !loadingState.classList.contains("hidden"));
  }

  if (message.type === "PRODUCT_UPDATED") {
    latestRequestId = message.requestId || latestRequestId;
    currentProduct = message.product;
    allResults = [];
    showLoading();
    chrome.runtime.sendMessage({ type: "START_SEARCH", tabId: currentTabId, product: currentProduct });
  }

  if (message.type === "SEARCH_STARTED") {
    diagnosticSearchId = message.searchId || null;
    latestRequestId = message.requestId || latestRequestId;
    currentProduct = message.product || currentProduct;
    allResults = [];
    showLoading();
  }

  if (message.type === "RESULTS_UPDATED") {
    diagnosticSearchId = message.searchId || diagnosticSearchId;
    allResults = message.results || [];
    renderResults(allResults, message.isPartial);
    if (!message.isPartial) window.piqoOfferSurvey?.();
  }

  if (message.type === "SEARCH_ERROR" || message.type === "SEARCH_FAILED") {
    showError();
  }
});

function formatPrice(p) {
  if (!p || p <= 0) return "نامشخص";
  return p.toLocaleString("fa-IR");
}

function generateCardHtml(item, isBase = false) {
  let discountHtml = "";
  if (!isBase && !item.suppressSavings && currentProduct && currentProduct.price && item.price < currentProduct.price) {
    const diff = Math.round(((currentProduct.price - item.price) / currentProduct.price) * 100);
    if (diff > 0) {
      discountHtml = `<div class="card-discount">${diff.toLocaleString("fa-IR")}٪ ارزان تر</div>`;
    }
  }

  const storeText = item.condition === "used" ? `${item.store} - کارکرده` : item.store;

  const tag = isBase ? 'div' : 'a';
  const finalUrl = getAffiliateUrl(item.store || item.source, item.url);
  const tagAttrs = isBase ? '' : `href="${finalUrl}" target="_blank"`;
  return `
    <${tag} ${tagAttrs} class="result-card${isBase ? ' base-product-card' : ''}">
      <div class="card-image-wrapper">
        <img class="card-img" src="${item.image || 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23d1d5db%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Crect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22 ry=%222%22%3E%3C/rect%3E%3Ccircle cx=%228.5%22 cy=%228.5%22 r=%221.5%22%3E%3C/circle%3E%3Cpolyline points=%2221 15 16 10 5 21%22%3E%3C/polyline%3E%3C/svg%3E'}" alt="" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23d1d5db%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Crect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22 ry=%222%22%3E%3C/rect%3E%3Ccircle cx=%228.5%22 cy=%228.5%22 r=%221.5%22%3E%3C/circle%3E%3Cpolyline points=%2221 15 16 10 5 21%22%3E%3C/polyline%3E%3C/svg%3E'" />
        ${discountHtml ? discountHtml.replace('class="card-discount"', 'class="card-discount overlay-discount"') : ''}
      </div>
      <div class="card-content">
        <h3 class="card-title">${item.name || currentProduct?.name || 'کالا'}</h3>
        <div class="card-store-row">
          <div class="card-store">${isBase ? item.store : storeText}</div>
        </div>
        ${item.price && item.price > 0 ? `
        <div class="card-bottom">
          <div class="card-price">${formatPrice(item.price)}<span>تومان</span></div>
          ${discountHtml ? discountHtml.replace('class="card-discount"', 'class="card-discount bottom-discount"') : ''}
        </div>
        ` : (isBase ? '<div class="card-bottom"><div class="card-price">قیمت نامشخص</div></div>' : '')}
      </div>
    </${tag}>
  `;
}

function showLoading() {
  updateGuideNavigation();
  emptyState.classList.add("hidden");
  if (typeof guideState !== "undefined" && guideState) guideState.classList.add("hidden");
  errorState.classList.add("hidden");
  resultsState.classList.add("hidden");
  loadingState.classList.remove("hidden");
  
  if (currentProduct) {
    currentProductEl.innerHTML = generateCardHtml(currentProduct, true);
    currentProductEl.classList.remove("hidden");
  } else {
    currentProductEl.classList.add("hidden");
  }
}

function showError() {
  updateGuideNavigation();
  emptyState.classList.add("hidden");
  if (typeof guideState !== "undefined" && guideState) guideState.classList.add("hidden");
  loadingState.classList.add("hidden");
  resultsState.classList.add("hidden");
  errorState.classList.remove("hidden");
}

function generateSkeletonHtml() {
  return `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-content">
        <div class="skeleton-line" style="width: 80%;"></div>
        <div class="skeleton-line" style="width: 40%; margin-bottom: 12px;"></div>
        <div class="skeleton-line" style="width: 60%;"></div>
      </div>
    </div>
  `;
}

function renderResults(results, isLoading = false) {
  updateGuideNavigation();
  allResults = results || [];
  if (currentProduct) {
    currentProductEl.innerHTML = generateCardHtml(currentProduct, true);
    currentProductEl.classList.remove("hidden");
  } else {
    currentProductEl.classList.add("hidden");
  }

  emptyState.classList.add("hidden");
  if (typeof guideState !== "undefined" && guideState) guideState.classList.add("hidden");
  loadingState.classList.add("hidden");
  errorState.classList.add("hidden");
  resultsState.classList.remove("hidden");

  let filtered = [...results];
  const condItems = Array.from(document.querySelectorAll('#condition-filter .dropdown-item.selected')).map(i => i.dataset.value);
  if (!condItems.includes("new")) filtered = filtered.filter(r => r.condition === "used");
  if (!condItems.includes("used")) filtered = filtered.filter(r => r.condition !== "used");

  const sort = sortFilter.dataset.value || "match";
  const sortablePrice = item => Number.isFinite(item.price) && item.price > 0 ? item.price : Infinity;
  if (sort === "cheap") {
    filtered.sort((a, b) => sortablePrice(a) - sortablePrice(b));
  } else if (sort === "match") {
    filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0) || sortablePrice(a) - sortablePrice(b));
  }

  // Update results count
  const countEl = document.getElementById("results-count");
  if (countEl) {
    countEl.innerText = (isLoading && filtered.length === 0) ? "..." : filtered.length.toLocaleString("fa-IR") + " محصول";
  }

  let html = filtered.map(r => generateCardHtml(r, false)).join("");
  
  if (isLoading) {
    html += generateSkeletonHtml() + generateSkeletonHtml();
  } else if (allResults.length === 0 && !isLoading) {
    html = `
      <div class="empty-view">
        <img src="assets/empty-box.png" alt="No Results" class="empty-illustration">
        <div class="empty-title">همه‌جا رو گشتیم، نبود!</div>
        <div class="empty-subtitle">این محصول فعلاً تو فروشگاه‌ها پیدا نشد. یه محصول دیگه رو امتحان کن.</div>
      </div>`;
  } else if (filtered.length === 0 && !isLoading) {
    html = `
      <div class="empty-view">
        <img src="assets/empty-filter.png" alt="No Filter Results" class="empty-illustration">
        <div class="empty-title">با این فیلترها چیزی پیدا نکردیم!</div>
        <div class="empty-subtitle">فیلترها رو تغییر بده یا بعضی‌هاشون رو بردار تا گزینه‌های بیشتری ببینی.</div>
        <button class="clear-filters-btn" id="btn-clear-filters">پاک کردن فیلترها</button>
      </div>`;
  }
  
  resultsListEl.innerHTML = html;
  // Two animation frames acknowledge actual visible rendering, not receipt.
  if (typeof acknowledgeResultsPresented === 'function') {
    presentedCount = filtered.length;
    acknowledgeResultsPresented();
  }
  
  const clearBtn = document.getElementById('btn-clear-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      // Reset Sort
      const sortDropdown = document.getElementById('sort-filter');
      sortDropdown.dataset.value = 'match';
      sortDropdown.querySelector('.header-text') ? sortDropdown.querySelector('.header-text').innerText = 'مرتبط ترین' : sortDropdown.querySelector('.dropdown-header').innerText = 'مرتبط ترین';
      sortDropdown.querySelectorAll('.dropdown-item').forEach(i => {
        i.classList.remove('selected');
        if (i.dataset.value === 'match') i.classList.add('selected');
      });

      // Reset Condition
      const condDropdown = document.getElementById('condition-filter');
      condDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.add('selected'));
      const condClearBtn = condDropdown.querySelector('.clear-filter');
      if (condClearBtn) condClearBtn.classList.add('hidden');
      const condHeaderText = condDropdown.querySelector('.header-text');
      if (condHeaderText) condHeaderText.innerText = 'وضعیت کالا';
      
      renderResults(allResults, false);
    });
  }
}

if (typeof chrome !== "undefined" && chrome.tabs && typeof chrome.tabs.query === "function") {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      currentTabUrl = tabs[0].url;
      if (!currentProduct && (loadingState.classList.contains("hidden") && resultsState.classList.contains("hidden"))) {
        updateEmptyOrGuideState();
      }
    }
  });
}

chrome.runtime.sendMessage({ type: "GET_TAB_STATE" }, (response) => {
  if (chrome.runtime.lastError || !response) return;
  if (response.tabId) currentTabId = response.tabId;
  if (response.url) {
    currentTabUrl = response.url;
  }
  const state = response.state;
  if (state?.requestId < latestRequestId) return;
  if (state && state.currentProduct) {
    latestRequestId = state.requestId || 0;
    diagnosticSearchId = state.searchId || null;
    currentProduct = state.currentProduct;
    if (state.isLoading) {
      showLoading();
      if (state.searchResults && state.searchResults.length > 0) {
        allResults = state.searchResults;
        renderResults(allResults, true);
      }
    } else if (Array.isArray(state.searchResults)) {
      allResults = state.searchResults;
      renderResults(allResults, false);
    } else {
      showLoading();
      chrome.runtime.sendMessage({ type: "START_SEARCH", tabId: currentTabId, product: currentProduct });
    }
  } else if (!currentProduct) {
    updateEmptyOrGuideState();
  }
});


const gridIconBtn = document.querySelector(".grid-icon-btn");
const gridSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>`;
const listSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>`;

gridIconBtn.addEventListener("click", () => {
  // Disable animation if empty state is showing
  if (resultsListEl.querySelector('.empty-view')) {
    const isGrid = resultsListEl.classList.toggle("grid-view");
    gridIconBtn.innerHTML = isGrid ? listSvg : gridSvg;
    return;
  }

  resultsListEl.classList.add("switching-layout");
  setTimeout(() => {
    const isGrid = resultsListEl.classList.toggle("grid-view");
    gridIconBtn.innerHTML = isGrid ? listSvg : gridSvg;
    
    // Slight delay before fading back in to ensure DOM is ready
    requestAnimationFrame(() => {
      resultsListEl.classList.remove("switching-layout");
    });
  }, 150);
});
