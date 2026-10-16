import {
  assessProductMatch,
  buildSearchQuery,
  isPriceValid,
  normalizeProductText,
} from './filters.js';
import { parsePrice } from './price-utils.js';
import { parseDigikalaVerifiedOffer, createDigikalaOfferVerifier, getDigikalaProductId } from './digikala-offer.js';
import { needsMerchantPriceCheck, verifyDigipayMerchantOffer } from './merchant-price.js';
import { getTabStateKey, TabSearchRegistry, getPageKey } from './tab-state.js';
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

let globalAffilioPrefix = null; // Cache for universal dynamic affiliate links
import { PIQO_API_BASE_URL, parsePiqoApiResponse, parsePiqoDivarResponse } from './piqo-api-client.js';

const PIQO_ONBOARDING_STATE_KEY = 'piqoOnboardingState';

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') return;

  await chrome.storage.local.set({
    [PIQO_ONBOARDING_STATE_KEY]: {
      completed: false,
      nudgeShown: false,
      installedAt: Date.now(),
    },
  });

  await chrome.tabs.create({
    url: 'https://piqoo.ir/install-extension',
  });
});

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
  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_POPUP" }).catch(() => {});
});

const tabSearches = new TabSearchRegistry();
const searchCache = new SearchResultCache(chrome.storage.local);
const inFlightSearches = new Map();

function broadcastTabUpdate(type, tabId, payload = {}) {
  chrome.runtime.sendMessage({ type, tabId, ...payload }).catch(() => {});
}

const tabStateWrites = new Map();
const tabOperations = new Map();
function runTabOperation(tabId, task) {
  const operation = (tabOperations.get(tabId) || Promise.resolve()).catch(() => {}).then(task);
  tabOperations.set(tabId, operation);
  void operation.finally(() => { if (tabOperations.get(tabId) === operation) tabOperations.delete(tabId); }).catch(() => {});
  return operation;
}

function invalidateTabPage(tabId, url, force = false) {
  if (!Number.isInteger(tabId)) return Promise.resolve();
  return runTabOperation(tabId, async () => {
    const key = getTabStateKey(tabId);
    const current = (await chrome.storage.local.get([key]))[key];
    const pageKey = getPageKey(url);
    if (!force && pageKey === (current?.pageKey || getPageKey(current?.currentProduct?.navigationUrl || current?.currentProduct?.sourceUrl))) return;
    const requestId = tabSearches.begin(tabId, current?.requestId);
    await persistTabState(tabId, { currentProduct: null, productKey: null, searchResults: null,
      isLoading: false, error: null, pageKey, requestId, updatedAt: Date.now() });
    broadcastTabUpdate('PAGE_CHANGED', tabId, { requestId, pageKey });
  });
}
function persistTabState(tabId, state, preserveLatestProduct = false) {
  const previous = tabStateWrites.get(tabId) || Promise.resolve();
  const write = previous.catch(() => {}).then(async () => {
    const key = getTabStateKey(tabId);
    const stored = (await chrome.storage.local.get([key]))[key];
    if (stored?.requestId > state.requestId) return;
    const next = preserveLatestProduct && stored?.requestId === state.requestId && stored?.productKey === state.productKey
      ? { ...state, currentProduct: stored.currentProduct }
      : state;
    await chrome.storage.local.set({ [key]: next });
  });
  tabStateWrites.set(tabId, write);
  void write.finally(() => {
    if (tabStateWrites.get(tabId) === write) tabStateWrites.delete(tabId);
  }).catch(() => {});
  return write;
}

function getProductKey(product) {
  return `${product?.source || product?.store || ""}|${product?.sourceUrl || ""}|${normalizeProductText(product?.name || "")}`;
}

