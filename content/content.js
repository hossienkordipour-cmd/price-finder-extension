// ==============================
// Content Script
// تشخیص صفحه محصول در سایت‌های مختلف
// ==============================

(function () {
  "use strict";

  // ==============================
  // پاکسازی نام محصول برای جستجوی دقیق‌تر
  // ==============================


  function getAbsoluteUrl(value) {
    const url = typeof value === "object" ? value?.url || value?.contentUrl || value?.src : value;
    if (!url) return null;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return window.location.origin + url;
    return url;
  }

  function getImageFromElement(element) {
    if (!element) return null;
    const srcSet = element.getAttribute("srcset") || element.getAttribute("data-srcset") || "";
    const firstSrcSetUrl = srcSet.split(",")[0]?.trim().split(/\s+/)[0];
    return getAbsoluteUrl(
      element.currentSrc
      || element.getAttribute("src")
      || element.getAttribute("data-src")
      || element.getAttribute("data-lazy-src")
      || firstSrcSetUrl
    );
  }

  function toEnglishDigits(str) {
    if (!str) return str;
    const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
    const arabicNumbers  = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    for (let i = 0; i < 10; i++) {
      str = String(str).replace(persianNumbers[i], i).replace(arabicNumbers[i], i);
    }
    return str;
  }

  // A number without its unit is not safe: Digikala exposes both toman UI
  // values and raw rial values in its SPA markup.
  function parsePriceInTomans(value, unitText, fallbackUnit = "TOMAN") {
    const amount = parseInt(toEnglishDigits(value).replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const explicitUnit = String(unitText || "");
    const hasExplicitUnit = /(?:تومان|ریال|\birr\b|\birt\b|\brial\b|\btoman\b)/i.test(explicitUnit);
    const resolvedUnit = hasExplicitUnit ? explicitUnit : fallbackUnit;
    return /(?:ریال|\birr\b|\brial\b)/i.test(resolvedUnit || "")
      ? Math.round(amount / 10)
      : amount;
  }
  function cleanProductName(name) {
    if (!name) return null;

    // حذف پیشوندهای رایج فارسی
    const persianPrefixes = [
      /^خرید و قیمت\s*/i,
      /^خرید\s*/i,
      /^قیمت\s*/i,
      /^فروش\s*/i,
      /^مشخصات\s*/i,
    ];
    for (const prefix of persianPrefixes) {
      name = name.replace(prefix, "");
    }

    // حذف نام فروشگاه‌ها از انتها یا وسط (با |)
    name = name.split("|")[0].trim();
    name = name.split("–")[0].trim();
    name = name.split(" - ترب")[0].trim();
    name = name.replace(/\s*[\|ترب|دیجی‌کالا|ایمالز|باسلام]+\s*$/i, "").trim();

    // حذف فاصله‌های اضافه
    name = name.replace(/\s+/g, " ").trim();

    return name.length > 2 ? name : null;
  }

  let lastUrl = location.href;
  let lastDetectedKey = null;
  let detectionTimer = null;


  // نظارت بر تغییر URL (SPA)
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      lastDetectedKey = null; // Force reset on navigation
      if (document.getElementById('piqo-widget-container')) {
        removePiqoUI(); // Only clear if widget was present
      }
      scheduleDetection();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  function init() { scheduleDetection(); }

let detectionInterval = null;
  function scheduleDetection() {
    clearTimeout(detectionTimer);
    clearInterval(detectionInterval);
    
    let attempts = 0;
    // Initial quick check
    detectionTimer = setTimeout(() => {
      detectProduct();
      // Start polling if not found immediately
      detectionInterval = setInterval(() => {
        attempts++;
        detectProduct();
        if (attempts > 10) clearInterval(detectionInterval);
      }, 1500);
    }, 500);
  }



  function removePiqoUI() {
    const widget = document.getElementById('piqo-widget-container');
    if (widget) widget.remove();
    const popup = document.getElementById('piqo-popup-iframe');
    if (popup) popup.remove();
    lastDetectedKey = null; // reset state
  }

  // ==============================
  // تشخیص صفحه محصول
  // ==============================
  function detectProduct() {
    const hostname = window.location.hostname;
    let product = null;

    if (hostname.includes("digikala.com")) {
      product = extractDigikala();
    } else if (hostname.includes("torob.com")) {
      product = extractTorob();
    } else if (hostname.includes("emalls.ir")) {
      product = extractEmalls();
    } else if (hostname.includes("basalam.com")) {
      product = extractBasalam();
    } else if (hostname.includes("divar.ir")) {
      product = extractDivar();
    } else if (hostname.includes("sheypoor.com")) {
      product = extractSheypoor();
    } else {
      product = extractGeneric();
    }

if (product && product.name) {
      clearInterval(detectionInterval);
      const detectionKey = `${product.sourceUrl || location.href}|${product.name}|${product.price || ""}`;
      if (detectionKey !== lastDetectedKey) {
        console.log("[قیمت‌یاب] محصول:", product.name);
        lastDetectedKey = detectionKey;
        chrome.runtime.sendMessage({ type: "PRODUCT_DETECTED", product });
        injectFloatingButton();
      } else {
        // Just make sure widget is injected if it was somehow removed
        injectFloatingButton();
      }
    } else {
      // Not a product page anymore (SPA navigation to home page, etc.)
      // Only remove if the floating widget is present (which means a product was previously detected).
      if (document.getElementById('piqo-widget-container')) {
        removePiqoUI();
      }
    }
  }

  // ==============================
  // دیجی‌کالا
  // ==============================
  function extractDigikala() {
    let name = null, price = null, image = null;

    // H1 is the most reliable source for current SPA state
    const h1 = document.querySelector("h1");
    if (h1) {
      // Sometimes H1 has badges like <span>ناموجود</span>شامپو...
      // This causes textContent to return "ناموجودشامپو"
      name = h1.textContent.trim();
      // Remove known problematic badges at the start of the string
      name = name.replace(/^(ناموجود|توقف تولید)\s*/, '');
    }
    
    if (!name) {
      const og = document.querySelector('meta[property="og:title"]')?.content;
      if (og && !og.includes("بزرگترین فروشگاه")) name = og;
    }

    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        const d = JSON.parse(script.textContent);
        const p = Array.isArray(d) ? d.find(x => x["@type"] === "Product") : (d["@type"] === "Product" ? d : null);
        if (p) { 
          if (!name) continue;
          if (name && p.name && !p.name.includes(name.substring(0, 10)) && !name.includes(p.name.substring(0, 10))) {
             continue;
          }
          // فقط تصویر از ld+json بگیر — قیمت رو نه! (دیجی‌کالا ریال میده ولی بقیه تومان)
          image = getAbsoluteUrl(Array.isArray(p.image) ? p.image[0] : p.image);
          break;
        }
      }
    } catch {}

    if (!image || !image.includes("/digikala-products/")) {
      const gallerySelectors = [
        '[data-testid="product-image"] img',
        '[data-cro="pdp-main-image"] img',
        'picture img[src*="/digikala-products/"]',
        'img[src*="/digikala-products/"]',
        'img[srcset*="/digikala-products/"]'
      ];
      for (const selector of gallerySelectors) {
        const candidate = getImageFromElement(document.querySelector(selector));
        if (candidate?.includes("/digikala-products/")) {
          image = candidate;
          break;
        }
      }
    }

    if (!image) {
      image = getAbsoluteUrl(document.querySelector('meta[property="og:image"]')?.content);
    }

    if (!price) {
      const priceSelectors = [
        '[data-testid="price-no-discount"]',
        '[data-testid="price-discount"]',
        '[data-cro="price"]',
        '.text-h4.color-800',
        '.text-h4.text-neutral-800',
        '.text-h4.text-neutral-900',
        '.text-h4.color-900',
        'div[class*="price"] span[class*="text-h4"]'
      ];
      for (const sel of priceSelectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el && el.textContent) {
            const unitText = `${el.textContent} ${el.parentElement?.textContent || ""}`;
            const hasKnownUnit = /(?:تومان|ریال|\birr\b|\brial\b)/i.test(unitText);
            let txt = toEnglishDigits(el.textContent).replace(/[^0-9]/g, '');
            // Price must be at least 4 digits (1,000 تومان)
            if (txt.length > 3 && hasKnownUnit) {
              const style = window.getComputedStyle(el);
              if (style.textDecoration.includes('line-through') || el.classList.contains('line-through') || el.closest('del, s, .line-through')) continue;
              if (el.tagName === 'H1' || el.closest('h1')) continue;
              
              price = parsePriceInTomans(txt, unitText);
              break;
            }
          }
        }
        if (price) break;
      }
    }

    // Absolute Final DOM Scanner (The Toman strategy)
    if (!price || isNaN(price) || price === 0) {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('سبد خرید'));
      const scope = btn ? (btn.closest('article') || btn.closest('div[class*="flex"]')?.parentElement || document.body) : document.body;
      
      const tomans = Array.from(scope.querySelectorAll('*')).filter(el => {
          return el.childNodes.length === 1 && el.textContent.trim().includes('تومان');
      });
      
      let bestPrice = null;
      for (const t of tomans) {
          let text = toEnglishDigits(t.textContent).replace(/[^0-9]/g, '');
          let prevText = t.previousElementSibling ? toEnglishDigits(t.previousElementSibling.textContent).replace(/[^0-9]/g, '') : '';
          
          let priceNum = 0;
          let targetEl = null;
          
          if (prevText.length >= 4) {
              priceNum = parseInt(prevText);
              targetEl = t.previousElementSibling;
          } else if (text.length >= 4) {
              priceNum = parseInt(text);
              targetEl = t;
          }
          
          if (priceNum > 50000 && targetEl) {
             if (targetEl.closest('del, s, .line-through') || window.getComputedStyle(targetEl).textDecoration.includes('line-through')) continue;
             if (!bestPrice || priceNum < bestPrice) bestPrice = priceNum; 
          }
      }
      if (bestPrice) price = bestPrice;
    }

    if (name) name = cleanProductName(name);

    // Strict validation
    if (!name || name.includes("بزرگترین فروشگاه") || name.includes("فروشگاه اینترنتی")) return null;

    return {
      name, image, source: "digikala", store: "دیجی‌کالا", sourceUrl: window.location.href,
      price: price ? parsePriceInTomans(price, "تومان") : null,
    };
  }

  // ==============================
  // ترب — صفحه محصول
  // ==============================
  function extractTorob() {
    if (!window.location.pathname.startsWith("/p/")) return null;

    let name = null, price = null, image = null;

    name = document.querySelector("h1")?.textContent?.trim();
    if (!name) name = document.querySelector('meta[property="og:title"]')?.content;
    
    try {
      const ld = document.querySelector('script[type="application/ld+json"]');
      if (ld) {
        const d = JSON.parse(ld.textContent);
        const p = Array.isArray(d) ? d.find(x => x["@type"] === "Product") : d;
        if (p) {
          const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
          const rawPrice = offer?.price || offer?.lowPrice;
          const priceUnit = offer?.priceCurrency || offer?.priceSpecification?.priceCurrency;
          // Torob's structured price is commonly IRR even though the page shows toman.
          if (rawPrice) price = parsePriceInTomans(rawPrice, priceUnit, "IRR");
        }
      }
    } catch {}

    image = getAbsoluteUrl(document.querySelector('meta[property="og:image"]')?.content);

    if (name) name = cleanProductName(name);
    if (!name || name.length < 3) return null;
    
    return { name, image, source: "torob", store: "ترب", sourceUrl: window.location.href, price };
  }
  function extractEmalls() {
    if (window.location.pathname === "/" || window.location.pathname.toLowerCase().includes("search") || window.location.pathname.includes("لیست-قیمت")) return null;

    let name = document.querySelector('meta[property="og:title"]')?.content
      || document.querySelector("h1")?.textContent?.trim();
    const image = getAbsoluteUrl(document.querySelector('meta[property="og:image"]')?.content);

    if (name) name = cleanProductName(name);
    if (!name) return null;
    return { name, image, source: "emalls", store: "ایمالز", sourceUrl: window.location.href, price: null };
  }

  // ==============================
  // باسلام
  // ==============================
  function extractBasalam() {
    if (window.location.pathname === "/" || window.location.pathname.toLowerCase().includes("search")) return null;

    let name = document.querySelector("h1")?.textContent?.trim()
      || document.querySelector('meta[property="og:title"]')?.content;
    
    let image = getAbsoluteUrl(document.querySelector('meta[property="og:image"]')?.content);
    
    if (!image) {
      if (name) {
        const imgByAlt = document.querySelector(`img[alt="${name}"]`);
        if (imgByAlt) image = getAbsoluteUrl(imgByAlt.src || imgByAlt.getAttribute("data-src"));
      }
      if (!image) {
        const allImgs = Array.from(document.querySelectorAll("img"));
        const productImg = allImgs.find(img => {
          const src = img.src || img.getAttribute("data-src") || "";
          return src.includes('800X800') || src.includes('512X512') || (src.includes('.jpg') && !src.includes('avatar'));
        });
        if (productImg) image = getAbsoluteUrl(productImg.src || productImg.getAttribute("data-src"));
      }
    }

    if (name) name = cleanProductName(name);
    if (!name) return null;
    return { name, image, source: "basalam", store: "باسلام", sourceUrl: window.location.href, price: null };
  }

  // ==============================
  // عمومی (Schema.org)
  // ==============================
  function extractGeneric() {
    let name = null;
    let price = null;
    let image = null;

    // 1. Try JSON-LD
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        const data = JSON.parse(script.textContent);
        
        let p = null;
        if (Array.isArray(data)) {
          p = data.find(x => x["@type"] === "Product");
        } else if (data["@graph"]) {
          p = data["@graph"].find(x => x["@type"] === "Product");
        } else if (data["@type"] === "Product") {
          p = data;
        }

        if (p) {
          if (p.name) name = p.name;
          if (p.image) image = Array.isArray(p.image) ? p.image[0] : (typeof p.image === 'object' ? p.image.url : p.image);
          
          let offer = p.offers;
          if (Array.isArray(p.offers)) offer = p.offers[0];
          if (offer && (offer.price || offer.lowPrice)) {
             price = parsePriceInTomans(offer.price || offer.lowPrice, offer.priceCurrency);
          }
          break;
        }
      }
    } catch (e) {}

    // 2. Try Open Graph / Microdata
    const hasProductType = document.querySelector('meta[property="og:type"]')?.content?.includes("product");
    
    if (!name) name = document.querySelector('meta[property="og:title"]')?.content || document.querySelector('[itemprop="name"]')?.textContent?.trim() || document.querySelector("h1")?.textContent?.trim();
    if (!image) image = document.querySelector('meta[property="og:image"]')?.content;
    image = getAbsoluteUrl(image);
    
    if (!price) {
       const metaPrice = document.querySelector('meta[property="product:price:amount"]')?.content;
       const metaCurrency = document.querySelector('meta[property="product:price:currency"]')?.content;
       if (metaPrice) price = parsePriceInTomans(metaPrice, metaCurrency);
    }

    if (!name) return null;
    name = cleanProductName(name);
    if (!name || name.length < 3) return null;

    // Ensure it's truly a product page (to avoid activating on random articles)
    const isLikelyProduct = hasProductType || price > 0 || document.querySelector('[itemtype*="schema.org/Product"]');
    if (!isLikelyProduct) return null;

    return { 
      name, 
      image, 
      source: "generic", 
      store: window.location.hostname.replace("www.", ""), 
      sourceUrl: window.location.href, 
      price: price 
    };
  }

  // ==============================
  // دیوار
  // ==============================
  function extractDivar() {
    if (!window.location.pathname.includes("/v/")) return null;

    let name = document.querySelector("h1")?.textContent?.trim()
      || document.querySelector('meta[property="og:title"]')?.content;
    const image = getAbsoluteUrl(document.querySelector('meta[property="og:image"]')?.content);

    if (name) name = cleanProductName(name);
    if (!name) return null;
    return { name, image, source: "divar", store: "دیوار", sourceUrl: window.location.href, price: null };
  }

  // ==============================
  // شیپور
  // ==============================
  function extractSheypoor() {
    if (window.location.pathname === "/" || window.location.pathname.toLowerCase().includes("search") || window.location.pathname.includes("/s/")) return null;

    let name = document.querySelector("h1")?.textContent?.trim()
      || document.querySelector('meta[property="og:title"]')?.content;
    const image = getAbsoluteUrl(document.querySelector('meta[property="og:image"]')?.content);

    if (name) name = cleanProductName(name);
    if (!name) return null;
    return { name, image, source: "sheypoor", store: "شیپور", sourceUrl: window.location.href, price: null };
  }
  init();
})();




