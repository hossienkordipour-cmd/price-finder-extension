const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.results-list.grid-view .skeleton-card {\n  flex-direction: column;\n  padding: 8px;', 
                  '.results-list.grid-view .skeleton-card {\n  flex-direction: column;\n  padding: 4px;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Grid skeleton padding changed to 4px");
