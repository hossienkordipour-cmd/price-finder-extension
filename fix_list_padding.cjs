const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.result-card {\n  display: flex;\n  gap: 8px;\n  background: var(--card-bg);\n  border-radius: 16px;\n  padding: 12px;', 
                  '.result-card {\n  display: flex;\n  gap: 8px;\n  background: var(--card-bg);\n  border-radius: 16px;\n  padding: 8px;');

css = css.replace('.skeleton-card {\n  display: flex;\n  gap: 8px;\n  gap: 8px;\n  background: var(--card-bg);\n  border-radius: 16px;\n  padding: 12px;', 
                  '.skeleton-card {\n  display: flex;\n  gap: 8px;\n  background: var(--card-bg);\n  border-radius: 16px;\n  padding: 8px;');

// Note: skeleton-card has `gap: 8px;\n  gap: 8px;` because of a previous regex quirk. I'll just do a more robust replace for skeleton-card if it fails.

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("List view padding changed to 8px");
