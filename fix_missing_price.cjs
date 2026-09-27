const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const oldHtmlBlock = `<div class="card-bottom">
          <div class="card-price">\${formatPrice(item.price)}<span>تومان</span></div>
          \${discountHtml}
        </div>`;

const newHtmlBlock = `\${item.price && item.price > 0 ? \`
        <div class="card-bottom">
          <div class="card-price">\${formatPrice(item.price)}<span>تومان</span></div>
          \${discountHtml}
        </div>
        \` : ''}`;

js = js.replace(oldHtmlBlock, newHtmlBlock);
fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated JS to conditionally render card-bottom");

let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');
if (!css.includes('.card-store:last-child')) {
  css += '\n.card-store:last-child {\n  margin-bottom: 0;\n}\n';
  fs.writeFileSync('sidebar/sidebar.css', css);
  console.log("Updated CSS for last-child margin");
}
