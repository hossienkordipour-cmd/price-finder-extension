const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// Ensure gap is added to result-card
if (!css.includes('gap: 8px;', css.indexOf('.result-card {'))) {
  css = css.replace('.result-card {', '.result-card {\n  gap: 8px;');
}

// Ensure gap is added to skeleton-card
if (!css.includes('gap: 8px;', css.indexOf('.skeleton-card {'))) {
  css = css.replace('.skeleton-card {', '.skeleton-card {\n  gap: 8px;');
}

// Ensure margin-left is completely gone from card-content
css = css.replace(/margin-left:\s*12px;/g, '');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Forced gap: 8px with regex.");
