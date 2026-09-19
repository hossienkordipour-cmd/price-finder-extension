const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

const BRAND_ALIASES = new Map([
  ["سامسونگ", "samsung"], ["شیائومی", "xiaomi"], ["شیاومی", "xiaomi"],
  ["اپل", "apple"], ["آیفون", "iphone"], ["گلکسی", "galaxy"],
  ["ردمی", "redmi"], ["هواوی", "huawei"], ["آنر", "honor"],
  ["نوکیا", "nokia"], ["لنوو", "lenovo"], ["ایسوس", "asus"],
  ["ایسر", "acer"], ["مک بوک", "macbook"], ["مک‌بوک", "macbook"],
]);

const VARIANT_ALIASES = new Map([
  ["پرو", "pro"], ["مکس", "max"], ["اولترا", "ultra"],
  ["پلاس", "plus"], ["مینی", "mini"], ["لایت", "lite"],
]);

const STOP_WORDS = new Set([
  "خرید", "قیمت", "فروش", "محصول", "مدل", "گوشی", "موبایل", "تبلت",
  "لپ", "تاپ", "لپتاپ", "اصل", "اورجینال", "جدید", "با", "و", "به",
  "برای", "همراه", "دارای", "the", "with", "new", "model",
]);

const ACCESSORY_GROUPS = {
  case: ["قاب", "کاور", "کیف", "case", "cover"],
  screen: ["گلس", "محافظ", "glass", "protector"],
  charger: ["شارژر", "آداپتور", "کابل", "charger", "adapter", "cable"],
  wearable: ["بند", "strap"],
  holder: ["پایه", "هولدر", "holder", "stand"],
  audio: ["هندزفری", "هدفون", "ایرباد", "earphone", "headphone", "earbuds"],
};

const COLOR_WORDS = [
  "مشکی", "سفید", "آبی", "قرمز", "سبز", "زرد", "طلایی", "نقره‌ای", "خاکستری",
  "صورتی", "بنفش", "نارنجی", "black", "white", "blue", "red", "green", "gold",
  "silver", "gray", "grey", "pink", "purple", "orange",
];

function toLatinDigits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, digit => PERSIAN_DIGITS.indexOf(digit))
    .replace(/[٠-٩]/g, digit => ARABIC_DIGITS.indexOf(digit));
}

function replaceAliases(text, aliases) {
  let result = text;
  for (const [alias, canonical] of aliases) result = result.split(alias).join(canonical);
  return result;
}

