// ==============================
// Sidebar Script
// مدیریت UI و نمایش نتایج
// ==============================

// State
let currentProduct = null;
let allResults = [];
let activeFilter = "all";
let currentTabId = null;
let latestRequestId = 0;

// DOM Elements
const emptyState = document.getElementById("empty-state");
const loadingState = document.getElementById("loading-state");
const resultsState = document.getElementById("results-state");
const errorState = document.getElementById("error-state");
const currentProductEl = document.getElementById("current-product");
const productNameEl = document.getElementById("product-name");
const productPriceEl = document.getElementById("product-price");
const productImageEl = document.getElementById("product-image");
const resultsListEl = document.getElementById("results-list");
const resultsCountEl = document.getElementById("results-count");
const toggleGridBtn = document.getElementById("toggle-grid-btn");
const filterBarEl = document.querySelector(".filter-bar");
const iconGrid = document.getElementById("icon-grid");
const iconList = document.getElementById("icon-list");
const savingsBannerEl = document.getElementById("savings-banner");
const savingsTextEl = document.getElementById("savings-text");

// ==============================
// پیام‌های background
// ==============================
chrome.runtime.onMessage.addListener((message) => {
  if (!Number.isInteger(currentTabId) || message.tabId !== currentTabId) return;
  if (message.requestId && message.requestId < latestRequestId) return;

  if (message.type === "PRODUCT_UPDATED") {
    latestRequestId = message.requestId || latestRequestId;
    currentProduct = message.product;
    allResults = [];
    activeFilter = "all";
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === "all"));
    showProduct(message.product);
    showLoading();
    requestSearch(false);
  }

  if (message.type === "SEARCH_STARTED") {
    latestRequestId = message.requestId || latestRequestId;
    currentProduct = message.product;
    allResults = [];
    activeFilter = "all";
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === "all"));
    showProduct(message.product);
    showLoading();
  }

  if (message.type === "PRODUCT_METADATA_UPDATED") {
    currentProduct = message.product;
    showProduct(message.product);
  }

  if (message.type === "RESULTS_UPDATED") {
    latestRequestId = message.requestId || latestRequestId;
    allResults = message.results;
    
    // Prevent "No results found" flash during partial updates
    if (message.isPartial && (!allResults || allResults.length === 0)) {
       return;
    }
    
    showResults(message.results);
  }

  if (message.type === "SEARCH_FAILED") {
    latestRequestId = message.requestId || latestRequestId;
    showError();
  }
});

// ==============================
// بارگذاری اولیه از storage
// ==============================
chrome.runtime.sendMessage({ type: "GET_TAB_STATE" }, response => {
  if (chrome.runtime.lastError || !response) {
    showEmpty();
    return;
  }

  currentTabId = response.tabId;
  const state = response.state;
  if (state?.currentProduct) {
    latestRequestId = state.requestId || 0;
    currentProduct = state.currentProduct;
    showProduct(state.currentProduct);

    if (state.isLoading) {
      if (state.searchResults && state.searchResults.length > 0) {
        allResults = state.searchResults;
        showResults(state.searchResults);
      } else {
        showLoading();
      }
    } else if (state.error) {
      showError();
    } else if (state.searchResults) {
      allResults = state.searchResults;
      showResults(state.searchResults);
    } else {
      showLoading();
      requestSearch(false);
    }
  } else {
    showEmpty();
  }
});

// ==============================
// فیلترها
// ==============================
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderResults(getFilteredResults());
  });
});

// ==============================
// دکمه retry
// ==============================
document.getElementById("retry-btn")?.addEventListener("click", () => {
  if (currentProduct) {
    showLoading();
    requestSearch(true);
  }
});

function requestSearch(force) {
  if (!currentProduct || !Number.isInteger(currentTabId)) return;
  chrome.runtime.sendMessage({
    type: force ? "RETRY_SEARCH" : "START_SEARCH",
    product: currentProduct,
    tabId: currentTabId,
  });
}

// ==============================
// توابع نمایش
// ==============================
function showEmpty() {
  hide(loadingState, resultsState, errorState, currentProductEl);
  show(emptyState);
}

function showLoading() {
  hide(emptyState, resultsState, errorState);
  show(loadingState);
}

function showError() {
  hide(emptyState, loadingState, resultsState);
  show(errorState);
}

function setCurrentProductImage(candidates) {
  const urls = [...new Set((candidates || []).filter(url => typeof url === "string" && url.trim()))];
  let index = 0;

  const loadNext = () => {
    if (index >= urls.length) {
      productImageEl.style.display = "none";
      productImageEl.removeAttribute("src");
      return;
    }
    productImageEl.style.display = "block";
    productImageEl.src = urls[index++];
  };

  productImageEl.onload = () => {
    productImageEl.style.display = "block";
  };
  productImageEl.onerror = loadNext;
  loadNext();
}

