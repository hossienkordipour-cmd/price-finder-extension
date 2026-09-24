
let currentProduct = null;
let allResults = [];
let currentTabId = null;
let latestRequestId = 0;

const emptyState = document.getElementById("empty-state");
const loadingState = document.getElementById("loading-state");
const resultsState = document.getElementById("results-state");
const errorState = document.getElementById("error-state");
const currentProductEl = document.getElementById("current-product");
const resultsListEl = document.getElementById("results-list");
const sortFilter = document.getElementById("sort-filter");
const conditionFilter = document.getElementById("condition-filter");

document.getElementById("popup-close-btn").addEventListener("click", () => {
  window.parent.postMessage("CLOSE_PIQO_POPUP", "*");
});

document.getElementById("manual-search-form").addEventListener("submit", (e) => {
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

  if (message.type === "PRODUCT_UPDATED") {
    latestRequestId = message.requestId || latestRequestId;
    currentProduct = message.product;
    allResults = [];
    showLoading();
    chrome.runtime.sendMessage({ type: "START_SEARCH", tabId: currentTabId, product: currentProduct });
  }

  if (message.type === "SEARCH_STARTED") {
    latestRequestId = message.requestId || latestRequestId;
    allResults = [];
    showLoading();
  }

  if (message.type === "RESULTS_UPDATED") {
    allResults = message.results || [];
    renderResults(allResults, message.isPartial);
  }

  if (message.type === "SEARCH_ERROR") {
    showError();
  }
});

function formatPrice(p) {
  if (!p || p <= 0) return "نامشخص";
  return p.toLocaleString("fa-IR");
}

function generateCardHtml(item, isBase = false) {
  let discountHtml = "";
  if (!isBase && currentProduct && currentProduct.price && item.price < currentProduct.price) {
    const diff = Math.round(((currentProduct.price - item.price) / currentProduct.price) * 100);
    if (diff > 0) {
      discountHtml = `<div class="card-discount">${diff.toLocaleString("fa-IR")}٪ ارزان تر</div>`;
    }
  }

  const storeText = item.condition === "used" ? `${item.store} - کارکرده` : item.store;

  return `
    <a href="${item.url}" target="_blank" class="result-card">
      <div class="card-image-wrapper">
        <img class="card-img" src="${item.image || 'https://via.placeholder.com/150'}" alt="" onerror="this.src='https://via.placeholder.com/150'" />
      </div>
      <div class="card-content">
        <h3 class="card-title">${item.name || currentProduct?.name || 'کالا'}</h3>
        <div class="card-store">${isBase ? item.store : storeText}</div>
        <div class="card-bottom">
          <div class="card-price">${formatPrice(item.price)}<span>تومان</span></div>
          ${discountHtml}
        </div>
      </div>
    </a>
  `;
}

function showLoading() {
  emptyState.classList.add("hidden");
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
  emptyState.classList.add("hidden");
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
  if (currentProduct) {
    currentProductEl.innerHTML = generateCardHtml(currentProduct, true);
    currentProductEl.classList.remove("hidden");
  } else {
    currentProductEl.classList.add("hidden");
  }

  emptyState.classList.add("hidden");
  loadingState.classList.add("hidden");
  errorState.classList.add("hidden");
  resultsState.classList.remove("hidden");

  let filtered = [...results];
  const condItems = Array.from(document.querySelectorAll('#condition-filter .dropdown-item.selected')).map(i => i.dataset.value);
  if (!condItems.includes("new")) filtered = filtered.filter(r => r.condition === "used");
  if (!condItems.includes("used")) filtered = filtered.filter(r => r.condition !== "used");

  const sort = sortFilter.dataset.value;
  if (sort === "cheap") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === "match") {
    filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }

  // Update results count
  const countEl = document.getElementById("results-count");
  if (countEl) {
    countEl.innerText = (isLoading && filtered.length === 0) ? "..." : filtered.length.toLocaleString("fa-IR") + " محصول";
  }

  let html = filtered.map(r => generateCardHtml(r, false)).join("");
  
  if (isLoading) {
    html += generateSkeletonHtml() + generateSkeletonHtml();
  } else if (filtered.length === 0) {
    html = `<div style="text-align: center; color: var(--text-light); padding: 32px 0; font-size: 13px;">نتیجه‌ای یافت نشد</div>`;
  }
  
  resultsListEl.innerHTML = html;
}

chrome.runtime.sendMessage({ type: "GET_TAB_STATE" }, (response) => {
  if (chrome.runtime.lastError || !response) return;
  if (response.tabId) currentTabId = response.tabId;
  const state = response.state;
  if (state && state.currentProduct) {
    latestRequestId = state.requestId || 0;
    currentProduct = state.currentProduct;
    if (state.isLoading) {
      showLoading();
      if (state.searchResults && state.searchResults.length > 0) {
        allResults = state.searchResults;
        renderResults(allResults, true);
      }
    } else if (state.searchResults && state.searchResults.length > 0) {
      allResults = state.searchResults;
      renderResults(allResults, false);
    } else {
      showLoading();
      chrome.runtime.sendMessage({ type: "START_SEARCH", tabId: currentTabId, product: currentProduct });
    }
  }
});


const gridIconBtn = document.querySelector(".grid-icon-btn");
const gridSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>`;
const listSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="6" rx="1"></rect><rect x="3" y="14" width="18" height="6" rx="1"></rect></svg>`;

gridIconBtn.addEventListener("click", () => {
  const isGrid = resultsListEl.classList.toggle("grid-view");
  gridIconBtn.innerHTML = isGrid ? listSvg : gridSvg;
});
