const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.results-list.grid-view .card-bottom {\n  order: 3;\n  margin-top: auto;\n  justify-content: flex-end; /* Price on the right */', 
                  '.results-list.grid-view .card-bottom {\n  order: 3;\n  margin-top: auto;\n  justify-content: flex-start; /* Price on the right in RTL */');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Fixed flex alignment for RTL");
