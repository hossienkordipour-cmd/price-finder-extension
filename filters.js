const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

const BRAND_ALIASES = new Map([
  ["سامسونگ", "samsung"], ["شیائومی", "xiaomi"], ["شیاومی", "xiaomi"],
  ["اپل", "apple"], ["آیفون", "iphone"], ["گلکسی", "galaxy"],
  ["ردمی", "redmi"], ["هواوی", "huawei"], ["آنر", "honor"],
  ["نوکیا", "nokia"], ["لنوو", "lenovo"], ["ایسوس", "asus"],
  ["ایسر", "acer"], ["مک بوک", "macbook"], ["مک‌بوک", "macbook"],
  ["ایکس ویژن", "xvision"], ["ایکس‌ویژن", "xvision"], ["x.vision", "xvision"], ["x-vision", "xvision"],
  ["سیلور کرست", "silvercrest"], ["سیلورکرست", "silvercrest"], ["silver crest", "silvercrest"],
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
    .replace(/\bpromax\b/g, 'pro max')
    .replace(/\b([a-z]+)\.(\d+)\b/g, '$1$2')
    .replace(/\baf\s*[- ]\s*(\d{3,})\b/g, 'af$1')
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

// Explicit phrase evidence, not a semantic/AI guess. This catalog is shared
// across stores; unknown types retain the existing matcher.
const PRODUCT_CONCEPTS = [
  ['freezer-bag', 'کیسه فریزر', /(?:^|\s)(?:کیسه\s*فریزر|freezer\s+bags?)(?=\s|$)/],
  ['garbage-bag', 'کیسه زباله', /(?:^|\s)(?:کیسه\s*زباله|garbage\s+bags?|trash\s+bags?)(?=\s|$)/],
  ['food-wrap', 'محافظ غذایی', /(?:^|\s)(?:سلفون|فیلم\s+استرچ|محافظ\s+غذایی|food\s+wrap|cling\s+film)(?=\s|$)/],
  ['fertilizer', 'کود', /(?:^|\s)(?:کود|fertilizer)(?=\s|$)/],
  ['dishwashing-liquid', 'مایع ظرفشویی', /(?:^|\s)(?:مایع\s+ظرف\s*شویی|dishwashing\s+liquid)(?=\s|$)/],
  ['handwash-liquid', 'مایع دستشویی', /(?:^|\s)(?:مایع\s+دست\s*شویی|hand\s+wash)(?=\s|$)/],
  ['laundry-powder', 'پودر لباسشویی', /(?:^|\s)(?:پودر\s+لباس\s*شویی|laundry\s+powder)(?=\s|$)/],
  ['tissue', 'دستمال کاغذی', /(?:^|\s)(?:دستمال\s+کاغذی|facial\s+tissues?)(?=\s|$)/],
];
const HOUSEHOLD_BRANDS = [
  ['landee', /(?:^|\s)(?:لندی|landee|landy)(?=\s|$)/],
  ['golrang', /(?:^|\s)(?:گلرنگ|golrang)(?=\s|$)/],
  ['iri-plast', /(?:^|\s)(?:آیری\s+پلاست|ایری\s+پلاست|iri\s+plast)(?=\s|$)/],
];

function extractConceptFeatures(value, normalized) {
  const types = PRODUCT_CONCEPTS.filter(([, , pattern]) => pattern.test(normalized));
  const brands = new Set(HOUSEHOLD_BRANDS.filter(([, pattern]) => pattern.test(normalized)).map(([id]) => id));
  const quantities = new Set();
  const packs = new Set();
  for (const match of normalized.matchAll(/(\d+)\s*(?:عددی|عدد|تایی|pcs|pieces)(?=\s|$)/g)) {
    if (/بسته\s*$/.test(normalized.slice(0, match.index))) packs.add(Number(match[1]));
    else quantities.add(Number(match[1]));
  }
  // Preserve decimals before punctuation normalization; compare only like units.
  const measures = new Map();
  const text = toLatinDigits(value).toLowerCase().replace(/[\u200c\u200d]/g, ' ').replace(/٫/g, '.');
  const units = { 'میلی لیتر': ['volume', 1], 'میلیلیتر': ['volume', 1], ml: ['volume', 1],
    'لیتر': ['volume', 1000], l: ['volume', 1000], 'کیلوگرم': ['weight', 1000], kg: ['weight', 1000],
    'گرم': ['weight', 1], g: ['weight', 1], 'سانتی متر': ['length', 0.01], cm: ['length', 0.01],
    'متری': ['length', 1], 'متر': ['length', 1], m: ['length', 1] };
  for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*(میلی\s*لیتر|سانتی متر|کیلوگرم|متری|لیتر|گرم|متر|ml|cm|kg|l|g|m)(?=\s|$)/g)) {
    const unit = units[match[2].replace(/\s+/g, ' ')];
    if (!unit) continue;
    const [dimension, scale] = unit;
    if (!measures.has(dimension)) measures.set(dimension, new Set());
    measures.get(dimension).add(Number((Number(match[1]) * scale).toFixed(6)));
  }
  return { types, brands, quantities, packs, measures };
}