export function normalizeProductText(value) {
  let text = toLatinDigits(value)
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[\u200c\u200d\u200e\u200f]/g, " ");

  text = replaceAliases(text, BRAND_ALIASES);
  text = replaceAliases(text, VARIANT_ALIASES);
  return text
    .replace(/(\d+(?:\.\d+)?)\s*(?:ترابایت|ترا|tb)/gi, "$1tb")
    .replace(/(\d+(?:\.\d+)?)\s*(?:گیگابایت|گیگ|gb)/gi, "$1gb")
    .replace(/(\d+(?:\.\d+)?)\s*(?:مگابایت|مگ|mb)/gi, "$1mb")
    .replace(/[^a-z0-9آ-ی]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulTokens(value) {
  return normalizeProductText(value).split(" ")
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

function extractSet(tokens, predicate) {
  return new Set(tokens.filter(predicate));
}

function extractAccessoryGroups(tokens) {
  const tokenSet = new Set(tokens);
  return new Set(Object.entries(ACCESSORY_GROUPS)
    .filter(([, aliases]) => aliases.some(alias => tokenSet.has(alias)))
    .map(([group]) => group));
}

function intersects(first, second) {
  for (const value of first) if (second.has(value)) return true;
  return false;
}

function extractProductFeatures(value) {
  const normalized = normalizeProductText(value);
  const tokens = meaningfulTokens(normalized);
  const capacities = extractSet(tokens, token => /^\d+(?:\.\d+)?(?:gb|tb|mb)$/.test(token));
  const identifiers = extractSet(tokens, token => /[a-z]/.test(token) && /\d/.test(token) && !capacities.has(token));
  const numbers = extractSet(tokens, token => /^\d{1,3}$/.test(token));
  const variants = extractSet(tokens, token => ["pro", "max", "ultra", "plus", "mini", "lite", "fe"].includes(token));
  const brands = extractSet(tokens, token => [
    "samsung", "xiaomi", "apple", "iphone", "galaxy", "redmi", "huawei",
    "honor", "nokia", "lenovo", "asus", "acer", "macbook",
  ].includes(token));
  const colors = extractSet(tokens, token => COLOR_WORDS.includes(token));
  return { normalized, tokens, capacities, identifiers, numbers, variants, brands, colors, accessories: extractAccessoryGroups(tokens) };
}

function conflictingExplicitSets(sourceSet, targetSet) {
  return sourceSet.size > 0 && targetSet.size > 0 && !intersects(sourceSet, targetSet);
}

export function assessProductMatch(sourceName, targetName) {
  if (!sourceName || !targetName) return { accepted: false, score: 0, confidence: "low", reasons: ["missing-name"] };

  const source = extractProductFeatures(sourceName);
  const target = extractProductFeatures(targetName);
  const reasons = [];

  if (source.normalized === target.normalized) return { accepted: true, score: 1, confidence: "high", reasons: [] };

  if (conflictingExplicitSets(source.capacities, target.capacities)) reasons.push("capacity-mismatch");
  if (conflictingExplicitSets(source.identifiers, target.identifiers)) reasons.push("model-mismatch");
  if (conflictingExplicitSets(source.brands, target.brands)) reasons.push("brand-mismatch");
  if (source.accessories.size === 0 && target.accessories.size > 0) reasons.push("accessory-instead-of-product");
  else if (conflictingExplicitSets(source.accessories, target.accessories)) reasons.push("accessory-type-mismatch");

  let hardMismatch = reasons.length > 0;
  const targetTokens = new Set(target.tokens);
  let matchedWeight = 0;
  let totalWeight = 0;
  for (const token of source.tokens) {
    let weight = 1;
    if (source.brands.has(token)) weight = 3;
    if (source.identifiers.has(token) || source.numbers.has(token)) weight = 4;
    if (source.capacities.has(token)) weight = 5;
    if (source.variants.has(token)) weight = 3;
    totalWeight += weight;
    if (targetTokens.has(token)) matchedWeight += weight;
  }

  let score = totalWeight > 0 ? matchedWeight / totalWeight : 0;
  if (source.numbers.size > 0 && target.numbers.size > 0 && !intersects(source.numbers, target.numbers)) {
    score -= 0.25;
    reasons.push("number-mismatch");
    hardMismatch = true;
  }
  if ((source.variants.size > 0 || target.variants.size > 0) && !intersects(source.variants, target.variants)) {
    score -= 0.18;
    reasons.push("variant-mismatch");
    hardMismatch = true;
  }
  if (conflictingExplicitSets(source.colors, target.colors)) {
    score -= 0.05;
    reasons.push("color-mismatch");
  }

  score = Math.max(0, Math.min(1, score));
  const accepted = !hardMismatch && score >= 0.52;
  const confidence = score >= 0.78 ? "high" : score >= 0.52 ? "medium" : "low";
  return { accepted, score, confidence, reasons };
}

export function buildSearchQuery(productName) {
  const features = extractProductFeatures(productName);
  const priority = [...features.brands, ...features.identifiers, ...features.numbers, ...features.capacities, ...features.variants];
  const selected = [];
  for (const token of [...priority, ...features.tokens]) {
    if (!selected.includes(token)) selected.push(token);
    if (selected.length >= 9) break;
  }
  return selected.join(" ") || normalizeProductText(productName);
}

export function isPriceValid(basePrice, testPrice) {
  if (!basePrice || !testPrice || basePrice === 0 || testPrice === 0) return true;
  return testPrice >= basePrice * 0.4 && testPrice <= basePrice * 2.0;
}

export function hasRequiredEnglishTokens(sourceName, targetName) {
  const sourceIds = extractProductFeatures(sourceName).identifiers;
  if (sourceIds.size === 0) return true;
  return !conflictingExplicitSets(sourceIds, extractProductFeatures(targetName).identifiers);
}

export function getSimilarityScore(sourceName, targetName) {
  return assessProductMatch(sourceName, targetName).score;
}
