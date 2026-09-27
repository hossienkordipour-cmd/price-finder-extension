const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

js = js.replace(
  "    <${tag} ${tagAttrs} class=\"result-card${isBase ? ' base-product-card' : ''}\">`\n      <div",
  "    <${tag} ${tagAttrs} class=\"result-card${isBase ? ' base-product-card' : ''}\">\n      <div"
);

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Fixed syntax error");