function refreshCurrentProductImage(results = []) {
  if (!currentProduct) return;

  const sameStoreImage = results.find(item =>
    item.store === currentProduct.store && item.image
  )?.image;
  const firstResultImage = results.find(item => item.image)?.image;
  const pageImages = [currentProduct.image, ...(currentProduct.imageCandidates || [])];
  const candidates = currentProduct.source === "digikala"
    ? [sameStoreImage, ...pageImages, firstResultImage]
    : [...pageImages, sameStoreImage, firstResultImage];

  setCurrentProductImage(candidates);
}

function showProduct(product) {
  show(currentProductEl);
  productNameEl.textContent = product.name || "محصول ناشناخته";
  const storeEl = document.getElementById("product-store");
  if (storeEl) storeEl.textContent = product.store || "فروشگاه فعلی";

  if (product.price) {
    productPriceEl.innerHTML = formatPrice(product.price);
  } else {
    productPriceEl.textContent = "";
  }

  refreshCurrentProductImage(allResults);
}

function showResults(results) {
  hide(emptyState, loadingState, errorState);
  show(resultsState);
  refreshCurrentProductImage(results);

  const filtered = getFilteredResults();
  renderResults(filtered);

  if (savingsBannerEl) {
    if (currentProduct && currentProduct.price && results.length > 0) {
      const bestPrice = results[0].price;
      const currentPrice = currentProduct.price;

      savingsBannerEl.classList.remove("hidden");
      const savingsIcon = savingsBannerEl.querySelector(".savings-icon");
      
      if (bestPrice < currentPrice) {
        const saving = currentPrice - bestPrice;
        const savingPct = Math.round((saving / currentPrice) * 100);
        savingsBannerEl.style.color = "var(--error)";
        if (savingsIcon) savingsIcon.textContent = "💡";
        if (savingsTextEl) savingsTextEl.innerHTML = `میتوانی ${formatPrice(saving)} (${savingPct}٪) ارزان‌تر بخری!`;
      } else if (allResults.length > 0 && currentPrice === bestPrice) {
        savingsBannerEl.style.color = "var(--success)";
        if (savingsIcon) savingsIcon.textContent = "✨";
        if (savingsTextEl) savingsTextEl.textContent = "شما بهترین قیمت را پیدا کردید!";
      } else {
        savingsBannerEl.style.color = "var(--warning)";
        if (savingsIcon) savingsIcon.textContent = "⚖️";
        if (savingsTextEl) savingsTextEl.textContent = "این قیمت در بازار معمول است";
      }
    } else {
      savingsBannerEl.classList.add("hidden");
    }
  }
}

function updateFilterButtons() {
  const storeMap = {
    digikala: "دیجی‌کالا", torob: "ترب", emalls: "ایمالز", basalam: "باسلام",
    divar: "دیوار", sheypoor: "شیپور", snappshop: "اسنپ‌شاپ",
    khanoumi: "خانومی", technolife: "تکنولایف"
  };
  const availableStores = new Set(allResults.map(result => result.store));
  const currentStore = currentProduct?.store;

  document.querySelectorAll(".filter-btn").forEach(btn => {
    if (btn.dataset.filter === "all") {
      btn.style.display = "inline-block";
      return;
    }
    const store = storeMap[btn.dataset.filter];
    const visible = availableStores.has(store) && store !== currentStore;
    btn.style.display = visible ? "inline-block" : "none";
  });

  const activeButton = document.querySelector(`.filter-btn[data-filter="${activeFilter}"]`);
  if (activeFilter !== "all" && (!activeButton || activeButton.style.display === "none")) {
    activeFilter = "all";
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === "all"));
  }
}
function getFilteredResults() {
  let filtered = allResults;
  
  // 1. Exclude the current store from the results list
  if (currentProduct && currentProduct.store) {
    filtered = filtered.filter(item => item.store !== currentProduct.store);
  }

  // فقط فروشگاه‌هایی که نتیجه معتبر دارند نمایش داده می‌شوند
  updateFilterButtons();

  // 2. Apply active filter
  if (activeFilter !== "all") {
    const storeMap = {
      "digikala": "دیجی‌کالا",
      "torob": "ترب",
      "emalls": "ایمالز",
      "basalam": "باسلام",
      "divar": "دیوار",
      "sheypoor": "شیپور",
      "snappshop": "اسنپ‌شاپ",
      "khanoumi": "خانومی",
      "technolife": "تکنولایف"
    };
    filtered = filtered.filter(r => r.store === storeMap[activeFilter]);
  }
  
  return filtered;
}


