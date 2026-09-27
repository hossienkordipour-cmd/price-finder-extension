const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css += `
/* Base card specific overrides */
.base-product-card {
  cursor: default !important;
  pointer-events: none !important;
}
.base-product-card:hover {
  transform: none !important;
}
`;

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Added base card css overrides");
