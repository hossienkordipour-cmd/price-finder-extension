// ==============================
// Sidebar Script
// مدیریت UI و نمایش نتایج
// ==============================

// State
let currentProduct = null;
let allResults = [];
let activeFilter = "all";

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
  if (message.type === "PRODUCT_UPDATED") {
    currentProduct = message.product;
    showProduct(message.product);
    showLoading();
  }

  if (message.type === "RESULTS_UPDATED") {
    allResults = message.results;
    showResults(message.results);
  }
});

// ==============================
// بارگذاری اولیه از storage
// ==============================
chrome.storage.local.get(["currentProduct", "searchResults", "isLoading"], (data) => {
  if (data.currentProduct) {
    currentProduct = data.currentProduct;
    showProduct(data.currentProduct);

    if (data.isLoading) {
      showLoading();
    } else if (data.searchResults) {
      allResults = data.searchResults;
      showResults(data.searchResults);
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
    chrome.runtime.sendMessage({
      type: "RETRY_SEARCH",
      product: currentProduct
    });
  }
});

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

  if (product.image) {
    productImageEl.src = product.image;
    productImageEl.style.display = "block";
  } else {
    productImageEl.style.display = "none";
  }
}

function showResults(results) {
  hide(emptyState, loadingState, errorState);
  show(resultsState);

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

function getFilteredResults() {
  let filtered = allResults;
  
  // 1. Exclude the current store from the results list
  if (currentProduct && currentProduct.store) {
    filtered = filtered.filter(item => item.store !== currentProduct.store);
  }

  // Hide filter button for current store
  document.querySelectorAll(".filter-btn").forEach(btn => {
    if (btn.dataset.filter === "all") return;
    const storeMap = {
      "digikala": "دیجی‌کالا",
      "torob": "ترب",
      "emalls": "ایمالز",
      "basalam": "باسلام",
      "divar": "دیوار",
      "sheypoor": "شیپور",
      "snappshop": "اسنپ‌شاپ"
    };
    if (currentProduct && storeMap[btn.dataset.filter] === currentProduct.store) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'inline-block';
    }
  });

  // 2. Apply active filter
  if (activeFilter !== "all") {
    const storeMap = {
      "digikala": "دیجی‌کالا",
      "torob": "ترب",
      "emalls": "ایمالز",
      "basalam": "باسلام",
      "divar": "دیوار",
      "sheypoor": "شیپور",
      "snappshop": "اسنپ‌شاپ"
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

const ratingHtml = item.rating > 0
    ? `<div class="result-rating"><span style="color:#FDB022; margin-left:4px;">★</span><span>${item.rating.toFixed(1)}</span> <span style="color:#9EA2AA; font-size:10px; margin-right:4px;">(${item.reviewCount})</span></div>`
    : "";

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
  return `<span dir="rtl">${num} <span class="currency-label">تومان</span></span>`;
}

function getStoreClass(storeName) {
  if (storeName === "دیجی‌کالا") return "digikala";
  if (storeName === "ترب") return "torob";
  if (storeName === "ایمالز") return "emalls";
  if (storeName === "باسلام") return "basalam";
  if (storeName === "دیوار") return "divar";
  if (storeName === "شیپور") return "sheypoor";
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