function renderResults(results) {
  resultsCountEl.textContent = `${results.length} نتیجه`;

  if (results.length === 0) {
    resultsListEl.innerHTML = `
      <div style="text-align:center; padding:24px; color:#6B7280; font-size:12px;">
        <div style="font-size:32px;margin-bottom:8px">🔍</div>
        نتیجه‌ای یافت نشد
      </div>
    `;
    return;
  }

  // تفکیک آکبند و دست‌دوم
  const newItems = results.filter(r => !['دیوار', 'شیپور'].includes(r.store));
  const usedItems = results.filter(r => ['دیوار', 'شیپور'].includes(r.store));

  let html = '';

  if (newItems.length > 0) {
    
    html += newItems.map((item, index) => generateCardHtml(item, index === 0)).join("");
  }

  if (usedItems.length > 0) {
    
    html += usedItems.map((item) => generateCardHtml(item, false, true)).join("");
  }

  resultsListEl.innerHTML = html;
}

function generateCardHtml(item, isBest, isUsed = false) {
  const storeClass = getStoreClass(item.store);
  const priceClass = "result-price";

  const discountBadge = item.discount > 0
    ? `<span class="result-discount">−${item.discount}٪</span>`
    : "";

  const originalPrice = (item.originalPrice && item.originalPrice > item.price)
    ? `<span class="result-original-price">${formatPrice(item.originalPrice)}</span>`
    : "";

const ratingHtml = "";

  const unavailableHtml = !item.availability
    ? `<span class="unavailable-label">ناموجود</span>`
    : "";

  const bestBadge = "";

  const usedBadge = "";




  return `
    <a href="${item.url}" target="_blank" class="result-card ${!item.availability ? "unavailable" : ""}" rel="noopener">
            <img class="result-img" src="${item.image || ""}" alt=""
        onerror="this.style.display='none'" />
      <div class="result-content">
        <div class="result-name" title="${item.name}">${item.name}</div>
        <div class="result-store">
          <span class="store-name ${storeClass}">${item.store}${isUsed ? ' - کارکرده' : ''}</span>
          ${usedBadge}
          ${unavailableHtml}
        </div>
        <div class="result-price-row">
          <span class="${priceClass}">${formatPrice(item.price)}</span>
          ${originalPrice}
          ${discountBadge}
        </div>
        ${ratingHtml}
      </div>
    </a>
  `;
}
// ==============================
// توابع کمکی
// ==============================
function formatPrice(price) {
  if (!price) return "—";
  const num = new Intl.NumberFormat("fa-IR").format(price);
  return `<span dir="rtl" style="white-space: nowrap;">${num} <span class="currency-label">تومان</span></span>`;
}

function getStoreClass(storeName) {
  if (storeName === "دیجی‌کالا") return "digikala";
  if (storeName === "ترب") return "torob";
  if (storeName === "ایمالز") return "emalls";
  if (storeName === "باسلام") return "basalam";
  if (storeName === "دیوار") return "divar";
  if (storeName === "شیپور") return "sheypoor";
  if (storeName === "خانومی") return "khanoumi";
  if (storeName === "تکنولایف") return "technolife";
  return "";
}

function show(...elements) {
  elements.forEach(el => el?.classList.remove("hidden"));
}

function hide(...elements) {
  elements.forEach(el => el?.classList.add("hidden"));
}


// ==============================
// Popup Close Logic
// ==============================
document.getElementById('popup-close-btn')?.addEventListener('click', () => {
  // Tell the parent window (host page) to close this iframe
  window.parent.postMessage('CLOSE_PIQO_POPUP', '*');
});


// Layout Toggles
let isGridView = false;

// Load preferences
chrome.storage.local.get(["isGridView"], (data) => {
  if (data.isGridView !== undefined) {
    isGridView = data.isGridView;
    applyGridState();
  }
});

function applyGridState() {
  if (isGridView) {
    resultsListEl.classList.add("grid-view");
    iconGrid.classList.add("hidden");
    iconList.classList.remove("hidden");
  } else {
    resultsListEl.classList.remove("grid-view");
    iconList.classList.add("hidden");
    iconGrid.classList.remove("hidden");
  }
}

toggleGridBtn.addEventListener("click", () => {
  isGridView = !isGridView;
  applyGridState();
  chrome.storage.local.set({ isGridView });
});



// Drag to scroll for filter bar
const filterBarContainer = document.querySelector('.filter-bar');
let isDraggingFilter = false;
if (filterBarContainer) {
  let isDown = false;
  let startX;
  let scrollLeft;

  filterBarContainer.addEventListener('mousedown', (e) => {
    isDown = true;
    isDraggingFilter = false;
    startX = e.pageX - filterBarContainer.offsetLeft;
    scrollLeft = filterBarContainer.scrollLeft;
  });
  filterBarContainer.addEventListener('mouseleave', () => {
    isDown = false;
  });
  filterBarContainer.addEventListener('mouseup', () => {
    isDown = false;
    // We handle the click block in a capture phase click listener
  });
  filterBarContainer.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - filterBarContainer.offsetLeft;
    const walk = (x - startX) * 1.5; 
    if (Math.abs(walk) > 5) isDraggingFilter = true;
    filterBarContainer.scrollLeft = scrollLeft - walk;
  });
  
  // Prevent click if we were dragging
  filterBarContainer.addEventListener('click', (e) => {
    if (isDraggingFilter) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}
