import {
  assessProductMatch,
  buildSearchQuery,
  isPriceValid,
  normalizeProductText,
} from './filters.js';
import { parsePrice } from './price-utils.js';
import { getTabStateKey, TabSearchRegistry } from './tab-state.js';
import {
  beginApiRequest,
  clearApiLogs,
  completeApiRequest,
  failApiRequest,
  logApiCache,
  logApiResults,
  readApiLogs,
} from './api-logger.js';
import { SearchResultCache } from './search-cache.js';

// ==============================
// Utility: Fetch with Timeout
// ==============================
async function fetchWithTimeout(resource, options = {}) {
  const {
    timeout = 6000,
    logStore = "نامشخص",
    logOperation = "search",
    ...fetchOptions
  } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const logContext = beginApiRequest({
    store: logStore,
    url: resource,
    method: fetchOptions.method || "GET",
    operation: logOperation,
  });
  try {
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal  
    });
    completeApiRequest(logContext, response);
    clearTimeout(id);
    return response;
  } catch (error) {
    failApiRequest(logContext, error, {
      timedOut: error?.name === "AbortError",
    });
    clearTimeout(id);
    throw error;
  }
}


// ==============================
// Background Service Worker
// ==============================

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_POPUP" }).catch(() => {
    // Fallback for chrome:// or webstore pages where content script can't run
    chrome.windows.create({
      url: chrome.runtime.getURL("sidebar/sidebar.html"),
      type: "popup",
      width: 400,
      height: 650,
      focused: true
    });
  });
});

const tabSearches = new TabSearchRegistry();
const searchCache = new SearchResultCache(chrome.storage.local);
const inFlightSearches = new Map();

function broadcastTabUpdate(type, tabId, payload = {}) {
  chrome.runtime.sendMessage({ type, tabId, ...payload }).catch(() => {});
}

function persistTabState(tabId, state) {
  return chrome.storage.local.set({ [getTabStateKey(tabId)]: state });
}

function getProductKey(product) {
  return `${product?.source || product?.store || ""}|${product?.sourceUrl || ""}|${normalizeProductText(product?.name || "")}`;
}

async function registerDetectedProduct(tabId, product) {
  if (!Number.isInteger(tabId) || !product?.name) return;

  const stateKey = getTabStateKey(tabId);
  const data = await chrome.storage.local.get([stateKey]);
  const currentState = data[stateKey];
  const productKey = getProductKey(product);

  if (currentState?.productKey === productKey) {
    await persistTabState(tabId, { ...currentState, currentProduct: product });
    broadcastTabUpdate("PRODUCT_METADATA_UPDATED", tabId, {
      product,
      requestId: currentState.requestId,
    });
    return;
  }

  const requestId = tabSearches.begin(tabId);
  await persistTabState(tabId, {
    currentProduct: product,
    productKey,
    searchResults: null,
    isLoading: false,
    error: null,
    requestId,
    updatedAt: Date.now(),
  });
  broadcastTabUpdate("PRODUCT_UPDATED", tabId, { product, requestId });
}