// ==============================
// Advanced Floating Widget (Piqo Button)
// ==============================

// ==============================
// Popup UI (Iframe Overlay)
// ==============================

function togglePiqoPopup(isLeft) {
  let popup = document.getElementById('piqo-popup-iframe');
  let widget = document.getElementById('piqo-widget-container');
  
  if (!popup) {
    popup = document.createElement('iframe');
    popup.id = 'piqo-popup-iframe';
    popup.src = chrome.runtime.getURL('sidebar/sidebar.html');
    popup.style.cssText = `
      position: fixed;
      top: 8px;
      width: 380px;
      height: calc(100vh - 16px);
      max-height: 800px;
      border: 1px solid rgba(0,0,0,0.05);
      border-radius: 24px;
      box-shadow: 0 12px 36px rgba(10, 10, 10, 0.12);
      z-index: 2147483646;
      background: #F5F7F6;
      display: none;
      opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      color-scheme: light;
    `;
    document.body.appendChild(popup);
  }

  const slideStart = isLeft ? 'translateX(-40px)' : 'translateX(40px)';

  // Update position
  if (isLeft) {
    popup.style.right = 'auto';
    popup.style.left = '8px';
  } else {
    popup.style.left = 'auto';
    popup.style.right = '8px';
  }

  // Toggle
  if (popup.style.display === 'none' || popup.style.opacity === '0') {
    // Prep animation
    popup.style.transform = slideStart;
    popup.style.display = 'block';
    
    // Hide Widget
    if (widget) {
      widget.style.transition = 'opacity 0.2s ease';
      widget.style.opacity = '0';
      widget.style.pointerEvents = 'none';
    }

    // force reflow
    void popup.offsetWidth;
    popup.style.opacity = '1';
    popup.style.transform = 'translateX(0)';
  } else {
    popup.style.opacity = '0';
    popup.style.transform = slideStart;
    
    // Show Widget
    if (widget) {
      widget.style.opacity = '1';
      widget.style.pointerEvents = 'auto';
    }

    setTimeout(() => {
      if (popup.style.opacity === '0') popup.style.display = 'none';
    }, 300);
  }
}

