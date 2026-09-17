// ==============================
// فیلترهای هوشمند Phia (شبیه‌سازی شده)
// ==============================

// ۱. فیلتر قیمت (حذف لوازم جانبی مثل قاب گوشی که خیلی ارزان‌تر هستند)
export function isPriceValid(basePrice, testPrice) {
  if (!basePrice || !testPrice || basePrice === 0 || testPrice === 0) return true;
  
  // قیمت نتیجه پیدا شده نباید از ۴۰٪ کالای اصلی کمتر و از ۲۰۰٪ آن بیشتر باشد
  const minAllowed = basePrice * 0.4;
  const maxAllowed = basePrice * 2.0;
  
  return testPrice >= minAllowed && testPrice <= maxAllowed;
}

// ۲. فیلتر کلمات کلیدی انگلیسی و اعداد (مثل مدل گوشی S24, حافظه 256)
export function hasRequiredEnglishTokens(sourceName, targetName) {
  if (!sourceName || !targetName) return true;
  
  // استخراج کلمات انگلیسی و اعداد که حداقل ۲ کاراکتر باشند
  const tokens = sourceName.match(/[a-zA-Z0-9]{2,}/g) || [];
  if (tokens.length === 0) return true; // اگر کالای اصلی توکن انگلیسی/عددی ندارد عبور کن
  
  const targetLower = targetName.toLowerCase();
  let matches = 0;
  
  for (const token of tokens) {
    if (targetLower.includes(token.toLowerCase())) {
      matches++;
    }
  }
  
  // حداقل ۵۰ درصد از کلمات کلیدی انگلیسی/عددی اصلی باید در نتیجه یافت شده وجود داشته باشد
  const matchRatio = matches / tokens.length;
  return matchRatio >= 0.5;
}

// ۳. امتیازدهی شباهت کلی متن
export function getSimilarityScore(sourceName, targetName) {
  if (!sourceName || !targetName) return 0;
  
  const getTokens = (str) => {
    return str.toLowerCase().replace(/[^a-z0-9آ-ی]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  };
  
  const sourceTokens = getTokens(sourceName);
  const targetTokens = getTokens(targetName);
  
  if (sourceTokens.length === 0) return 1;
  
  let matches = 0;
  for (const token of sourceTokens) {
    if (targetTokens.some(t => t === token || t.includes(token) || token.includes(t))) {
      matches++;
    }
  }
  
  return matches / sourceTokens.length;
}
