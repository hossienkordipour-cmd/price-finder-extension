const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.results-list.grid-view .card-price {\n  font-size: 14px;\n}', 
                  '.results-list.grid-view .card-price {\n  font-size: 16px;\n}');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Grid view price size changed to 16px");
