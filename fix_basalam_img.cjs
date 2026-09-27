const fs = require('fs');
let js = fs.readFileSync('content/content.js', 'utf8');

const oldLogic = `  function extractBasalam() {
    if (window.location.pathname === "/" || window.location.pathname.toLowerCase().includes("search")) return null;

    let name = document.querySelector("h1")?.textContent?.trim()
      || document.querySelector('meta[property="og:title"]')?.content;
    const image = getAbsoluteUrl(document.querySelector('meta[property="og:image"]')?.content);

    if (name) name = cleanProductName(name);
    if (!name) return null;
    return { name, image, source: "basalam", store: "باسلام", sourceUrl: window.location.href, price: null };
  }`;

const newLogic = `  function extractBasalam() {
    if (window.location.pathname === "/" || window.location.pathname.toLowerCase().includes("search")) return null;

    let name = document.querySelector("h1")?.textContent?.trim()
      || document.querySelector('meta[property="og:title"]')?.content;
    
    let image = getAbsoluteUrl(document.querySelector('meta[property="og:image"]')?.content);
    
    if (!image) {
      if (name) {
        const imgByAlt = document.querySelector(\`img[alt="\${name}"]\`);
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
  }`;

js = js.replace(oldLogic, newLogic);
fs.writeFileSync('content/content.js', js);
console.log("Updated extractBasalam image fallback logic");