async function registerDetectedProduct(tabId, product) {
  if (!Number.isInteger(tabId) || !product?.name) return;
  return runTabOperation(tabId, async () => {
  const stateKey = getTabStateKey(tabId);
  const data = await chrome.storage.local.get([stateKey]);
  const currentState = data[stateKey];
  const productKey = getProductKey(product);
  const pageKey = getPageKey(product.navigationUrl || product.sourceUrl);
  if (currentState?.pageKey && pageKey && currentState.pageKey !== pageKey) return;

  if (currentState?.productKey === productKey) {
    await persistTabState(tabId, { ...currentState, currentProduct: product });
    broadcastTabUpdate("PRODUCT_METADATA_UPDATED", tabId, {
      product,
      requestId: currentState.requestId,
    });
    return;
  }

  const requestId = tabSearches.begin(tabId, currentState?.requestId);
  await persistTabState(tabId, {
    currentProduct: product,
    productKey,
    pageKey,
    searchResults: null,
    isLoading: false,
    error: null,
    requestId,
    updatedAt: Date.now(),
  });
  broadcastTabUpdate("PRODUCT_UPDATED", tabId, { product, requestId });
  });
}

function startTabSearch(tabId, product, options = {}) {
  if (!Number.isInteger(tabId) || !product?.name) return;
  return runTabOperation(tabId, async () => {
  const current = (await chrome.storage.local.get([getTabStateKey(tabId)]))[getTabStateKey(tabId)];
  const pageKey = getPageKey(product.navigationUrl || product.sourceUrl);
  if (current?.pageKey && pageKey && current.pageKey !== pageKey) return;
  if (current?.productKey && current.productKey !== getProductKey(product)) return;
  const requestId = tabSearches.begin(tabId, current?.requestId);

  const loadingState = {
    currentProduct: product,
    searchResults: null,
    isLoading: true,
    error: null,
    requestId,
    productKey: getProductKey(product),
    pageKey,
    updatedAt: Date.now(),
  };
  await persistTabState(tabId, loadingState);
  broadcastTabUpdate("SEARCH_STARTED", tabId, { product, requestId });

  searchPrices(product, {
    ...options,
    onProgress: (partialResults) => {
      if (!tabSearches.isCurrent(tabId, requestId)) return;
      persistTabState(tabId, { ...loadingState, searchResults: partialResults }, true);
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
        pageKey,
      }, true).then(() => { if (tabSearches.isCurrent(tabId, requestId)) broadcastTabUpdate("RESULTS_UPDATED", tabId, { results, requestId, isPartial: false }); });
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
        pageKey,
      }, true).then(() => { if (tabSearches.isCurrent(tabId, requestId)) broadcastTabUpdate("SEARCH_FAILED", tabId, { error: message, requestId }); });
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAGE_CHANGED' || message.type === 'PRODUCT_CLEARED') {
    if (sender.tab?.url && getPageKey(sender.tab.url) !== getPageKey(message.url)) {
      sendResponse({ success: false });
      return false;
    }
    invalidateTabPage(sender.tab?.id, message.url, message.type === 'PRODUCT_CLEARED').then(() => sendResponse({ success: true })).catch(() => sendResponse({ success: false }));
    return true;
  }
  if (message.type === "PRODUCT_DETECTED") {
    const tabId = sender.tab?.id;
    if (message.product?.navigationUrl && sender.tab?.url && getPageKey(message.product.navigationUrl) !== getPageKey(sender.tab.url)) {
      sendResponse({ success: false, tabId });
      return false;
    }
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
      Promise.resolve(tabOperations.get(tabId)).then(() => tabStateWrites.get(tabId)).then(() => chrome.storage.local.get([getTabStateKey(tabId)]))
        .then(data => sendResponse({ tabId, state: data[getTabStateKey(tabId)] || null }));
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

  if (message.type === "GET_ONBOARDING_PRODUCTS") {
    const queries = Array.isArray(message.queries)
      ? message.queries.filter(query => typeof query === 'string' && query.trim()).slice(0, 4)
      : [];

    Promise.all(queries.map(async query => {
      try {
        const products = await searchDigikala(query);
        return products.find(product => product.availability) || products[0] || null;
      } catch {
        return null;
      }
    })).then(products => sendResponse({ products }));

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
      // Product default offers can change within our general search-cache TTL.
      // Refresh Digikala prices before displaying cached cards, keeping their
      // supplied affiliate links and the existing fallback on lookup failure.
      const refreshDigikala = createDigikalaOfferVerifier(fetchWithTimeout, { refresh: true });
      const results = await Promise.all(cached.results.map(offer => refreshDigikala(offer)));
      logApiCache("cache-hit", cacheKey, results.length);
      if (options.onProgress) options.onProgress(results);
      return results;
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
        price: price, // Feed claims toman; verify Amir Store at the destination.
        url: urlMatch,
        image: image,
        availability: true, // Digipay usually shows available items or sorts them
        condition: "new"
      });
    }
    let merchantChecks = 0;
    const verified = await Promise.all(results.map(offer => {
      if (needsMerchantPriceCheck(offer.url) && ++merchantChecks > 4) return null;
      return verifyDigipayMerchantOffer(offer, fetchWithTimeout);
    }));
    return verified.filter(Boolean);
  } catch (e) {
    return [];
  }
}

