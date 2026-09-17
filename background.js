import { isPriceValid, hasRequiredEnglishTokens, getSimilarityScore } from './filters.js';
// ==============================
// Background Service Worker
// ==============================

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PRODUCT_DETECTED") {
    chrome.storage.local.set({
      currentProduct: message.product,
      searchResults: null,
      isLoading: true,
    });

    chrome.runtime.sendMessage({ type: "PRODUCT_UPDATED", product: message.product }).catch(() => {});

    searchPrices(message.product).then(results => {
      chrome.storage.local.set({ searchResults: results, isLoading: false });
      chrome.runtime.sendMessage({ type: "RESULTS_UPDATED", results }).catch(() => {});
    });

    sendResponse({ success: true });
  }

  if (message.type === "OPEN_SIDEBAR") {
    chrome.sidePanel.open({ tabId: sender.tab.id });
    sendResponse({ success: true });
  }

  return true;
});

// ==============================
// جستجوی موازی همه فروشگاه‌ها
// ==============================
async function searchPrices(product) {
  console.log("[قیمت‌یاب] جستجوی اولیه:", product.name);

  // ساده‌سازی نام برای جستجوی بهتر در دیجی‌کالا و باسلام
  // گرفتن حداکثر ۵ کلمه اول برای فرار از عنوان‌های طولانی دیوار و شیپور
  let searchName = product.name;
  const words = searchName.split(/\s+/);
  if (words.length > 5) {
    searchName = words.slice(0, 4).join(" ");
  }

  console.log("[قیمت‌یاب] عبارت جستجو:", searchName);

  const searches = await Promise.allSettled([
    searchDigikala(searchName),
    searchTorob(searchName),
    searchEmalls(searchName),
    searchBasalam(searchName),
    searchDivar(searchName),
    searchSheypoor(searchName),
  ]);

  const results = [];
  const names = ["دیجی‌کالا", "ترب", "ایمالز", "باسلام", "دیوار", "شیپور"];
  searches.forEach((s, i) => {
    if (s.status === "fulfilled") {
      console.log(`[${names[i]}] ✅ ${s.value.length} نتیجه`);
      results.push(...s.value);
    } else {
      console.warn(`[${names[i]}] ❌`, s.reason?.message || s.reason);
    }
  });

  
  // اعمال فیلترهای هوشمند Phia
  let finalResults = [];
  results.forEach(r => {
    // ۱. فیلتر قیمت (اگه قیمت اصلی رو داریم)
    if (product.price && !isPriceValid(product.price, r.price)) {
      console.log(`[حذف - قیمت] ${r.name} (${r.price} vs ${product.price})`);
      return;
    }
    
    // ۲. فیلتر کلمات انگلیسی (مثل مدل گوشی یا حافظه)
    if (!hasRequiredEnglishTokens(product.name, r.name)) {
      console.log(`[حذف - نامرتبط] ${r.name}`);
      return;
    }
    
    // ۳. فیلتر شباهت نام
    const sim = getSimilarityScore(product.name, r.name);
    if (sim < 0.25) { // حداقل ۲۵ درصد کلمات اصلی باید در نتیجه باشد
      console.log(`[حذف - شباهت کم] ${r.name} (نمره: ${sim.toFixed(2)})`);
      return;
    }
    
    finalResults.push(r);
  });

  finalResults.sort((a, b) => a.price - b.price);
  return finalResults;
}

