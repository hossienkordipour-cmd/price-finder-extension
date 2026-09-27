const fs = require('fs');

let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const affiliateCode = `
// ==========================================
// سیستم افیلیت مارکتینگ (همکاری در فروش)
// ==========================================
function getAffiliateUrl(store, originalUrl) {
  if (!originalUrl) return "#";
  
  if (store === "باسلام" || store === "basalam") {
    // کد افیلیت باسلام
    try {
      // استفاده از btoa برای انکد کردن آدرس مقصد به Base64
      const b64 = btoa(unescape(encodeURIComponent(originalUrl)));
      return \`https://a.bslm.ir/api/v1/tracking/click/g/466ef6e231e4f71cf496b350123065d3?b64=\${b64}\`;
    } catch (e) {
      console.error("Base64 encoding failed for URL:", originalUrl);
      return originalUrl;
    }
  }
  
  // دیجی‌کالا و سایر پلتفرم‌ها رو هم میشه اینجا اضافه کرد
  
  return originalUrl;
}
`;

// Insert the function at the top, after the constants
js = js.replace(/const conditionFilter = document\.getElementById\("condition-filter"\);\n/, 'const conditionFilter = document.getElementById("condition-filter");\n' + affiliateCode);

// Update generateCardHtml to use the affiliate URL
const searchStr = "const tagAttrs = isBase ? '' : `href=\"${item.url}\" target=\"_blank\"`;";
const replacementStr = "const finalUrl = getAffiliateUrl(item.source, item.url);\n  const tagAttrs = isBase ? '' : `href=\"${finalUrl}\" target=\"_blank\"`;";

if (!js.includes(searchStr)) {
    console.log("Could not find the target string in generateCardHtml");
    // Fallback: check how item.url is used
} else {
    js = js.replace(searchStr, replacementStr);
    fs.writeFileSync('sidebar/sidebar.js', js);
    console.log("Patched sidebar.js with Basalam affiliate logic.");
}

