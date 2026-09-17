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

  if (product.price) {
    productPriceEl.textContent = formatPrice(product.price);
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

  // بنر صرفه‌جویی
  if (currentProduct?.price && results.length > 0) {
    const bestPrice = results[0].price;
    const currentPrice = currentProduct.price;

    if (bestPrice < currentPrice) {
      const saving = currentPrice - bestPrice;
      const savingPct = Math.round((saving / currentPrice) * 100);
      savingsBannerEl.classList.remove("hidden");
      savingsTextEl.textContent = `می‌توانی ${formatPrice(saving)} (${savingPct}٪) صرفه‌جویی کنی!`;
    } else {
      savingsBannerEl.classList.add("hidden");
    }
  }
}

function getFilteredResults() {
  if (activeFilter === "all") return allResults;
  return allResults.filter(r => {
    if (activeFilter === "digikala") return r.store === "دیجی‌کالا";
    if (activeFilter === "torob") return r.store === "ترب";
    if (activeFilter === "emalls") return r.store === "ایمالز";
    if (activeFilter === "basalam") return r.store === "باسلام";
    if (activeFilter === "divar") return r.store === "دیوار";
    if (activeFilter === "sheypoor") return r.store === "شیپور";
    return true;
  });
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

  resultsListEl.innerHTML = results.map((item, index) => {
    const isBest = index === 0;
    const storeClass = getStoreClass(item.store);
    const priceClass = isBest ? "result-price best" : "result-price";

    const discountBadge = item.discount > 0
      ? `<span class="result-discount">−${item.discount}٪</span>`
      : "";

    const originalPrice = (item.originalPrice && item.originalPrice > item.price)
      ? `<span class="result-original-price">${formatPrice(item.originalPrice)}</span>`
      : "";

    const ratingHtml = item.rating > 0
      ? `<div class="result-rating">⭐ ${item.rating.toFixed(1)} (${item.reviewCount})</div>`
      : "";

    const unavailableHtml = !item.availability
      ? `<span class="unavailable-label">ناموجود</span>`
      : "";

    const bestBadge = isBest
      ? `<span class="best-badge">✨ بهترین قیمت</span>`
      : "";

    return `
      <a href="${item.url}" target="_blank" class="result-card ${isBest ? "best-price" : ""} ${!item.availability ? "unavailable" : ""}" rel="noopener">
        ${bestBadge}
        <img class="result-img" src="${item.image || ""}" alt=""
          onerror="this.style.display='none'" />
        <div class="result-content">
          <div class="result-store">
            <span class="store-name ${storeClass}">${item.store}</span>
            ${unavailableHtml}
          </div>
          <div class="result-name">${item.name}</div>
          <div class="result-price-row">
            <span class="${priceClass}">${formatPrice(item.price)}</span>
            ${originalPrice}
            ${discountBadge}
          </div>
          ${ratingHtml}
        </div>
      </a>
    `;
  }).join("");
}

// ==============================
// توابع کمکی
// ==============================
function formatPrice(price) {
  if (!price) return "—";
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان";
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
