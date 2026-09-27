const fs = require('fs');
const SVG = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23d1d5db%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Crect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22 ry=%222%22%3E%3C/rect%3E%3Ccircle cx=%228.5%22 cy=%228.5%22 r=%221.5%22%3E%3C/circle%3E%3Cpolyline points=%2221 15 16 10 5 21%22%3E%3C/polyline%3E%3C/svg%3E";

let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

// Swap image to be first (right side in RTL), price before store in bottom
const oldTop = `      <div class="base-card-top">
        <div class="base-card-content">
          <h3 class="base-card-title">\${item.name || 'کالا'}</h3>
        </div>
        <div class="base-card-img-wrapper">
          <img class="base-card-img" src="\${item.image || '${SVG}'}" alt="" onerror="this.src='${SVG}'" />
        </div>
      </div>
      <div class="base-card-bottom">
        <div class="base-card-store">\${item.store || ''}</div>
        \${priceHtml}
      </div>`;

const newTop = `      <div class="base-card-top">
        <div class="base-card-img-wrapper">
          <img class="base-card-img" src="\${item.image || '${SVG}'}" alt="" onerror="this.src='${SVG}'" />
        </div>
        <div class="base-card-content">
          <h3 class="base-card-title">\${item.name || 'کالا'}</h3>
        </div>
      </div>
      <div class="base-card-bottom">
        \${priceHtml}
        <div class="base-card-store">\${item.store || ''}</div>
      </div>`;

js = js.replace(oldTop, newTop);
fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Swapped image/content order and price/store order");