async function searchPricesFromStores(product, onProgress) {
  console.log("[قیمت‌یاب] جستجوی اولیه:", product.name);
  const searchName = buildSearchQuery(product.name);
  console.log("[قیمت‌یاب] عبارت جستجو:", searchName);

  // Query Affilio with multiple variations to bypass its fragile search engine
  const rawPrefix = product.name.split(' ').slice(0, 6).join(' '); // First 6 words (broad search)
  const affilioPromise = Promise.allSettled([
    searchPiqoApi(searchName), 
    searchPiqoApi(product.name),
    searchPiqoApi(rawPrefix)
  ]).then(results => {
    const combined = [];
    results.forEach(res => {
      if (res.status === 'fulfilled' && res.value) {
        combined.push(...res.value);
      }
    });
    // Deduplicate by URL to avoid huge arrays
    const unique = new Map();
    combined.forEach(item => { if (item.url) unique.set(item.url, item); });
    return [...unique.values()];
  });

  const tlPromise = Promise.allSettled([
    searchTechnolife(searchName),
    searchTechnolife(product.name)
  ]).then(results => {
    const combined = [];
    results.forEach(res => {
      if (res.status === 'fulfilled' && res.value) combined.push(...res.value);
    });
    const unique = new Map();
    combined.forEach(item => { if (item.url) unique.set(item.url, item); });
    return [...unique.values()];
  });

  const khPromise = Promise.allSettled([
    searchKhanoumi(searchName),
    searchKhanoumi(product.name)
  ]).then(results => {
    const combined = [];
    results.forEach(res => {
      if (res.status === 'fulfilled' && res.value) combined.push(...res.value);
    });
    const unique = new Map();
    combined.forEach(item => { if (item.url) unique.set(item.url, item); });
    return [...unique.values()];
  });

  const promises = [
    { name: "افیلیو", p: affilioPromise },
    { name: "تکنولایف", p: tlPromise },
    { name: "خانومی", p: khPromise },
    { name: "دیجی‌کالا", p: searchDigikala(searchName) },
    { name: "ترب", p: searchTorob(searchName) },
    { name: "ایمالز", p: searchEmalls(searchName) },
    { name: "باسلام", p: searchBasalam(searchName) },
    { name: "دیوار", p: searchDivar(searchName) },
    { name: "شیپور", p: searchSheypoor(searchName) },
    { name: "مسترکالا", p: searchMasterKala(searchName) },
    { name: "دیجی‌پی", p: searchDigipay(searchName) },
    { name: "کالائوما", p: searchKalaoma(searchName) },
  ];

  const allValidResults = [];
  const verifyDigikalaOffer = createDigikalaOfferVerifier(fetchWithTimeout);

  const filterAndScore = (r) => {
    if (r.availability === false) return null;
    const isUsed = r.condition === "used" || ["دیوار", "شیپور"].includes(r.store);
    if (!isUsed && product.price && !isPriceValid(product.price, r.price)) return null;
    const match = assessProductMatch(product.name, r.name, isUsed);
    if (!match.accepted) return null;
    return { ...r, matchScore: match.score, matchConfidence: match.confidence, condition: isUsed ? "used" : "new" };
  };

      const sortAndDedupe = (results) => {
    const affiliateByDkp = new Map();
    for (const offer of results) {
      if (!offer.originalAffiliateUrl && (offer.source !== 'affilio' || offer.isMerged || !['دیجی کالا', 'دیجی‌کالا'].includes(offer.store))) continue;
      const dkp = getDigikalaProductId(offer);
      if (dkp) affiliateByDkp.set(dkp, { ...offer, url: offer.originalAffiliateUrl || offer.url });
    }
    // 1. Extract and cache Affilio Token Prefix
    results.forEach(item => {
      if (item.store === "دیجی کالا") item.store = "دیجی‌کالا";
      if (item.store === "اسنپ شاپ") item.store = "اسنپ‌شاپ";
      
      if (item.source === "affilio" && item.url && item.url.includes("publisher.affilio.ir")) {
        const pIndex = item.url.indexOf("&p=");
        if (pIndex !== -1) {
            let prefix = item.url.substring(0, pIndex);
            prefix = prefix.replace(/&utm_term=[^&]*/, "");
            globalAffilioPrefix = prefix; // Save globally for all future products!
        }
      }
    });

    const uniqueByKey = new Map();

    results.forEach(item => {
      if (item.store === "دیجی کالا") item.store = "دیجی‌کالا";
      if (item.store === "اسنپ شاپ") item.store = "اسنپ‌شاپ";
      
      const isTargetStore = item.store === "دیجی‌کالا" || item.store === "اسنپ‌شاپ";

      if (item.store === 'دیجی‌کالا' && item.priceSource === 'digikala-product-api') {
        const dkp = (item.sourceUrl || item.url || '').match(/dkp-(\d+)/i)?.[1];
        const affiliate = affiliateByDkp.get(dkp);
        if (affiliate) {
          item.sourceUrl ||= item.url;
          item.url = affiliate.url; // Preserve the supplied signed tracking link exactly.
          item.isAffiliate = true;
          item.source = 'affilio';
          item.isMerged = true;
        }
      }

      if (isTargetStore) {
        // Only Digikala relies on direct results here. Preserve SnappShop's
        // original Affilio offers and their supplied tracking links.
        if (item.store === "دیجی‌کالا" && item.source === "affilio" && !item.isMerged && !item.priceVerified) return;
        
        // 2. Digikala specific deduplication
        if (item.store === "دیجی‌کالا") {
            if (item.url && (item.url.includes("torob.com") || item.url.includes("emalls.ir"))) return;
            
        }

        // 3. UNIVERSAL AFFILIATE UPGRADE
        if (globalAffilioPrefix && !item.isAffiliate && item.url && !item.url.includes("publisher.affilio.ir")) {
            item.url = `${globalAffilioPrefix}&utm_term=${encodeURIComponent(item.name)}&p=${item.url}`;
            item.isAffiliate = true;
            item.source = "affilio"; // Preserve the source after upgrading to an affiliate link
            item.isMerged = true; // Protect it from being dropped in subsequent renders
        }
      }

      const dkp = item.store === 'دیجی‌کالا' ? getDigikalaProductId(item) : null;
      const key = dkp ? 'digikala|' + dkp : item.store + "|" + normalizeProductText(item.name) + "|" + item.price;
      const existing = uniqueByKey.get(key);
      const rank = offer => Number(offer.priceVerified === true) * 4 + Number(Boolean(offer.originalAffiliateUrl)) * 2 + Number(Boolean(offer.isAffiliate));
      if (!existing || rank(item) > rank(existing)) {
        uniqueByKey.set(key, item);
      }
    });
    
    const unique = [...uniqueByKey.values()];
    unique.sort((a, b) => Number(b.availability) - Number(a.availability) || Number(a.condition === "used") - Number(b.condition === "used") || a.price - b.price || b.matchScore - a.matchScore);
    return unique;
  };

  const wrappedPromises = promises.map(req => 
    req.p.then(async res => {
      logApiResults(req.name, res.length);
      const checked = await Promise.all(res.map(offer => verifyDigikalaOffer(offer, req.name)));
      const valid = checked.map(filterAndScore).filter(Boolean);
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

async function searchPiqoApi(productName) {
  const url = `${PIQO_API_BASE_URL}/v1/search?q=${encodeURIComponent(productName)}`;
  const response = await fetchWithTimeout(url, {
    timeout: 12000,
    logStore: "افیلیو",
    logOperation: "server-search",
    headers: { "Accept": "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parsePiqoApiResponse(await response.json());
}

// ==============================
// دیما افیلیت (Deema Universal Affiliate Link)
// ==============================
const DEEMA_UNIVERSAL_LINK = "https://deemanetwork.com/click/d/6e262f3e_1645_4f22_a310_e67585054a62";

function createDeemaLink(originalUrl) {
  if (!originalUrl) return originalUrl;
  try {
    const b64 = btoa(unescape(encodeURIComponent(originalUrl)));
    return `${DEEMA_UNIVERSAL_LINK}/${b64}`;
  } catch (e) {
    return originalUrl;
  }
}

// ==============================
// خانومی (Khanoumi) — API مستقیم
// ==============================
async function searchKhanoumi(productName) {
  try {
    const query = encodeURIComponent(productName);
    const url = `https://www.khanoumi.com/api/ntl/v1/products?query=${query}`;
    const context = beginApiRequest({ store: "خانومی", url, method: "GET", operation: "api-search" });
    const response = await fetchWithTimeout(url, {
      timeout: 10000,
      logStore: "خانومی",
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      completeApiRequest(context, { ok: false, status: response.status });
      return [];
    }
    const json = await response.json();
    const items = json?.data?.products?.items || [];
    if (!Array.isArray(items)) {
      completeApiRequest(context, { ok: true, status: 200 }, { resultCount: 0 });
      return [];
    }

    const mapped = items.map(item => {
      const price = Number(item.effectivePrice || item.basePrice || 0);
      if (price <= 0) return null;
      const originalPrice = Number(item.basePrice || price);
      const prodUrl = item.slug ? `https://www.khanoumi.com/products/${item.slug}` : `https://www.khanoumi.com/search?query=${query}`;
      const imgUrl = item.imageUrl || "";

      return {
        store: "خانومی",
        storeColor: "#E91E63",
        name: item.nameFa || productName,
        price,
        originalPrice,
        discount: Number(item.discountPercent || 0),
        url: createDeemaLink(prodUrl),
        rawUrl: prodUrl,
        image: imgUrl,
        rating: 0,
        reviewCount: 0,
        availability: item.hasStock !== false && item.isSalable !== false,
        isAffiliate: true,
        source: "deema"
      };
    }).filter(Boolean);

    completeApiRequest(context, { ok: true, status: 200 }, { resultCount: mapped.length });
    return mapped;
  } catch (e) {
    console.warn("[خانومی] خطا:", e.message);
    return [];
  }
}

// ==============================
// تکنولایف (Technolife) — SSR Data
// ==============================
async function searchTechnolife(productName) {
  try {
    const query = encodeURIComponent(productName);
    const url = `https://www.technolife.com/product/list/search?keywords=${query}`;
    const context = beginApiRequest({ store: "تکنولایف", url, method: "GET", operation: "next-data" });
    const response = await fetchWithTimeout(url, {
      timeout: 12000,
      logStore: "تکنولایف",
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    if (!response.ok) {
      completeApiRequest(context, { ok: false, status: response.status }, { error: `HTTP ${response.status}` });
      return [];
    }
    const html = await response.text();
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
    if (!m) {
      completeApiRequest(context, { ok: false, status: 200 }, { error: "No NEXT_DATA found" });
      return [];
    }
    const data = JSON.parse(m[1]);
    const queries = data?.props?.pageProps?.dehydratedState?.queries || [];
    const searchQ = queries.find(q => Array.isArray(q?.queryKey) && q.queryKey[0] === "search");
    const results = searchQ?.state?.data?.pages?.[0]?.results || [];

    const mapped = results.slice(0, 20).map(item => {
      const priceRial = item.discounted_price || item.normal_price || 0;
      const price = parsePrice(priceRial, "IRR");
      const originalPrice = parsePrice(item.normal_price || priceRial, "IRR");
      const codeNum = String(item.code || "").replace(/^TLP-/i, "");
      const slug = (item.name || "").replace(/\s+/g, "-");
      const prodUrl = codeNum ? `https://www.technolife.com/product-${codeNum}/${slug}` : url;
      const imgUrl = item.image ? (item.image.startsWith("http") ? item.image : `https://www.technolife.com${item.image}`) : "";

      return {
        store: "تکنولایف",
        storeColor: "#0D5CAB",
        name: item.name || productName,
        price,
        originalPrice,
        discount: item.discount ? parseInt(item.discount, 10) || 0 : 0,
        url: createDeemaLink(prodUrl),
        rawUrl: prodUrl,
        image: imgUrl,
        rating: item.score_avg ? Math.round(item.score_avg * 10) / 10 : 0,
        reviewCount: item.score_count || 0,
        availability: typeof item.available === "number" ? item.available > 0 : Boolean(item.available),
        isAffiliate: true,
        source: "deema"
      };
    }).filter(p => p && p.price > 0);

    completeApiRequest(context, { ok: true, status: 200 }, { resultCount: mapped.length });
    return mapped;
  } catch (e) {
    console.warn("[تکنولایف] خطا:", e.message);
    return [];
  }
}

// ==============================
// دیجی‌کالا — API رسمی (قیمت ریال)
// ==============================
async function searchDigikala(productName) {
  const query = encodeURIComponent(productName);
  const response = await fetchWithTimeout(`https://api.digikala.com/v1/search/?q=${query}&page=1`, {
    logStore: "دیجی‌کالا",
    credentials: "include",
    headers: { "Accept": "application/json" }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  const products = data?.data?.products || [];

  const verified = await Promise.all(products.slice(0, 8).map(async item => {
    if (!Number.isSafeInteger(Number(item.id)) || Number(item.id) <= 0) return null;
    const v = item.default_variant;
    // دیجی‌کالا ریال میده ÷ ۱۰ = تومان
    const price = parsePrice(v?.price?.selling_price, "IRR");
    const originalPrice = parsePrice(v?.price?.rrp_price || v?.price?.selling_price, "IRR");
    const image = item.images?.main?.url?.[0] || item.images?.list?.[0]?.url?.[0] || "";

    const candidate = {
      store: "دیجی‌کالا", storeColor: "#E42112",
      name: item.title_fa || item.title_en || productName,
      price, originalPrice,
      discount: v?.price?.discount_percent || 0,
      url: `https://www.digikala.com/product/dkp-${item.id}/`,
      image,
      rating: item.rating?.rate || 0,
      reviewCount: item.rating?.count || 0,
      availability: v?.status === "marketable",
    };
    try {
      const detail = await fetchWithTimeout(`https://api.digikala.com/v2/product/${item.id}/`, {
        timeout: 5000, logStore: 'دیجی‌کالا', logOperation: 'verify-offer',
        credentials: 'include', headers: { Accept: 'application/json' },
      });
      if (!detail.ok) return null;
      return parseDigikalaVerifiedOffer(await detail.json(), candidate, item.id);
    } catch { return null; }
  }));
  return verified.filter(Boolean);
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
// دیوار — از طریق API پیکو و Divar MCP
// ==============================
async function searchDivar(productName) {
  try {
    const url = `${PIQO_API_BASE_URL}/v1/divar/search?q=${encodeURIComponent(productName)}`;
    const response = await fetchWithTimeout(url, {
      logStore: "دیوار",
      timeout: 10000, // Backend pagination has an eight-second total budget.
      headers: {
        "Accept": "application/json",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return parsePiqoDivarResponse(await response.json());
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



// ==============================
// کالائوما (Kalaoma)
// ==============================
async function searchKalaoma(productName) {
  try {
    const query = encodeURIComponent(productName);
    const url = `https://kalaoma.com/wp-json/wc/store/products?search=${query}`;
    const response = await fetchWithTimeout(url, {
      logStore: "کالائوما",
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) return [];
    const items = await response.json();
    if (!Array.isArray(items)) return [];
    
    return items.map(item => {
      const priceStr = item.prices?.price || item.prices?.regular_price || "0";
      let price = parsePrice(priceStr, "TOMAN"); // Kalaoma usually returns minor units or exact string. Since it's IRT, parsePrice handles it.
      if (price === 0) return null;
      
      const imgUrl = item.images && item.images.length > 0 ? item.images[0].src : "";
      
      return {
        store: "کالائوما", storeColor: "#FBEE01",
        name: item.name,
        price, originalPrice: price, discount: 0,
        url: item.permalink || `https://kalaoma.com/?s=${query}&post_type=product`,
        image: imgUrl,
        rating: 0, reviewCount: 0, availability: item.is_in_stock
      };
    }).filter(p => p !== null).slice(0, 5);
  } catch (e) {
    console.warn("[کالائوما] خطا:", e.message);
    return [];
  }
}

// ==============================
// روژا شاپ (Rojashop)
// ==============================
async function searchRojashop(productName) {
  try {
    const query = encodeURIComponent(productName);
    const url = `https://rojashop.com/search?q=${query}`;
    const response = await fetchWithTimeout(url, {
      logStore: "روژا",
      headers: { 
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      }
    });
    if (!response.ok) return [];
    const resData = await response.json();
    let html = resData?.data?.products || "";
    if (typeof html !== 'string') return [];
    
    const items = [];
    // Simple regex to extract product tiles from HTML
    const productRegex = /<div class="product-item[^>]*>.*?<a href="([^"]+)".*?<img[^>]*src="([^"]+)".*?<h3[^>]*>(.*?)<\/h3>.*?<span class="price">([^<]+)<\/span>/gs;
    
    let match;
    while ((match = productRegex.exec(html)) !== null && items.length < 5) {
       const [ , pUrl, pImg, pName, pPriceStr ] = match;
       let price = parsePrice(pPriceStr.replace(/,/g, ''), "TOMAN");
       if (price > 0) {
           items.push({
             store: "روژا", storeColor: "#FF0000",
             name: pName.trim().replace(/(<([^>]+)>)/gi, ""),
             price, originalPrice: price, discount: 0,
             url: pUrl,
             image: pImg,
             rating: 0, reviewCount: 0, availability: true
           });
       }
    }
    return items;
  } catch (e) {
    console.warn("[روژا] خطا:", e.message);
    return [];
  }
}

// Dynamically set popup for restricted pages where content scripts can't run
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' || changeInfo.url) {
    void invalidateTabPage(tabId, changeInfo.url || tab.url, changeInfo.status === 'loading').catch(() => {});
  }
  if (tab.url) {
    const isRestricted = tab.url.startsWith('chrome://') || 
                         tab.url.startsWith('edge://') || 
                         tab.url.startsWith('about:') || 
                         tab.url.startsWith('https://chrome.google.com/webstore') ||
                         tab.url.startsWith('https://chromewebstore.google.com');
                         
    if (isRestricted) {
      chrome.action.setPopup({ tabId: tabId, popup: "sidebar/sidebar.html" });
    } else {
      chrome.action.setPopup({ tabId: tabId, popup: "" });
    }
  }
});

chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      const isRestricted = tab.url.startsWith('chrome://') || 
                           tab.url.startsWith('edge://') || 
                           tab.url.startsWith('about:') || 
                           tab.url.startsWith('https://chrome.google.com/webstore') ||
                           tab.url.startsWith('https://chromewebstore.google.com');
      if (isRestricted) {
        chrome.action.setPopup({ tabId: tab.id, popup: "sidebar/sidebar.html" });
      } else {
        chrome.action.setPopup({ tabId: tab.id, popup: "" });
      }
    }
  });
});