// ==============================
// دیجی‌کالا — API رسمی (قیمت ریال)
// ==============================
async function searchDigikala(productName) {
  const query = encodeURIComponent(productName);
  const response = await fetch(`https://api.digikala.com/v1/search/?q=${query}&page=1`, {
    headers: { "Accept": "application/json" }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  const products = data?.data?.products || [];

  return products.slice(0, 8).map(item => {
    const v = item.default_variant;
    // دیجی‌کالا ریال میده ÷ ۱۰ = تومان
    const price = Math.round((v?.price?.selling_price || 0) / 10);
    const originalPrice = Math.round((v?.price?.rrp_price || v?.price?.selling_price || 0) / 10);
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

  const response = await fetch(url, {
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
    const price = item.price || 0;
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
    const response = await fetch(`https://www.emalls.ir/search.aspx?keyword=${query}`, {
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
    const itemPattern = /class="[^"]*ProductItem[^"]*"([\s\S]{0,3000}?)(?=class="[^"]*ProductItem[^"]*"|<\/section|$)/gi;
    for (const match of html.matchAll(itemPattern)) {
      const block = match[1];
      const name = block.match(/(?:title|alt)="([^"]{5,120})"/)?.[1];
      const priceText = block.match(/([\d,]{5,})\s*تومان/)?.[1];
      const urlPath = block.match(/href="(\/[^"]+)"/)?.[1];
      const img = block.match(/src="(https?:\/\/[^"]+\.(jpg|png|webp)[^"]*)"/i)?.[1];

      if (name && priceText) {
        const price = parseInt(priceText.replace(/,/g, ""));
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
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json"
        }
      });
      if (!response.ok) continue;

      const data = await response.json();
      const items = data?.products || data?.data?.items || data?.items || data?.results || [];
      if (!Array.isArray(items) || items.length === 0) continue;

      return items.slice(0, 5).map(item => {
        const price = parseInt(String(item.price || item.sell_price || 0).replace(/[^\d]/g, "")) || 0;
        return {
          store: "باسلام", storeColor: "#8B5CF6",
          name: item.name || item.title || productName,
          price, originalPrice: price, discount: 0,
          url: item.absolute_url ? `https://basalam.com${item.absolute_url}` : `https://basalam.com/s?q=${query}`,
          image: item.thumbnail || item.image || item.photo?.url || item.cover || "",
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
    const url = "https://api.divar.ir/v8/web-search/iran";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        json_schema: { query: productName }
      })
    });
    
    if (!response.ok) return [];

    const data = await response.json();
    const widgets = data?.web_widgets?.post_list || [];
    
    return widgets.map(w => {
      const item = w.data;
      if (!item) return null;
      
      const priceText = item.description || "";
      // فیلتر کردن کالاهای توافقی و بدون قیمت
      if (priceText.includes("توافقی") || priceText.includes("معاوضه") || !priceText.includes("تومان")) {
        return null;
      }
      
      const price = parseInt(priceText.replace(/[^\d]/g, "")) || 0;
      if (price === 0) return null;

      const token = item.action?.payload?.token;
      
      return {
        store: "دیوار", storeColor: "#A62626",
        name: item.title || productName,
        price, originalPrice: price, discount: 0,
        url: token ? `https://divar.ir/v/${token}` : `https://divar.ir/s/iran?q=${encodeURIComponent(productName)}`,
        image: item.image_url || item.image || "",
        rating: 0, reviewCount: 0, availability: true,
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
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      }
    });
    
    if (!response.ok) return [];

    const data = await response.json();
    const items = data?.data?.items || [];
    
    return items.map(item => {
      const attributes = item.attributes;
      if (!attributes) return null;
      
      // بررسی قیمت
      const priceArr = attributes.price || [];
      const priceObj = priceArr.length > 0 ? priceArr[0] : null;
      if (!priceObj) return null;
      
      const amountStr = priceObj.amount || "";
      if (amountStr.includes("توافقی") || amountStr.includes("معاوضه")) return null;
      
      const price = parseInt(amountStr.replace(/[^\d]/g, "")) || 0;
      if (price === 0) return null;
      
      return {
        store: "شیپور", storeColor: "#0050FF",
        name: attributes.title || productName,
        price, originalPrice: price, discount: 0,
        url: attributes.url || `https://www.sheypoor.com/search?q=${query}`,
        image: attributes.image || "",
        rating: 0, reviewCount: 0, availability: true,
      };
    }).filter(p => p !== null).slice(0, 5);
  } catch (e) {
    console.warn("[شیپور] خطا:", e.message);
    return [];
  }
}