function assessConceptMatch(source, target) {
  if (source.identifiers.size || source.concept.types.length !== 1) return null;
  const a = source.concept, b = target.concept;
  const reasons = [];
  if (b.types.length !== 1 || a.types[0][0] !== b.types[0][0]) reasons.push('product-type-mismatch');
  if (conflictingExplicitSets(a.brands, b.brands)) reasons.push('brand-mismatch');
  if (conflictingCapacities(a.quantities, b.quantities)) reasons.push('quantity-mismatch');
  const aPacks = a.packs.size ? a.packs : a.quantities.size ? new Set([1]) : new Set();
  const bPacks = b.packs.size ? b.packs : b.quantities.size ? new Set([1]) : new Set();
  if (conflictingExplicitSets(aPacks, bPacks)) reasons.push('pack-count-mismatch');
  for (const [dimension, values] of a.measures) {
    if (b.measures.has(dimension) && conflictingCapacities(values, b.measures.get(dimension))) reasons.push(`${dimension}-mismatch`);
  }
  let total = 5, matched = reasons.includes('product-type-mismatch') ? 0 : 5;
  for (const [left, right, weight] of [[a.brands,b.brands,3],[a.quantities,b.quantities,2]]) {
    if (left.size) { total += weight; if (intersects(left,right)) matched += weight; }
  }
  for (const [dimension, values] of a.measures) {
    total += 2;
    if (b.measures.has(dimension) && intersects(values,b.measures.get(dimension))) matched += 2;
  }
  return { reasons, score: matched / total };
}

function extractProductFeatures(value) {
  const normalized = normalizeProductText(value);
  const tokens = meaningfulTokens(normalized);
  const capacities = extractSet(tokens, token => /^\d+(?:\.\d+)?(?:gb|tb|mb)$/.test(token));
  const identifiers = extractSet(tokens, token => /[a-z]/.test(token) && /\d/.test(token) && !capacities.has(token)
    && !/^\d+(?:ml|cm|kg|l|g|m|pcs)$/.test(token));
  const numbers = extractSet(tokens, token => /^\d{1,3}$/.test(token));
  const variants = extractSet(tokens, token => ["pro", "max", "ultra", "plus", "mini", "lite", "fe"].includes(token));
  const brands = extractSet(tokens, token => [
    "samsung", "xiaomi", "apple", "iphone", "galaxy", "redmi", "huawei",
    "honor", "nokia", "lenovo", "asus", "acer", "macbook", "xvision", "silvercrest", "dsp", "fakir",
  ].includes(token));
  const colors = extractSet(tokens, token => COLOR_WORDS.includes(token));
  return { normalized, tokens, capacities, identifiers, numbers, variants, brands, colors, accessories: extractAccessoryGroups(tokens), concept: extractConceptFeatures(value, normalized) };
}

function conflictingExplicitSets(sourceSet, targetSet) {
  return sourceSet.size > 0 && targetSet.size > 0 && !intersects(sourceSet, targetSet);
}

function conflictingCapacities(sourceSet, targetSet) {
  // A common RAM capacity cannot cancel out different storage capacities.
  // A subset is incomplete information, not an explicit contradiction.
  const sourceOnly = [...sourceSet].filter(value => !targetSet.has(value));
  const targetOnly = [...targetSet].filter(value => !sourceSet.has(value));
  return sourceOnly.length > 0 && targetOnly.length > 0;
}

function conflictingIdentifiers(sourceSet, targetSet) {
  if (conflictingExplicitSets(sourceSet, targetSet)) return true;
  const sourceOnly = [...sourceSet].filter(value => !targetSet.has(value));
  const targetOnly = [...targetSet].filter(value => !sourceSet.has(value));
  // Compare conflicting codes from the same identifier family (A3949/A3959),
  // without treating an extra unrelated specification as a model conflict.
  const family = value => value.match(/^([a-z]+)\d/)?.[1];
  return sourceOnly.some(a => family(a) && targetOnly.some(b => family(a) === family(b)));
}

