// ==============================
// Content Script
// تشخیص صفحه محصول در سایت‌های مختلف
// ==============================

(function () {
  "use strict";

  // ==============================
  // پاکسازی نام محصول برای جستجوی دقیق‌تر
  // ==============================
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
  let detectionTimer = null;

  init();

  // نظارت بر تغییر URL (SPA)
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      scheduleDetection();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  function init() { scheduleDetection(); }

  function scheduleDetection() {
    clearTimeout(detectionTimer);
    detectionTimer = setTimeout(detectProduct, 1500);
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
      console.log("[قیمت‌یاب] محصول:", product.name);
      chrome.runtime.sendMessage({ type: "PRODUCT_DETECTED", product });
      chrome.runtime.sendMessage({ type: "OPEN_SIDEBAR" }).catch(() => {});
    }
  }

  // ==============================
  // دیجی‌کالا
  // ==============================
  function extractDigikala() {
    if (!window.location.pathname.includes("/product/")) return null;

    let name = null, price = null, image = null;

    // روش ۱: JSON-LD
    try {
      const ld = document.querySelector('script[type="application/ld+json"]');
      if (ld) {
        const d = JSON.parse(ld.textContent);
        const p = Array.isArray(d) ? d.find(x => x["@type"] === "Product") : d;
        if (p) { name = p.name; price = p.offers?.price; image = p.image?.[0] || p.image; }
      }
    } catch {}

    // روش ۲: meta tags
    if (!name) name = document.querySelector('meta[property="og:title"]')?.content || document.querySelector("h1")?.textContent?.trim();
    if (!image) image = document.querySelector('meta[property="og:image"]')?.content;

    // پاکسازی نام با تابع مشترک
    if (name) name = cleanProductName(name);

    if (!name) return null;
    return {
      name, image, source: "digikala", sourceUrl: window.location.href,
      price: price ? parseInt(String(price).replace(/[^\d]/g, "")) : null,
    };
  }

  // ==============================
  // ترب — صفحه محصول
  // ==============================
  function extractTorob() {
    if (!window.location.pathname.startsWith("/p/")) return null;

    let name = null, price = null, image = null;

    // روش ۱: h1 اصلی صفحه (معمولاً تمیزتره)
    name = document.querySelector("h1")?.textContent?.trim();

    // روش ۲: meta og:title
    if (!name) {
      name = document.querySelector('meta[property="og:title"]')?.content;
    }

    // روش ۳: JSON-LD
    if (!name) {
      try {
        const ld = document.querySelector('script[type="application/ld+json"]');
        if (ld) {
          const d = JSON.parse(ld.textContent);
          const p = Array.isArray(d) ? d.find(x => x["@type"] === "Product") : d;
          if (p) {
            name = p.name;
            image = p.image?.[0] || p.image;
            price = p.offers?.lowPrice || p.offers?.price;
          }
        }
      } catch {}
    }

    image = image || document.querySelector('meta[property="og:image"]')?.content;

    // پاکسازی نام — مهم‌ترین قسمت!
    if (name) {
      name = cleanProductName(name);
    }

    if (!name || name.length < 3) return null;
    return { name, image, source: "torob", sourceUrl: window.location.href, price };
  }

  // ==============================
  // ایمالز
  // ==============================
  function extractEmalls() {
    if (window.location.pathname === "/" || window.location.pathname.toLowerCase().includes("search") || window.location.pathname.includes("لیست-قیمت")) return null;

    let name = document.querySelector('meta[property="og:title"]')?.content
      || document.querySelector("h1")?.textContent?.trim();
    const image = document.querySelector('meta[property="og:image"]')?.content;

    if (name) name = cleanProductName(name);
    if (!name) return null;
    return { name, image, source: "emalls", sourceUrl: window.location.href, price: null };
  }

  // ==============================
  // باسلام
  // ==============================
  function extractBasalam() {
    if (window.location.pathname === "/" || window.location.pathname.toLowerCase().includes("search")) return null;

    let name = document.querySelector("h1")?.textContent?.trim()
      || document.querySelector('meta[property="og:title"]')?.content;
    const image = document.querySelector('meta[property="og:image"]')?.content;

    if (name) name = cleanProductName(name);
    if (!name) return null;
    return { name, image, source: "basalam", sourceUrl: window.location.href, price: null };
  }

  // ==============================
  // عمومی (Schema.org)
  // ==============================
  function extractGeneric() {
    const hasProduct =
      !!document.querySelector('[itemtype*="schema.org/Product"]') ||
      document.querySelector('meta[property="og:type"]')?.content?.includes("product");

    if (!hasProduct) return null;

    let name = document.querySelector('[itemprop="name"]')?.textContent?.trim()
      || document.querySelector('meta[property="og:title"]')?.content;
    const image = document.querySelector('meta[property="og:image"]')?.content;

    if (name) name = cleanProductName(name);
    if (!name) return null;
    return { name, image, source: "generic", sourceUrl: window.location.href, price: null };
  }

  // ==============================
  // دیوار
  // ==============================
  function extractDivar() {
    if (!window.location.pathname.includes("/v/")) return null;

    let name = document.querySelector("h1")?.textContent?.trim()
      || document.querySelector('meta[property="og:title"]')?.content;
    const image = document.querySelector('meta[property="og:image"]')?.content;

    if (name) name = cleanProductName(name);
    if (!name) return null;
    return { name, image, source: "divar", sourceUrl: window.location.href, price: null };
  }

  // ==============================
  // شیپور
  // ==============================
  function extractSheypoor() {
    if (window.location.pathname === "/" || window.location.pathname.toLowerCase().includes("search") || window.location.pathname.includes("/s/")) return null;

    let name = document.querySelector("h1")?.textContent?.trim()
      || document.querySelector('meta[property="og:title"]')?.content;
    const image = document.querySelector('meta[property="og:image"]')?.content;

    if (name) name = cleanProductName(name);
    if (!name) return null;
    return { name, image, source: "sheypoor", sourceUrl: window.location.href, price: null };
  }
})();
