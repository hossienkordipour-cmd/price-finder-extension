// Minimal replica of assessProductMatch
function normalizeProductText(text) {
  if (!text) return "";
  return text
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[ـ\\/\\-]/g, " ")
    .replace(/[.,:;،؛]/g, " ")
    .replace(/\\s+/g, " ")
    .toLowerCase()
    .trim();
}

function assessProductMatch(sourceName, targetName) {
  const source = normalizeProductText(sourceName);
  const target = normalizeProductText(targetName);
  const srcWords = source.split(" ").filter(w => w.length > 1);
  const tgtWords = target.split(" ").filter(w => w.length > 1);
  
  if (srcWords.length === 0 || tgtWords.length === 0) return 0;
  
  let matches = 0;
  for (const w of tgtWords) {
    if (srcWords.includes(w)) matches++;
  }
  
  return matches / Math.max(srcWords.length, tgtWords.length);
}

const source = "شامپو روزانه مو شبنم مخصوص موهای معمولی حجم 1000 گرم حاوی اسید";
const target = "شامپو موهای معمولی شبنم مقدار 1000 گرم";
console.log("Score:", assessProductMatch(source, target));