export function assessProductMatch(sourceName, targetName, isUsed = false) {
  if (!sourceName || !targetName) return { accepted: false, score: 0, confidence: "low", reasons: ["missing-name"] };

  const source = extractProductFeatures(sourceName);
  const target = extractProductFeatures(targetName);
  const reasons = [];

  if (source.normalized === target.normalized) return { accepted: true, score: 1, confidence: "high", reasons: [] };

  const conceptMatch = assessConceptMatch(source, target);
  if (conceptMatch) reasons.push(...conceptMatch.reasons);

  const batteryTitle = text => /^(?:(?:خرید|فروش|تعویض|replacement)\s+)*(?:باتری|باطری|battery)(?:\s|$)/.test(text);
  if (batteryTitle(source.normalized) !== batteryTitle(target.normalized)) reasons.push('accessory-instead-of-product');
  const replicaTitle = text => /(?:^|\s)(?:کپی|copy|replica|فیک|fake)(?:\s|$)/.test(text.replace(/غیر\s+کپی|non\s+copy|not\s+(?:a\s+)?copy/g, ''));
  if (replicaTitle(source.normalized) !== replicaTitle(target.normalized)) reasons.push('replica-mismatch');

  // A laptop bundle mentioning a mouse is not a mouse offer. Keep this
  // category guard independent of the relaxed threshold for used listings.
  const mouseTitle = text => /^(?:(?:خرید|فروش|نو|کارکرده)\s+)*(?:ماوس|موس|mouse)(?:\s|$)/.test(text);
  const laptopTitle = text => /^(?:(?:خرید|فروش|نو|کارکرده)\s+)*(?:لپ\s*تاپ|لپتاپ|لپتاب|laptop|notebook)(?:\s|$)/.test(text);
  if ((mouseTitle(source.normalized) && laptopTitle(target.normalized))
    || (laptopTitle(source.normalized) && mouseTitle(target.normalized))) reasons.push('product-type-mismatch');

  if (conflictingCapacities(source.capacities, target.capacities)) reasons.push("capacity-mismatch");
  if (conflictingIdentifiers(source.identifiers, target.identifiers)) reasons.push("model-mismatch");
  if (source.identifiers.size > 0 && target.identifiers.size === 0) reasons.push("missing-model");
  if (conflictingExplicitSets(source.brands, target.brands)) reasons.push("brand-mismatch");
  // "محافظ غذایی" is food wrap, not a phone screen protector. A known
  // compound product type takes priority over single accessory words.
  if (!conceptMatch) {
    if (source.accessories.size === 0 && target.accessories.size > 0) reasons.push("accessory-instead-of-product");
    else if (conflictingExplicitSets(source.accessories, target.accessories)) reasons.push("accessory-type-mismatch");
  }

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
  if (!conceptMatch && source.numbers.size > 0 && target.numbers.size > 0 && !intersects(source.numbers, target.numbers)) {
    score -= 0.25;
    reasons.push("number-mismatch");
    hardMismatch = true;
  }
  if (source.variants.size !== target.variants.size || [...source.variants].some(variant => !target.variants.has(variant))) {
    score -= 0.18;
    reasons.push("variant-mismatch");
    hardMismatch = true;
  }
  if (conflictingExplicitSets(source.colors, target.colors)) {
    score -= 0.05;
    reasons.push("color-mismatch");
  }

  if (conceptMatch && !hardMismatch) score = Math.max(score, conceptMatch.score);
  score = Math.max(0, Math.min(1, score));
  const threshold = isUsed ? 0.38 : 0.52;
  const accepted = !hardMismatch && score >= threshold;
  const confidence = conceptMatch ? (accepted ? 'medium' : 'low') : score >= 0.78 ? "high" : score >= 0.52 ? "medium" : "low";
  return { accepted, score, confidence, reasons };
}

export function buildSearchQuery(productName) {
  const features = extractProductFeatures(productName);
  if (!features.identifiers.size && features.concept.types.length === 1) {
    const core = features.concept.types[0][1].split(' ');
    return [...new Set([...core, ...features.tokens])].slice(0, 9).join(' ');
  }
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