// Listen for close request from the iframe
window.addEventListener('message', (event) => {
  if (event.data === 'CLOSE_PIQO_POPUP') {
    let popup = document.getElementById('piqo-popup-iframe');
    let widget = document.getElementById('piqo-widget-container');
    
    if (popup) {
      const isLeft = popup.style.left === '8px';
      popup.style.opacity = '0';
      popup.style.transform = isLeft ? 'translateX(-40px)' : 'translateX(40px)';
      
      if (widget) {
        widget.style.opacity = '1';
        widget.style.pointerEvents = 'auto';
      }
      
      setTimeout(() => { popup.style.display = 'none'; }, 300);
    }
  }
});



function injectFloatingButton() {
  if (document.getElementById('piqo-widget-container')) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'piqo-widget-container';
  wrapper.style.cssText = `
    position: fixed;
    right: 0px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2147483647; direction: ltr;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  `;

  wrapper.innerHTML = `
    <style>
      #piqo-widget-container .piqo-control {
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
      }
      #piqo-widget-container:hover .piqo-control {
        opacity: 1;
        visibility: visible;
      }
      .piqo-btn-core {
        width: 54px;
        height: 54px;
        background: #22F498;
        border-radius: 27px 0 0 27px;
        box-shadow: -4px 4px 15px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: border-radius 0.3s ease, filter 0.2s ease;
      }
      .piqo-btn-core:hover {
        filter: brightness(1.04);
      }
      /* When snapped to left */
      #piqo-widget-container.piqo-left .piqo-btn-core {
        border-radius: 0 27px 27px 0;
        box-shadow: 4px 4px 15px rgba(0, 0, 0, 0.15);
      }
      .piqo-logo-mark {
        display: block;
        width: 21px;
        height: 26px;
      }
      #piqo-widget-container.piqo-left .piqo-logo-mark {
        margin-left: -4px;
      }
      #piqo-widget-container:not(.piqo-left) .piqo-logo-mark {
        margin-right: -4px;
      }
      
      .piqo-close-btn {
        width: 22px;
        height: 22px;
        background: white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-family: sans-serif;
        font-size: 12px;
        font-weight: bold;
        color: #666;
      }
      .piqo-close-btn:hover { background: #f1f1f1; color: #E42112; }
      
      .piqo-row {
        display: flex;
        align-items: center;
      }
      .piqo-grab {
        cursor: grab;
        padding: 4px 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
    
    <div class="piqo-control piqo-close-btn" id="piqo-close" title="بستن موقت قیمت‌یاب">✕</div>
    <div class="piqo-row">
      <div class="piqo-control piqo-grab" id="piqo-grab-left">
        <svg width="12" height="16" viewBox="0 0 12 16" fill="#0A0A0A" style="opacity: 0.4;">
          <circle cx="4" cy="4" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="4" cy="12" r="1.5"/>
          <circle cx="8" cy="4" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="12" r="1.5"/>
        </svg>
      </div>
      <div class="piqo-btn-core" id="piqo-main-btn">
        <svg class="piqo-logo-mark" viewBox="0 0 510 626" aria-hidden="true" focusable="false">
          <path fill="#081011" d="M0 239h145v314a72.5 72.5 0 0 1-145 0z"/>
          <path fill="#081011" fill-rule="evenodd"
            d="M0 239a255 239 0 1 0 510 0A255 239 0 1 0 0 239Zm150 0a105 105 0 1 1 210 0 105 105 0 1 1-210 0Z"/>
        </svg>
      </div>
      <div class="piqo-control piqo-grab" id="piqo-grab-right" style="display:none;">
        <svg width="12" height="16" viewBox="0 0 12 16" fill="#0A0A0A" style="opacity: 0.4;">
          <circle cx="4" cy="4" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="4" cy="12" r="1.5"/>
          <circle cx="8" cy="4" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="12" r="1.5"/>
        </svg>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);

  // --- Drag and Drop Logic ---
  let isDragging = false;
  let hasMoved = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;

  const mainBtn = wrapper.querySelector('#piqo-main-btn');
  const closeBtn = wrapper.querySelector('#piqo-close');
  const grabLeft = wrapper.querySelector('#piqo-grab-left');
  const grabRight = wrapper.querySelector('#piqo-grab-right');

  wrapper.addEventListener('mousedown', (e) => {
    if (e.target.closest('#piqo-close')) return;
    
    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = wrapper.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    wrapper.style.transition = 'none'; 
    wrapper.style.transform = 'none'; // Clear translateY
    wrapper.style.top = initialTop + 'px';
    wrapper.style.left = initialLeft + 'px';
    wrapper.style.right = 'auto';
    
    grabLeft.style.cursor = 'grabbing';
    grabRight.style.cursor = 'grabbing';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
    
    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;
    
    // Keep widget within screen bounds
    newLeft = Math.max(0, Math.min(window.innerWidth - wrapper.offsetWidth, newLeft));
    newTop = Math.max(0, Math.min(window.innerHeight - wrapper.offsetHeight, newTop));
    
    wrapper.style.left = newLeft + 'px';
    wrapper.style.top = newTop + 'px';
  });

  window.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    grabLeft.style.cursor = 'grab';
    grabRight.style.cursor = 'grab';
    
    // Snapping Logic
    const rect = wrapper.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const screenMid = window.innerWidth / 2;
    
    wrapper.style.transition = 'left 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
    
    if (centerX > screenMid) {
      // Snap to Right Edge
      wrapper.style.left = (window.innerWidth - wrapper.offsetWidth) + 'px';
      wrapper.classList.remove('piqo-left');
      grabLeft.style.display = 'flex';
      grabRight.style.display = 'none';
      
      // Cleanup after transition
      setTimeout(() => {
        if(isDragging) return;
        wrapper.style.transition = 'none';
        wrapper.style.left = 'auto';
        wrapper.style.right = '0px';
      }, 400);
    } else {
      // Snap to Left Edge
      wrapper.style.left = '0px';
      wrapper.classList.add('piqo-left');
      grabLeft.style.display = 'none';
      grabRight.style.display = 'flex';
    }
  });

  // Close Action
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    wrapper.remove();
  });

  // Open Sidebar Action
  mainBtn.addEventListener('click', (e) => {
    if (hasMoved) return; // Prevent opening if it was a drag
    togglePiqoPopup(wrapper.classList.contains('piqo-left'));
  });
}




// Listen for toolbar icon clicks
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TOGGLE_POPUP") {
    let isLeft = false;
    const wrapper = document.getElementById('piqo-widget-container');
    if (wrapper) {
      isLeft = wrapper.classList.contains('piqo-left');
    }
    togglePiqoPopup(isLeft);
  }
});

// Page bridge for stores that render search results in the browser.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "STORE_PAGE_SEARCH") return;

  const toEnglishDigits = (value) => String(value || "").replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  const parseToman = (value) => {
    const n = Number(toEnglishDigits(value).replace(/[^0-9]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const absolute = (value) => {
    if (!value) return "";
    try { return new URL(value, location.origin).href; } catch { return ""; }
  };
  const waitFor = (selector, timeout = 12000) => new Promise(resolve => {
    const started = Date.now();
    const check = () => {
      const nodes = document.querySelectorAll(selector);
      if (nodes.length || Date.now() - started >= timeout) return resolve(nodes);
      setTimeout(check, 250);
    };
    check();
  });
  const collect = async () => {
    if (message.store === "خانومی") {
      const anchors = await waitFor('a[href^="/products/"]');
      const seen = new Set();
      return [...anchors].map(anchor => {
        const url = absolute(anchor.getAttribute("href"));
        if (!url || seen.has(url)) return null;
        seen.add(url);
        const name = anchor.querySelector("h3")?.innerText?.trim();
        if (!name) return null;
        const pricing = anchor.querySelector('[data-sentry-component="Pricing"]');
        const current = pricing?.querySelector(".text-text-black")?.innerText || pricing?.innerText || "";
        const price = parseToman(current);
        if (!price) return null;
        return { store: "خانومی", storeColor: "#E91E63", name, price, originalPrice: price, discount: 0, url, image: absolute(anchor.querySelector("img")?.src), rating: 0, reviewCount: 0, availability: true };
      }).filter(Boolean).slice(0, 6);
    }

    const headings = await waitFor('a[href*="/product-"] h2');
    const seen = new Set();
    return [...headings].map(heading => {
      const anchor = heading.closest("a");
      const url = absolute(anchor?.getAttribute("href"));
      if (!anchor || !url || seen.has(url)) return null;
      seen.add(url);
      const card = anchor.parentElement?.parentElement;
      const text = card?.innerText || anchor.innerText || "";
      const priceMatch = text.match(/([0-9۰-۹][0-9۰-۹,]*)\s*تومان/);
      const price = parseToman(priceMatch?.[1]);
      if (!price) return null;
      return { store: "تکنولایف", storeColor: "#5B21B6", name: heading.innerText.trim(), price, originalPrice: price, discount: 0, url, image: absolute(card?.querySelector("img")?.src), rating: 0, reviewCount: 0, availability: true };
    }).filter(Boolean).slice(0, 6);
  };

  collect().then(items => sendResponse({ items })).catch(() => sendResponse({ items: [] }));
  return true;
});