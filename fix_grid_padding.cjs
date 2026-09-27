const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// The block looks like this:
// .results-list.grid-view .result-card {
//   flex-direction: column;
//   padding: 8px; /* Tighter padding for grid */
//   gap: 8px;     /* Distance from image to text */
//   align-items: stretch;
// }

css = css.replace('.results-list.grid-view .result-card {\n  flex-direction: column;\n  padding: 8px;', 
                  '.results-list.grid-view .result-card {\n  flex-direction: column;\n  padding: 4px;');

// Just in case it was formatted slightly differently:
if (css.includes('padding: 8px; /* Tighter padding for grid */')) {
  css = css.replace('padding: 8px; /* Tighter padding for grid */', 'padding: 4px; /* Tighter padding for grid */');
}

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Grid card padding changed to 4px");
