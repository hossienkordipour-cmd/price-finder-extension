const fs = require('fs');

let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// 1. Change price font size to 16px
if (css.includes('.card-price {\\n  font-size: 14px;')) {
  css = css.replace('.card-price {\n  font-size: 14px;', '.card-price {\n  font-size: 16px;');
  console.log("Price font size changed to 16px");
} else if (css.includes('font-size: 14px;') && css.includes('.card-price {')) {
  // alternative regex just in case
  css = css.replace(/(.card-price\s*{[^}]*)font-size:\s*14px;/, "$1font-size: 16px;");
  console.log("Price font size changed to 16px (regex)");
}

// 2. Fix gap between image and text
// Add gap to result-card
if (!css.includes('gap: 8px;') && css.includes('.result-card {')) {
  css = css.replace('.result-card {\n  display: flex;', '.result-card {\n  display: flex;\n  gap: 8px;');
}
// Add gap to skeleton-card
if (css.includes('.skeleton-card {\n  display: flex;')) {
  css = css.replace('.skeleton-card {\n  display: flex;', '.skeleton-card {\n  display: flex;\n  gap: 8px;');
}

// Remove incorrect margins
css = css.replace('.card-content {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  margin-left: 12px;', 
                  '.card-content {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;');

css = css.replace('.skeleton-content {\n  flex: 1;\n  margin-left: 12px;', 
                  '.skeleton-content {\n  flex: 1;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Fixed spacing and gap.");
