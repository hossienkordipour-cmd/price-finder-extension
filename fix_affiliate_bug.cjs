const fs = require('fs');

let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

js = js.replace(
  'const finalUrl = getAffiliateUrl(item.source, item.url);',
  'const finalUrl = getAffiliateUrl(item.store || item.source, item.url);'
);

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Fixed affiliate URL parameter bug");
