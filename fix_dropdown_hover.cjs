const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.dropdown-item {\n  padding: 8px 12px;\n  border-radius: 8px;\n  cursor: pointer;\n  transition: background 0.2s;\n  color: var(--text-muted);\n}', 
                  '.dropdown-item {\n  padding: 8px 12px;\n  border-radius: 8px;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  color: var(--text-gray);\n}');

css = css.replace('.dropdown-item:hover {\n  background: #F3F4F6;\n  color: var(--text-dark);\n}', 
                  '.dropdown-item:hover {\n  background: #F0F0F0;\n  color: var(--text-dark);\n}');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Fixed dropdown item hover and colors");
