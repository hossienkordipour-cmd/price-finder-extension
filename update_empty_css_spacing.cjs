const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.empty-illustration {\n  width: 160px;\n  height: auto;\n  margin-bottom: 24px;\n}', 
                  '.empty-illustration {\n  width: 160px;\n  height: auto;\n  margin-bottom: 8px;\n}');

css = css.replace('.empty-title {\n  font-size: 16px;\n  font-weight: 700;\n  color: var(--text-dark);\n  margin-bottom: 8px;\n}', 
                  '.empty-title {\n  font-size: 16px;\n  font-weight: 600;\n  color: var(--text-dark);\n  margin-bottom: 8px;\n}');

css = css.replace('.empty-subtitle {\n  font-size: 13px;\n  color: var(--text-gray);\n  line-height: 1.6;\n}', 
                  '.empty-subtitle {\n  font-size: 12px;\n  color: var(--text-gray);\n  line-height: 1.6;\n}');

css = css.replace('.clear-filters-btn {\n  margin-top: 24px;\n  background-color: #171717;\n  color: #FFFFFF;\n  border: none;\n  border-radius: 100px;\n  padding: 10px 24px;\n  font-size: 13px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: opacity 0.2s;\n}', 
                  '.clear-filters-btn {\n  margin-top: 20px;\n  background-color: #171717;\n  color: #FFFFFF;\n  border: none;\n  border-radius: 100px;\n  padding: 10px 24px;\n  font-size: 12px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: opacity 0.2s;\n}');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Updated CSS for empty state typography and spacing");
