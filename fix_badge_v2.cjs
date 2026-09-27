const fs = require('fs');

// 1. UPDATE JS (move discount html back to bottom for list-view, add grid-discount logic for grid-view)
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const oldHtml = `      <div class="card-image-wrapper">
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

// We inject discountHtml in BOTH places. We will use CSS to toggle visibility based on grid vs list mode!
const newHtml = `      <div class="card-image-wrapper">
        <img class="card-img" src="\${item.image || 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23d1d5db%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Crect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22 ry=%222%22%3E%3C/rect%3E%3Ccircle cx=%228.5%22 cy=%228.5%22 r=%221.5%22%3E%3C/circle%3E%3Cpolyline points=%2221 15 16 10 5 21%22%3E%3C/polyline%3E%3C/svg%3E'}" alt="" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23d1d5db%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Crect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22 ry=%222%22%3E%3C/rect%3E%3Ccircle cx=%228.5%22 cy=%228.5%22 r=%221.5%22%3E%3C/circle%3E%3Cpolyline points=%2221 15 16 10 5 21%22%3E%3C/polyline%3E%3C/svg%3E'" />
        \${discountHtml ? discountHtml.replace('class="card-discount"', 'class="card-discount overlay-discount"') : ''}
      </div>
      <div class="card-content">
        <h3 class="card-title">\${item.name || currentProduct?.name || 'کالا'}</h3>
        <div class="card-store">\${isBase ? item.store : storeText}</div>
        \${item.price && item.price > 0 ? \`
        <div class="card-bottom">
          <div class="card-price">\${formatPrice(item.price)}<span>تومان</span></div>
          \${discountHtml ? discountHtml.replace('class="card-discount"', 'class="card-discount bottom-discount"') : ''}
        </div>
        \` : ''}
      </div>`;

js = js.replace(oldHtml, newHtml);
fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated HTML in JS");

// 2. UPDATE CSS
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

const oldCss = `.card-discount {
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

const newCss = `.card-discount {
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
}

.bottom-discount {
  display: inline-flex;
}

.overlay-discount {
  display: none;
  position: absolute;
  right: 4px;
  bottom: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1); /* slight shadow for visibility over images */
}

/* In grid view, swap them! */
.results-list.grid-view .bottom-discount {
  display: none;
}
.results-list.grid-view .overlay-discount {
  display: inline-flex;
}`;

css = css.replace(oldCss, newCss);

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Updated CSS");
