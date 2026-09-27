const fs = require('fs');

// 1. UPDATE JS (move discount html inside image wrapper)
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const oldHtml = `      <div class="card-image-wrapper">
        <img class="card-img" src="\${item.image || 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23d1d5db%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Crect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22 ry=%222%22%3E%3C/rect%3E%3Ccircle cx=%228.5%22 cy=%228.5%22 r=%221.5%22%3E%3C/circle%3E%3Cpolyline points=%2221 15 16 10 5 21%22%3E%3C/polyline%3E%3C/svg%3E'}" alt="" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23d1d5db%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Crect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22 ry=%222%22%3E%3C/rect%3E%3Ccircle cx=%228.5%22 cy=%228.5%22 r=%221.5%22%3E%3C/circle%3E%3Cpolyline points=%2221 15 16 10 5 21%22%3E%3C/polyline%3E%3C/svg%3E'" />
      </div>
      <div class="card-content">
        <h3 class="card-title">\${item.name || currentProduct?.name || 'کالا'}</h3>
        <div class="card-store">\${isBase ? item.store : storeText}</div>
        \${item.price && item.price > 0 ? \`
        <div class="card-bottom">
          <div class="card-price">\${formatPrice(item.price)}<span>تومان</span></div>
          \${discountHtml}
        </div>
        \` : ''}
      </div>`;

const newHtml = `      <div class="card-image-wrapper">
        <img class="card-img" src="\${item.image || 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23d1d5db%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Crect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22 ry=%222%22%3E%3C/rect%3E%3Ccircle cx=%228.5%22 cy=%228.5%22 r=%221.5%22%3E%3C/circle%3E%3Cpolyline points=%2221 15 16 10 5 21%22%3E%3C/polyline%3E%3C/svg%3E'}" alt="" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23d1d5db%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Crect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22 ry=%222%22%3E%3C/rect%3E%3Ccircle cx=%228.5%22 cy=%228.5%22 r=%221.5%22%3E%3C/circle%3E%3Cpolyline points=%2221 15 16 10 5 21%22%3E%3C/polyline%3E%3C/svg%3E'" />
        \${discountHtml}
      </div>
      <div class="card-content">
        <h3 class="card-title">\${item.name || currentProduct?.name || 'کالا'}</h3>
        <div class="card-store">\${isBase ? item.store : storeText}</div>
        \${item.price && item.price > 0 ? \`
        <div class="card-bottom">
          <div class="card-price">\${formatPrice(item.price)}<span>تومان</span></div>
        </div>
        \` : ''}
      </div>`;

js = js.replace(oldHtml, newHtml);
fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated HTML in JS");

// 2. UPDATE CSS
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// Make wrapper relative
css = css.replace('.card-image-wrapper {\n  width: 72px;', '.card-image-wrapper {\n  position: relative;\n  width: 72px;');

// Update card-discount for absolute positioning
const oldDiscountCss = `.card-discount {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 100px;
  background-color: #ECFDF3;
  color: #067647;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}`;

const newDiscountCss = `.card-discount {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 100px;
  background-color: #ECFDF3;
  color: #067647;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  position: absolute;
  right: 4px;
  bottom: 4px;
}`;

css = css.replace(oldDiscountCss, newDiscountCss);

// Remove the display:none override for grid view, we want it visible there too!
css = css.replace(`.results-list.grid-view .card-discount {\n  display: none; /* Hide in grid view to keep it clean */\n}\n`, '');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Updated CSS");