function startTabSearch(tabId, product, options = {}) {
  if (!Number.isInteger(tabId) || !product?.name) return;

  const requestId = tabSearches.begin(tabId);

  const loadingState = {
    currentProduct: product,
    searchResults: null,
    isLoading: true,
    error: null,
    requestId,
    productKey: getProductKey(product),
    updatedAt: Date.now(),
  };
  persistTabState(tabId, loadingState);
  broadcastTabUpdate("SEARCH_STARTED", tabId, { product, requestId });

  searchPrices(product, {
    ...options,
    onProgress: (partialResults) => {
      if (!tabSearches.isCurrent(tabId, requestId)) return;
      persistTabState(tabId, { ...loadingState, searchResults: partialResults });
      broadcastTabUpdate("RESULTS_UPDATED", tabId, { results: partialResults, requestId, isPartial: true });
    }
  })
    .then(results => {
      if (!tabSearches.isCurrent(tabId, requestId)) return;
      return persistTabState(tabId, {
        currentProduct: product,
        searchResults: results,
        isLoading: false,
        error: null,
        requestId,
        productKey: getProductKey(product),
        updatedAt: Date.now(),
      }).then(() => broadcastTabUpdate("RESULTS_UPDATED", tabId, { results, requestId, isPartial: false }));
    })
    .catch(error => {
      if (!tabSearches.isCurrent(tabId, requestId)) return;
      const message = error?.message || "جستجو ناموفق بود";
      return persistTabState(tabId, {
        currentProduct: product,
        searchResults: null,
        isLoading: false,
        error: message,
        requestId,
        productKey: getProductKey(product),
        updatedAt: Date.now(),
      }).then(() => broadcastTabUpdate("SEARCH_FAILED", tabId, { error: message, requestId }));
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PRODUCT_DETECTED") {
    const tabId = sender.tab?.id;
    registerDetectedProduct(tabId, message.product);
    sendResponse({ success: Number.isInteger(tabId), tabId });
    return false;
  }

  if (message.type === "START_SEARCH") {
    const tabId = sender.tab?.id ?? message.tabId;
    startTabSearch(tabId, message.product, { force: false });
    sendResponse({ success: Number.isInteger(tabId), tabId });
    return false;
  }

  if (message.type === "RETRY_SEARCH") {
    const tabId = sender.tab?.id ?? message.tabId;
    startTabSearch(tabId, message.product, { force: true });
    sendResponse({ success: Number.isInteger(tabId), tabId });
    return false;
  }

  if (message.type === "GET_TAB_STATE") {
    const respondForTab = tabId => {
      if (!Number.isInteger(tabId)) {
        sendResponse({ tabId: null, state: null });
        return;
      }
      chrome.storage.local.get([getTabStateKey(tabId)], data => {
        sendResponse({ tabId, state: data[getTabStateKey(tabId)] || null });
      });
    };

    if (Number.isInteger(sender.tab?.id)) {
      respondForTab(sender.tab.id);
    } else {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => respondForTab(tabs[0]?.id));
    }
    return true;
  }

  if (message.type === "GET_API_LOGS") {
    readApiLogs().then(logs => sendResponse({ logs }));
    return true;
  }

  if (message.type === "CLEAR_API_LOGS") {
    clearApiLogs().then(() => sendResponse({ success: true }));
    return true;
  }

  return false;
});

chrome.tabs.onRemoved.addListener(tabId => {
  tabSearches.clear(tabId);
  chrome.storage.local.remove(getTabStateKey(tabId));
});

// ==============================
// جستجوی موازی همه فروشگاه‌ها
// ==============================
async function searchPrices(product, options = {}) {
  const cacheKey = normalizeProductText(buildSearchQuery(product.name));

  if (!options.force) {
    const cached = await searchCache.get(cacheKey);
    if (cached) {
      logApiCache("cache-hit", cacheKey, cached.results.length);
      if (options.onProgress) options.onProgress(cached.results);
      return cached.results;
    }
  }

  if (inFlightSearches.has(cacheKey)) {
    logApiCache("in-flight-hit", cacheKey);
    const res = await inFlightSearches.get(cacheKey);
    if (options.onProgress) options.onProgress(res);
    return res;
  }

  const searchPromise = searchPricesFromStores(product, options.onProgress)
    .then(async results => {
      await searchCache.set(cacheKey, results);
      return results;
    })
    .finally(() => inFlightSearches.delete(cacheKey));

  inFlightSearches.set(cacheKey, searchPromise);
  return searchPromise;
}


async function searchMasterKala(query) {
  try {
    const url = "https://masterkala.com/api/2.1.1.0.0/?route=product/searchproduct";
    const reqData = { "v": "1.2", "query": query, "from": 0, "limit": 12, "filter": "" };
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqData)
    }, 10000);
    
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !data.products) return [];

    let results = [];
    for (const item of data.products) {
      const priceStr = item.pricewithdiscount || item.price || "0";
      const price = parseInt(priceStr);
      if (price <= 0) continue;
      
      const isAvailable = item.stock_status === "موجود" || parseInt(item.quantity) > 0;
      if (!isAvailable) continue;
      
      results.push({
        store: "مسترکالا",
        name: item.name,
        price: price, // MasterKala uses Toman
        url: `https://masterkala.com/product/${item.product_id}/${item.slug || ''}`,
        image: item.image,
        availability: isAvailable,
        condition: "new"
      });
    }
    return results;
  } catch (e) {
    return [];
  }
}


