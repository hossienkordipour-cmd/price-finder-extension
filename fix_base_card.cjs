const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const oldGenerateCard = `function generateCardHtml(item, isBase = false) {
  let discountHtml = "";
  if (!isBase && currentProduct && currentProduct.price && item.price < currentProduct.price) {
    const diff = Math.round(((currentProduct.price - item.price) / currentProduct.price) * 100);
    if (diff > 0) {
      discountHtml = \`<div class="card-discount">\${diff.toLocaleString("fa-IR")}٪ ارزان تر</div>\`;
    }
  }

  const storeText = item.condition === "used" ? \`\${item.store} - کارکرده\` : item.store;

  return \`
    <a href="\${item.url}" target="_blank" class="result-card">
      <div class="card-image-wrapper">
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
      </div>
    </a>
  \`;
}`;

const fallbackSvg = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23d1d5db%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Crect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22 ry=%222%22%3E%3C/rect%3E%3Ccircle cx=%228.5%22 cy=%228.5%22 r=%221.5%22%3E%3C/circle%3E%3Cpolyline points=%2221 15 16 10 5 21%22%3E%3C/polyline%3E%3C/svg%3E";

const newGenerateCard = `function generateBaseCardHtml(item) {
  const priceHtml = item.price && item.price > 0 ? \`
    <div class="base-card-price">\${formatPrice(item.price)}<span>تومان</span></div>
  \` : '';
  return \`
    <div class="base-card">
      <div class="base-card-top">
        <div class="base-card-content">
          <h3 class="base-card-title">\${item.name || 'کالا'}</h3>
        </div>
        <div class="base-card-img-wrapper">
          <img class="base-card-img" src="\${item.image || '${fallbackSvg}'}" alt="" onerror="this.src='${fallbackSvg}'" />
        </div>
      </div>
      <div class="base-card-bottom">
        <div class="base-card-store">\${item.store || ''}</div>
        \${priceHtml}
      </div>
    </div>
  \`;
}

function generateCardHtml(item, isBase = false) {
  if (isBase) return generateBaseCardHtml(item);

  let discountHtml = "";
  if (currentProduct && currentProduct.price && item.price < currentProduct.price) {
    const diff = Math.round(((currentProduct.price - item.price) / currentProduct.price) * 100);
    if (diff > 0) {
      discountHtml = \`<div class="card-discount">\${diff.toLocaleString("fa-IR")}٪ ارزان تر</div>\`;
    }
  }

  const storeText = item.condition === "used" ? \`\${item.store} - کارکرده\` : item.store;

  return \`
    <a href="\${item.url}" target="_blank" class="result-card">
      <div class="card-image-wrapper">
        <img class="card-img" src="\${item.image || '${fallbackSvg}'}" alt="" onerror="this.src='${fallbackSvg}'" />
      </div>
      <div class="card-content">
        <h3 class="card-title">\${item.name || currentProduct?.name || 'کالا'}</h3>
        <div class="card-store">\${storeText}</div>
        \${item.price && item.price > 0 ? \`
        <div class="card-bottom">
          <div class="card-price">\${formatPrice(item.price)}<span>تومان</span></div>
          \${discountHtml}
        </div>
        \` : ''}
      </div>
    </a>
  \`;
}`;

js = js.replace(oldGenerateCard, newGenerateCard);
fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated generateCardHtml");
