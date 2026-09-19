import {
  assessProductMatch,
  buildSearchQuery,
  isPriceValid,
  normalizeProductText,
} from './filters.js';
import { parsePrice } from './price-utils.js';
import { getTabStateKey, TabSearchRegistry } from './tab-state.js';

// ==============================
// Utility: Fetch with Timeout
// ==============================
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 6000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal  
    });
    clearTimeout(id);
    return response;
  } catch (error) {
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

function broadcastTabUpdate(type, tabId, payload = {}) {
  chrome.runtime.sendMessage({ type, tabId, ...payload }).catch(() => {});
}

function persistTabState(tabId, state) {
  return chrome.storage.local.set({ [getTabStateKey(tabId)]: state });
}

function startTabSearch(tabId, product) {
  if (!Number.isInteger(tabId) || !product?.name) return;

  const requestId = tabSearches.begin(tabId);

  const loadingState = {
    currentProduct: product,
    searchResults: null,
    isLoading: true,
    error: null,
    requestId,
  };
  persistTabState(tabId, loadingState);
  broadcastTabUpdate("PRODUCT_UPDATED", tabId, { product, requestId });

  searchPrices(product)
    .then(results => {
      if (!tabSearches.isCurrent(tabId, requestId)) return;
      return persistTabState(tabId, {
        currentProduct: product,
        searchResults: results,
        isLoading: false,
        error: null,
        requestId,
      }).then(() => broadcastTabUpdate("RESULTS_UPDATED", tabId, { results, requestId }));
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
      }).then(() => broadcastTabUpdate("SEARCH_FAILED", tabId, { error: message, requestId }));
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PRODUCT_DETECTED") {
    const tabId = sender.tab?.id;
    startTabSearch(tabId, message.product);
    sendResponse({ success: Number.isInteger(tabId), tabId });
    return false;
  }

  if (message.type === "RETRY_SEARCH") {
    const tabId = sender.tab?.id ?? message.tabId;
    startTabSearch(tabId, message.product);
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

  return false;
});

chrome.tabs.onRemoved.addListener(tabId => {
  tabSearches.clear(tabId);
  chrome.storage.local.remove(getTabStateKey(tabId));
});

// ==============================
// جستجوی موازی همه فروشگاه‌ها
// ==============================
async function searchPrices(product) {
  console.log("[قیمت‌یاب] جستجوی اولیه:", product.name);

  const searchName = buildSearchQuery(product.name);

  console.log("[قیمت‌یاب] عبارت جستجو:", searchName);

  const searches = await Promise.allSettled([
    searchDigikala(searchName),
    searchTorob(searchName),
    searchEmalls(searchName),
    searchBasalam(searchName),
    searchDivar(searchName),
    searchSheypoor(searchName),
    searchSnappShop(searchName),
  ]);

  const results = [];
  const names = ["دیجی‌کالا", "ترب", "ایمالز", "باسلام", "دیوار", "شیپور", "اسنپ‌شاپ"];
  searches.forEach((s, i) => {
    if (s.status === "fulfilled") {
      console.log(`[${names[i]}] ✅ ${s.value.length} نتیجه`);
      results.push(...s.value);
    } else {
      console.warn(`[${names[i]}] ❌`, s.reason?.message || s.reason);
    }
  });

  
  const finalResults = [];
  results.forEach(r => {
    const isUsed = r.condition === "used" || ["دیوار", "شیپور"].includes(r.store);
    if (!isUsed && product.price && !isPriceValid(product.price, r.price)) {
      console.log(`[حذف - قیمت] ${r.name} (${r.price} vs ${product.price})`);
      return;
    }

    const match = assessProductMatch(product.name, r.name);
    if (!match.accepted) {
      console.log(`[حذف - تطبیق] ${r.name} (نمره: ${match.score.toFixed(2)}، ${match.reasons.join(",")})`);
      return;
    }
    finalResults.push({ ...r, matchScore: match.score, matchConfidence: match.confidence, condition: isUsed ? "used" : "new" });
  });

  const uniqueResults = [...new Map(finalResults.map(item => [
    `${item.store}|${normalizeProductText(item.name)}|${item.price}`,
    item,
  ])).values()];

  uniqueResults.sort((a, b) =>
    Number(b.availability) - Number(a.availability)
    || Number(a.condition === "used") - Number(b.condition === "used")
    || b.matchScore - a.matchScore
    || a.price - b.price
  );
  return uniqueResults;
}

