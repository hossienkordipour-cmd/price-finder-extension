const fs = require('fs');

let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const oldCardGen = `function generateCardHtml(item, isBase = false) {
  let discountHtml = "";
  if (!isBase && currentProduct && currentProduct.price && item.price < currentProduct.price) {
    const diff = Math.round(((currentProduct.price - item.price) / currentProduct.price) * 100);
    if (diff > 0) {
      discountHtml = \`<div class="card-discount">\${diff.toLocaleString("fa-IR")}٪ ارزان تر</div>\`;
    }
  }

  const storeText = item.condition === "used" ? \`\${item.store} - دست دوم\` : \`\${item.store} - نو\`;

  return \`
    <a href="\${item.url}" target="_blank" class="result-card">
      <div class="card-image-wrapper">
        <img class="card-img" src="\${item.image || 'https://via.placeholder.com/150'}" alt="" onerror="this.src='https://via.placeholder.com/150'" />
      </div>
      <div class="card-content">
        <h3 class="card-title">\${item.name || currentProduct?.name || 'کالا'}</h3>
        <div class="card-store">\${isBase ? item.store : storeText}</div>
        <div class="card-bottom">
          <div class="card-price">\${formatPrice(item.price)} <span>تومان</span></div>
          \${discountHtml}
        </div>
      </div>
    </a>
  \`;
}`;

const newCardGen = `function generateCardHtml(item, isBase = false) {
  let discountHtml = "";
  if (!isBase && currentProduct && currentProduct.price && item.price < currentProduct.price) {
    const diff = Math.round(((currentProduct.price - item.price) / currentProduct.price) * 100);
    if (diff > 0) {
      discountHtml = \`<div class="card-discount">\${diff.toLocaleString("fa-IR")}٪ ارزان تر</div>\`;
    }
  }

  const storeText = item.condition === "used" ? \`\${item.store} - دست دوم\` : \`\${item.store} - نو\`;

  return \`
    <a href="\${item.url}" target="_blank" class="result-card">
      <div class="card-top">
        <div class="card-image-wrapper">
          <img class="card-img" src="\${item.image || 'https://via.placeholder.com/150'}" alt="" onerror="this.src='https://via.placeholder.com/150'" />
        </div>
        <div class="card-info">
          <h3 class="card-title">\${item.name || currentProduct?.name || 'کالا'}</h3>
          <div class="card-store">\${isBase ? item.store : storeText}</div>
        </div>
      </div>
      <div class="card-bottom">
        \${discountHtml}
        <div class="card-price">\${formatPrice(item.price)} <span>تومان</span></div>
      </div>
    </a>
  \`;
}`;

js = js.replace(oldCardGen, newCardGen);

const oldSkelGen = `function generateSkeletonHtml() {
  return \`
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-content">
        <div class="skeleton-line" style="width: 80%;"></div>
        <div class="skeleton-line" style="width: 40%; margin-bottom: 12px;"></div>
        <div class="skeleton-line" style="width: 60%;"></div>
      </div>
    </div>
  \`;
}`;

const newSkelGen = `function generateSkeletonHtml() {
  return \`
    <div class="skeleton-card">
      <div class="card-top">
        <div class="skeleton-img"></div>
        <div class="card-info">
          <div class="skeleton-line" style="width: 80%; margin-bottom: 8px;"></div>
          <div class="skeleton-line" style="width: 40%;"></div>
        </div>
      </div>
      <div class="card-bottom">
        <div class="skeleton-line" style="width: 20%; height: 12px;"></div>
        <div class="skeleton-line" style="width: 40%; height: 16px;"></div>
      </div>
    </div>
  \`;
}`;

js = js.replace(oldSkelGen, newSkelGen);

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated JS!");

