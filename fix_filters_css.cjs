const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.filters-row {\n  display: flex;\n  justify-content: flex-start;\n  gap: 8px;\n  margin-bottom: 16px;\n}', 
`.filters-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.filters-group {
  display: flex;
  gap: 8px;
}
.results-count {
  font-size: 13px;
  color: #6B6B6B;
  font-weight: 500;
}`);

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Updated CSS for filters-row");