// ==============================
// دیجی‌کالا — API رسمی (قیمت ریال)
// ==============================
async function searchDigikala(productName) {
  const query = encodeURIComponent(productName);
  const response = await fetchWithTimeout(`https://api.digikala.com/v1/search/?q=${query}&page=1`, {
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
    // قیمت مستقیم تومانه در ترب
    const price = parsePrice(item.price, item.price_text || "TOMAN");
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
    const response = await fetchWithTimeout(`https://www.emalls.ir/search.aspx?keyword=${query}`, {
      headers: {
        "Accept": "text/html",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        "Referer": "https://www.emalls.ir/"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const results = [];

    // استخراج اطلاعات محصولات از HTML
    const itemPattern = /class="[^"]*ProductItem[^"]*"([\s\S]{1,3000}?)(?=(?:class="[^"]*ProductItem[^"]*"|<\/section|<\/div>|$))/gi;
    for (const match of html.matchAll(itemPattern)) {
      const block = match[1];
      const name = block.match(/(?:title|alt)="([^"]{5,120})"/)?.[1];
      const priceText = block.match(/([\d,]{5,})\s*تومان/)?.[1];
      const urlPath = block.match(/href="(\/[^"]+)"/)?.[1];
      const img = block.match(/src="(https?:\/\/[^"]+\.(jpg|png|webp)[^"]*)"/i)?.[1];

      if (name && priceText) {
        const price = parsePrice(priceText, "TOMAN");
        if (price > 0) {
          results.push({
            store: "ایمالز", storeColor: "#F5A623",
            name, price, originalPrice: price, discount: 0,
            url: urlPath ? `https://www.emalls.ir${urlPath}` : `https://www.emalls.ir/search.aspx?keyword=${query}`,
            image: img || "", rating: 0, reviewCount: 0, availability: true,
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
        headers: {
          "Accept": "application/json"
        }
      });
      if (!response.ok) continue;

      const data = await response.json();
      const items = data?.products || data?.data?.items || data?.items || data?.results || [];
      if (!Array.isArray(items) || items.length === 0) continue;

      return items.slice(0, 5).map(item => {
        const price = parsePrice(item.price || item.sell_price || 0, item.currency || item.currency_code || "TOMAN");
        return {
          store: "باسلام", storeColor: "#8B5CF6",
          name: item.name || item.title || productName,
          price, originalPrice: price, discount: 0,
          url: item.absolute_url ? `https://basalam.com${item.absolute_url}` : `https://basalam.com/s?q=${query}`,
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
      
      const price = parsePrice(amountStr, priceObj.currency || priceObj.unit || "TOMAN");
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
  chrome.tabs.sendMessage(tabId, { type: "SNAPPSHOP_SEARCH", query: productName }, (response) => {
    if (chrome.runtime.lastError || !response) {
      console.warn("[اسنپ‌شاپ] Bridge failed:", chrome.runtime.lastError?.message);
      resolve(searchSnappShopDirect(productName));
      return;
    }
    if (response.error) {
      console.warn("[اسنپ‌شاپ] Bridge error:", response.error);
      resolve([]);
      return;
    }
    resolve(parseSnappShopItems(response.items, productName));
  });
}

async function searchSnappShopDirect(productName) {
  // Fallback: direct fetch (may get 403 from ArvanCloud on some requests)
  try {
    const query = encodeURIComponent(productName);
    const url = `https://apix.snappshop.ir/search/v1?query=${query}&lat=35.6969675&lng=51.4080675`;
    const response = await fetchWithTimeout(url, {
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
