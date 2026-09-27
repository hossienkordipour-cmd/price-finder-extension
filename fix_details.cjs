const fs = require('fs');

// 1. Update HTML
let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');
const oldSvg = `<svg class="grid-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
      </svg>`;
const newSvg = `<button class="grid-icon-btn" aria-label="تغییر چیدمان">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      </button>`;

if (html.includes('<svg class="grid-icon" width="20" height="20"')) {
  html = html.replace(oldSvg, newSvg);
  fs.writeFileSync('sidebar/sidebar.html', html);
  console.log("Updated HTML grid icon");
}

// 2. Update CSS
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// Title weight
css = css.replace('.card-title {\n  font-size: 14px;\n  font-weight: 700;', '.card-title {\n  font-size: 14px;\n  font-weight: 600;');

// Image dimensions
css = css.replace('.card-image-wrapper {\n  width: 72px;\n  height: 72px;', '.card-image-wrapper {\n  width: 80px;\n  height: 80px;');
css = css.replace('.skeleton-img {\n  width: 72px;\n  height: 72px;', '.skeleton-img {\n  width: 80px;\n  height: 80px;');

// Store color
css = css.replace('.card-store {\n  font-size: 11px;\n  color: var(--text-light);', '.card-store {\n  font-size: 11px;\n  color: #777777;');

// Toman color and margin
css = css.replace('.card-price span {\n  font-size: 10px;\n  font-weight: 400;\n  color: var(--text-light);\n  margin-right: 4px;', '.card-price span {\n  font-size: 10px;\n  font-weight: 400;\n  color: #909090;\n  margin-right: 2px;');

// Grid Icon Button CSS
if (css.includes('.grid-icon {\n  color: var(--text-dark);\n  cursor: pointer;\n}')) {
  css = css.replace('.grid-icon {\n  color: var(--text-dark);\n  cursor: pointer;\n}', `.grid-icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-dark);
}
.grid-icon-btn:hover {
  background: #E5E7EB;
}`);
  console.log("Updated CSS grid-icon rule");
}

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Updated CSS styles");

