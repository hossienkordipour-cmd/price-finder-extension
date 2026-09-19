// Every price stored by the extension is in toman. Never infer a unit from
// the number of digits: inexpensive products make that heuristic unreliable.
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toLatinDigits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, digit => PERSIAN_DIGITS.indexOf(digit))
    .replace(/[٠-٩]/g, digit => ARABIC_DIGITS.indexOf(digit));
}

export function getCurrencyUnit(value) {
  const text = String(value ?? "").toLowerCase();
  if (/(?:ریال|\birr\b|\brial)/.test(text)) return "IRR";
  if (/(?:تومان|\btoman|\btomans)/.test(text)) return "TOMAN";
  return null;
}

export function toTomans(value, unit) {
  const amount = Number.parseInt(toLatinDigits(value).replace(/[^0-9]/g, ""), 10);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return unit === "IRR" ? Math.round(amount / 10) : amount;
}

export function parsePrice(value, declaredUnit = null) {
  const unit = getCurrencyUnit(declaredUnit) || getCurrencyUnit(value) || "TOMAN";
  return toTomans(value, unit);
}