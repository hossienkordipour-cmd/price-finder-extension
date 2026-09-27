const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.pill-select {\n  appearance: none;\n  background-color: var(--card-bg);\n  border: none;\n  border-radius: 20px;\n  padding: 8px 16px 8px 32px;\n  font-size: 12px;\n  font-weight: 600;\n  color: var(--text-dark);\n  cursor: pointer;\n  background-image: url(\'data:image/svg+xml;utf8,<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="6 9 12 15 18 9"></polyline></svg>\');\n  background-repeat: no-repeat;\n  background-position: left 12px center;\n}', 
`.pill-select {
  appearance: none;
  background-color: var(--card-bg);
  border: none;
  border-radius: 20px;
  padding: 8px 12px 8px 28px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dark);
  cursor: pointer;
  background-image: url('data:image/svg+xml;utf8,<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="6 9 12 15 18 9"></polyline></svg>');
  background-repeat: no-repeat;
  background-position: left 10px center;
}`);

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Filter padding updated");