async function searchDigipay(query) {
  try {
    const url = `https://www.mydigipay.com/search/0?query=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0" }
    }, 10000);
    
    if (!res.ok) return [];
    const html = await res.text();
    
    let results = [];
    const blocks = html.split('<article>');
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      
      const linkMatch = block.match(/goToProduct\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]/);
      const urlMatch = linkMatch ? linkMatch[1] : '';
      const storeDomain = linkMatch ? linkMatch[2] : '';
      
      const logoSnippetMatch = block.match(/class="store-logo([^]*?)<\/div>/i);
      let storeFa = '';
      if (logoSnippetMatch) {
        const altMatch = logoSnippetMatch[1].match(/alt=(?:"([^"]+)"|([^\r\n]+))/i);
        if (altMatch) storeFa = (altMatch[1] || altMatch[2]).trim();
      }
      
      const altMatch = block.match(/class="blend-multiply"[\s\S]*?alt="([^"]+)"/i) || block.match(/alt="([^"]+)"[\s\S]*?class="blend-multiply"/i);
      const name = altMatch ? altMatch[1].replace(/<\/?em>/g, '') : '';
      
      const srcMatch = block.match(/class="blend-multiply"[\s\S]*?src="([^"]+)"/i) || block.match(/src="([^"]+)"[\s\S]*?class="blend-multiply"/i);
      const image = srcMatch ? srcMatch[1] : '';
      
      const priceMatch = block.match(/class="price[^>]*>[\s\S]*?<span[^>]*>\s*([\d,]+)\s*<\/span>/i);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
      
      if (price <= 0 || !name || !urlMatch) continue;
      
      results.push({
        store: storeFa || storeDomain.split('.')[0],
        name: name,
        price: price, // Digipay returns Toman natively
        url: urlMatch,
        image: image,
        availability: true, // Digipay usually shows available items or sorts them
        condition: "new"
      });
    }
    return results;
  } catch (e) {
    return [];
  }
}

async function searchPricesFromStores(product, onProgress) {
  console.log("[قیمت‌یاب] جستجوی اولیه:", product.name);
  const searchName = buildSearchQuery(product.name);
  console.log("[قیمت‌یاب] عبارت جستجو:", searchName);

  const promises = [
    { name: "دیجی‌کالا", p: searchDigikala(searchName) },
    { name: "ترب", p: searchTorob(searchName) },
    { name: "ایمالز", p: searchEmalls(searchName) },
    { name: "باسلام", p: searchBasalam(searchName) },
    { name: "دیوار", p: searchDivar(searchName) },
    { name: "شیپور", p: searchSheypoor(searchName) },
    { name: "مسترکالا", p: searchMasterKala(searchName) },
    { name: "دیجی‌پی", p: searchDigipay(searchName) },
    { name: "اسنپ‌شاپ", p: searchSnappShop(searchName) },
    { name: "خانومی", p: searchKhanoumi(searchName) },
    { name: "تکنولایف", p: searchTechnolife(searchName) },
  ];

  const allValidResults = [];

  const filterAndScore = (r) => {
    if (r.availability === false) return null;
    const isUsed = r.condition === "used" || ["دیوار", "شیپور"].includes(r.store);
    if (!isUsed && product.price && !isPriceValid(product.price, r.price)) return null;
    const match = assessProductMatch(product.name, r.name, isUsed);
    if (!match.accepted) return null;
    return { ...r, matchScore: match.score, matchConfidence: match.confidence, condition: isUsed ? "used" : "new" };
  };

  const sortAndDedupe = (results) => {
    const unique = [...new Map(results.map(item => [item.store + "|" + normalizeProductText(item.name) + "|" + item.price, item])).values()];
    unique.sort((a, b) => Number(b.availability) - Number(a.availability) || Number(a.condition === "used") - Number(b.condition === "used") || a.price - b.price || b.matchScore - a.matchScore);
    return unique;
  };

  const wrappedPromises = promises.map(req => 
    req.p.then(res => {
      logApiResults(req.name, res.length);
      const valid = res.map(filterAndScore).filter(Boolean);
      allValidResults.push(...valid);
      if (onProgress) onProgress(sortAndDedupe(allValidResults));
      return valid;
    }).catch(err => {
      logApiResults(req.name, 0, { error: err.message });
      return [];
    })
  );

  await Promise.allSettled(wrappedPromises);
  return sortAndDedupe(allValidResults);
}

// ==============================
// خانومی و تکنولایف — page bridge
// ==============================
function searchStorePage(store, url, timeoutMs = 18000) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      if (chrome.runtime.lastError || !tab?.id) return resolve([]);
      const tabId = tab.id;
      let settled = false;
      const finish = (items) => {
        if (settled) return;
        settled = true;
        chrome.tabs.onUpdated.removeListener(onUpdated);
        chrome.tabs.remove(tabId).catch(() => {});
        resolve(Array.isArray(items) ? items : []);
      };
      const askPage = () => {
        chrome.tabs.sendMessage(tabId, { type: "STORE_PAGE_SEARCH", store }, (response) => {
          if (chrome.runtime.lastError || !response) return finish([]);
          finish(response.items || []);
        });
      };
      const onUpdated = (updatedTabId, info) => {
        if (updatedTabId === tabId && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          setTimeout(askPage, store === "خانومی" ? 1800 : 1200);
        }
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
      setTimeout(() => finish([]), timeoutMs);
    });
  });
}

async function searchKhanoumi(productName) {
  const query = encodeURIComponent(productName);
  const url = `https://www.khanoumi.com/search?query=${query}`;
  const context = beginApiRequest({ store: "خانومی", url, method: "GET", operation: "page-search" });
  const items = await searchStorePage("خانومی", url);
  completeApiRequest(context, { ok: true, status: 200 }, { resultCount: items.length });
  return items;
}

async function searchTechnolife(productName) {
  const query = encodeURIComponent(productName);
  const url = `https://www.technolife.ir/product/list/search?keywords=${query}`;
  const context = beginApiRequest({ store: "تکنولایف", url, method: "GET", operation: "page-search" });
  const items = await searchStorePage("تکنولایف", url);
  completeApiRequest(context, { ok: true, status: 200 }, { resultCount: items.length });
  return items;
}

// ==============================
// دیجی‌کالا — API رسمی (قیمت ریال)
// ==============================
async function searchDigikala(productName) {
  const query = encodeURIComponent(productName);
  const response = await fetchWithTimeout(`https://api.digikala.com/v1/search/?q=${query}&page=1`, {
    logStore: "دیجی‌کالا",
    headers: { "Accept": "application/json" }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  const products = data?.data?.products || [];

  return products.slice(0, 8).map(item => {
    const v = item.default_variant;
    // دیجی‌کالا ریال میده ÷ ۱۰ = تومان
    const price = parsePrice(v?.price?.selling_price, "IRR");
    const originalPrice = parsePrice(v?.price?.rrp_price || v?.price?.selling_price, "IRR");
    const image = item.images?.main?.url?.[0] || item.images?.list?.[0]?.url?.[0] || "";

    return {
      store: "دیجی‌کالا", storeColor: "#E42112",
      name: item.title_fa || item.title_en || productName,
      price, originalPrice,
      discount: v?.price?.discount_percent || 0,
      url: `https://www.digikala.com${item.url?.uri || ""}`,
      image,
      rating: item.rating?.rate || 0,
      reviewCount: item.rating?.count || 0,
      availability: v?.status === "marketable",
    };
  }).filter(p => p.price > 0);
}

// ==============================
// ترب — api.torob.com (endpoint واقعی)
// ==============================
async function searchTorob(productName) {
  const query = encodeURIComponent(productName);
  // endpoint واقعی که از HTML سایت پیدا کردیم
  const url = `https://api.torob.com/v4/base-product/search/?q=${query}&source=next_desktop`;

  const response = await fetchWithTimeout(url, {
    logStore: "ترب",
    headers: {
      "Accept": "application/json",
      "Referer": "https://torob.com/",
      "Origin": "https://torob.com"
    }
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  const results = data?.results || [];

  return results.slice(0, 6).map(item => {
    // Prefer Torob's displayed price. In some responses the raw numeric field
    // is rial while price_text contains the correct user-facing toman value.
    const priceTextHasNumber = /[0-9۰-۹٠-٩]/.test(item.price_text || "");
    const priceSource = priceTextHasNumber ? item.price_text : item.price;
    const price = parsePrice(priceSource, item.price_text, "TOMAN");
    const image = item.image_url || item.media_urls?.[0]?.url || "";
    const url = item.web_client_absolute_url
      ? `https://torob.com${item.web_client_absolute_url}`
      : `https://torob.com/search/?query=${query}`;

    return {
      store: "ترب", storeColor: "#00A95C",
      name: item.name1 || item.name2 || productName,
      price, originalPrice: price,
      discount: 0, url, image,
      rating: 0, reviewCount: 0,
      availability: item.stock_status !== "out_of_stock",
    };
  }).filter(p => p.price > 0);
}

// ==============================
// ایمالز — HTML scraping
// ==============================
async function searchEmalls(productName) {
  const query = encodeURIComponent(productName);
  try {
    const url = `https://emalls.ir/لیست-قیمت/?Search=${query}`;
    const response = await fetchWithTimeout(url, {
      logStore: "ایمالز",
      headers: {
        "Accept": "text/html",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        "Referer": "https://emalls.ir/"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const results = [];

    // Split HTML into product blocks
    const blocks = html.split('class="item product-block"');
    
    // Skip the first chunk (header)
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      
      // Extract name from alt or title attributes within the block
      const nameMatch = block.match(/(?:alt|title)="([^"]{5,150})"/i);
      const name = nameMatch ? nameMatch[1].replace(/قیمت\s*/g, '').trim() : null;
      
      // Extract price (any number followed by تومان)
      const priceText = block.match(/([\d,۰-۹]{5,})\s*(?:تومان)/)?.[1];
      
      // Extract URL (href starting with /)
      const urlMatch = block.match(/href="(\/[^"]+)"/i);
      const urlPath = urlMatch ? urlMatch[1] : null;
      
      // Extract image (src containing emalls.ir/files or similar)
      const imgMatch = block.match(/src=["'](https?:\/\/[^"']+\.(?:jpg|png|webp|jpeg)[^"']*)["']/i);
      const img = imgMatch ? imgMatch[1] : "";

      if (name && priceText) {
        const price = parsePrice(priceText, "TOMAN");
        if (price > 0) {
          results.push({
            store: "ایمالز", storeColor: "#F5A623",
            name, price, originalPrice: price, discount: 0,
            url: urlPath ? `https://emalls.ir${urlPath}` : url,
            image: img, rating: 0, reviewCount: 0, availability: true, condition: "new"
          });
        }
      }
      if (results.length >= 5) break;
    }
    return results;
  } catch (e) {
    throw new Error(`ایمالز: ${e.message}`);
  }
}

// ==============================
// باسلام — API
// ==============================
async function searchBasalam(productName) {
  const query = encodeURIComponent(productName);
  const endpoints = [
    `https://search.basalam.com/ai-engine/api/v2.0/product/search?q=${query}&limit=6`,
    `https://basalam.com/api/v4.0/product/search?q=${query}&limit=6`
  ];

  for (const url of endpoints) {
    try {
      const response = await fetchWithTimeout(url, {
        logStore: "باسلام",
        headers: {
          "Accept": "application/json"
        }
      });
      if (!response.ok) continue;

      const data = await response.json();
      const items = data?.products || data?.data?.items || data?.items || data?.results || [];
      if (!Array.isArray(items) || items.length === 0) continue;

      return items.slice(0, 5).map(item => {
        // Basalam returns its numeric price in rial and usually omits the unit.
        const price = parsePrice(
          item.price || item.sell_price || 0,
          item.currency || item.currency_code,
          "IRR"
        );
        return {
          store: "باسلام", storeColor: "#8B5CF6",
          name: item.name || item.title || productName,
          price, originalPrice: price, discount: 0,
          url: (item.vendor && item.vendor.identifier && item.id) ? `https://basalam.com/${item.vendor.identifier}/product/${item.id}` : `https://basalam.com/s?q=${query}`,
          image: item.thumbnail || item.image || item.photo?.MEDIUM || item.photo?.SMALL || item.cover || "",
          rating: item.rate || item.rating?.score || 0, reviewCount: item.rate_count || item.rating?.count || 0, availability: true,
        };
      }).filter(p => p.price > 0);
    } catch (e) {
      console.warn("[باسلام] endpoint خطا:", e.message);
      continue;
    }
  }
  return [];
}

// ==============================
// دیوار — API جستجو
// ==============================
async function searchDivar(productName) {
  try {
    const url = "https://api.divar.ir/v8/postlist/w/search";
    const response = await fetchWithTimeout(url, {
      logStore: "دیوار",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        page: { page_number: 1 },
        filters: { query: productName }
      })
    });
    
    if (!response.ok) return [];

    const data = await response.json();
    const widgets = data?.list_widgets || [];
    
    return widgets.map(w => {
      if (w.widget_type !== "POST_ROW") return null;
      const item = w.data;
      if (!item) return null;
      
      // قیمت در فیلد middle_description_text هست
      const priceText = item.middle_description_text || "";
      if (priceText.includes("توافقی") || priceText.includes("معاوضه") || !priceText.includes("تومان")) {
        return null;
      }
      
      const price = parsePrice(priceText, "TOMAN");
      if (price === 0) return null;

      const token = item.action?.payload?.token || item.token;
      
      return {
        store: "دیوار", storeColor: "#A62626",
        name: item.title || productName,
        price, originalPrice: price, discount: 0,
        url: token ? `https://divar.ir/v/${token}` : `https://divar.ir/s/iran?q=${encodeURIComponent(productName)}`,
        image: item.image_url || "",
        rating: 0, reviewCount: 0, availability: true, condition: "used",
      };
    }).filter(p => p !== null).slice(0, 5);
  } catch (e) {
    console.warn("[دیوار] خطا:", e.message);
    return [];
  }
}

// ==============================
// شیپور — API
// ==============================
async function searchSheypoor(productName) {
  try {
    const query = encodeURIComponent(productName);
    const url = `https://www.sheypoor.com/api/v10.0.0/search?q=${query}`;
    
    const response = await fetchWithTimeout(url, {
      logStore: "شیپور",
      credentials: "omit",
      headers: { "Accept": "application/json" }
    });
    
    if (!response.ok) return [];

    const data = await response.json();
    // data.data is an ARRAY (not object with .items)
    const items = Array.isArray(data?.data) ? data.data : (data?.data?.items || []);
    
    return items.map(item => {
      const attributes = item.attributes;
      if (!attributes) return null;
      
      const title = attributes.title;
      if (!title) return null;
      
      // قیمت در attributes.price است که آرایه‌ای از آبجکت‌هاست
      const priceArr = attributes.price || [];
      const priceObj = Array.isArray(priceArr) ? priceArr[0] : null;
      if (!priceObj) return null;
      
      const amountStr = String(priceObj.amount || "");
      if (amountStr.includes("توافقی") || amountStr.includes("معاوضه") || amountStr === "") return null;
      
      // Respect Sheypoor's explicit unit; numeric prices without a unit are rial.
      const price = parsePrice(amountStr, priceObj.currency || priceObj.unit, "IRR");
      if (price === 0) return null;
      
      // تصویر در attributes.images.thumbnails است
      const imgUrl = attributes.images?.thumbnails?.landscape || attributes.images?.thumbnails?.round || attributes.image || "";
      
      return {
        store: "شیپور", storeColor: "#0050FF",
        name: title,
        price, originalPrice: price, discount: 0,
        url: attributes.url || `https://www.sheypoor.com/search?q=${query}`,
        image: imgUrl,
        rating: 0, reviewCount: 0, availability: true, condition: "used",
      };
    }).filter(p => p !== null).slice(0, 5);
  } catch (e) {
    console.warn("[شیپور] خطا:", e.message);
    return [];
  }
}


// ==============================
// اسنپ شاپ (Snapp Shop)
// ==============================
async function searchSnappShop(productName) {
  // Strategy: open snappshop.ir in a background tab, inject fetch, close tab
  return new Promise((resolve) => {
    // First check if there's already an open snappshop tab
    chrome.tabs.query({ url: "*://*.snappshop.ir/*" }, (existingTabs) => {
      if (existingTabs && existingTabs.length > 0) {
        // Use existing tab
        sendToSnappBridge(existingTabs[0].id, productName, resolve, false);
      } else {
        // Open a new background tab to snappshop.ir
        chrome.tabs.create({ url: "https://snappshop.ir", active: false }, (newTab) => {
          if (chrome.runtime.lastError || !newTab) {
            resolve(searchSnappShopDirect(productName));
            return;
          }
          // Wait for the tab to fully load (snappshop needs to run JS challenge)
          const tabId = newTab.id;
          let loaded = false;
          
          const onUpdated = (updatedTabId, info) => {
            if (updatedTabId !== tabId) return;
            if (info.status === "complete" && !loaded) {
              loaded = true;
              chrome.tabs.onUpdated.removeListener(onUpdated);
              // Wait a bit for ArvanCloud challenge to resolve
              setTimeout(() => {
                sendToSnappBridge(tabId, productName, (results) => {
                  chrome.tabs.remove(tabId).catch(() => {});
                  resolve(results);
                }, true);
              }, 2000);
            }
          };
          
          chrome.tabs.onUpdated.addListener(onUpdated);
          
          // Timeout after 15s
          setTimeout(() => {
            if (!loaded) {
              chrome.tabs.onUpdated.removeListener(onUpdated);
              chrome.tabs.remove(tabId).catch(() => {});
              resolve(searchSnappShopDirect(productName));
            }
          }, 15000);
        });
      }
    });
  });
}

function sendToSnappBridge(tabId, productName, resolve, isNewTab) {
  const query = encodeURIComponent(productName);
  const apiUrl = `https://apix.snappshop.ir/search/v1?query=${query}&lat=35.6969675&lng=51.4080675`;
  const logContext = beginApiRequest({
    store: "اسنپ‌شاپ",
    url: apiUrl,
    method: "GET",
    operation: "bridge-search",
  });
  chrome.tabs.sendMessage(tabId, { type: "SNAPPSHOP_SEARCH", query: productName }, (response) => {
    if (chrome.runtime.lastError || !response) {
      failApiRequest(logContext, new Error(chrome.runtime.lastError?.message || "Bridge failed"));
      resolve(searchSnappShopDirect(productName));
      return;
    }
    if (response.error) {
      failApiRequest(logContext, new Error(response.error), {
        status: response.apiMeta?.status || 0,
        remoteDurationMs: response.apiMeta?.durationMs,
      });
      resolve([]);
      return;
    }
    const parsedItems = parseSnappShopItems(response.items, productName);
    completeApiRequest(logContext, {
      ok: true,
      status: response.apiMeta?.status || 200,
    }, {
      remoteDurationMs: response.apiMeta?.durationMs,
      resultCount: parsedItems.length,
    });
    resolve(parsedItems);
  });
}

async function searchSnappShopDirect(productName) {
  // Fallback: direct fetch (may get 403 from ArvanCloud on some requests)
  try {
    const query = encodeURIComponent(productName);
    const url = `https://apix.snappshop.ir/search/v1?query=${query}&lat=35.6969675&lng=51.4080675`;
    const response = await fetchWithTimeout(url, {
      logStore: "اسنپ‌شاپ",
      logOperation: "direct-search",
      credentials: "include",
      headers: { "Accept": "application/json", "Referer": "https://snappshop.ir/" }
    });
    if (!response.ok) { console.warn("[اسنپ‌شاپ] HTTP", response.status); return []; }
    const data = await response.json();
    const items = data?.data?.items || data?.data?.products || data?.products || [];
    return parseSnappShopItems(items, productName);
  } catch (e) {
    console.warn("[اسنپ‌شاپ]", e.message);
    return [];
  }
}

function parseSnappShopItems(items, productName) {
  if (!items || items.length === 0) return [];
  const query = encodeURIComponent(productName);
  return items.map(item => {
    let priceVal = 0;
    if (item.price && typeof item.price === 'object') {
      priceVal = item.price.discounted_price || item.price.price || 0;
    } else {
      priceVal = item.price || item.selling_price || item.discounted_price || 0;
    }
    const price = parsePrice(priceVal, item.currency || item.currency_code || item.price?.currency || "TOMAN");
    if (price === 0) return null;
    
    let imgUrl = "";
    if (item.images && item.images.length > 0) {
      imgUrl = item.images[0].url || item.images[0] || "";
    } else {
      imgUrl = item.image || item.image_url || item.thumbnail || "";
    }
    return {
      store: "اسنپ‌شاپ", storeColor: "#21D970",
      name: item.title || item.title_fa || productName,
      price, originalPrice: price, discount: 0,
      url: item.id ? `https://snappshop.ir/product/${item.id}` : `https://snappshop.ir/search?query=${query}`,
      image: imgUrl,
      rating: item.rating || 0, reviewCount: item.reviews_count || 0, availability: true,
    };
  }).filter(p => p !== null).slice(0, 5);
}
