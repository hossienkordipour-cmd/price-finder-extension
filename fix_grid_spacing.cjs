const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// 1. Change grid gap from 12px to 8px
css = css.replace('.results-list.grid-view {\n  display: grid;\n  grid-template-columns: repeat(2, 1fr);\n  gap: 12px;', 
                  '.results-list.grid-view {\n  display: grid;\n  grid-template-columns: repeat(2, 1fr);\n  gap: 8px;');

// 2. Remove margin-bottom from grid items so only grid gap applies
if (css.includes('.results-list.grid-view .result-card {\n  flex-direction: column;')) {
  css = css.replace('.results-list.grid-view .result-card {\n  flex-direction: column;', 
                    '.results-list.grid-view .result-card {\n  margin-bottom: 0;\n  flex-direction: column;');
}

if (css.includes('.results-list.grid-view .skeleton-card {\n  flex-direction: column;')) {
  css = css.replace('.results-list.grid-view .skeleton-card {\n  flex-direction: column;', 
                    '.results-list.grid-view .skeleton-card {\n  margin-bottom: 0;\n  flex-direction: column;');
}

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Fixed grid spacing");
