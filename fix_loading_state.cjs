const fs = require('fs');

// 1. Update HTML - replace spinner + text with nicer loading view
let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');
html = html.replace(
  `  <div id="loading-state" class="state-container hidden">
    <div class="spinner"></div>
    <p style="font-size: 12px; color: var(--text-light);">در حال جستجو...</p>
  </div>`,
  `  <div id="loading-state" class="state-container hidden">
    <div class="loading-view">
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="loading-title">داریم می‌گردیم...</div>
      <div class="loading-subtitle">قیمت‌ها رو از فروشگاه‌های مختلف بررسی می‌کنیم.</div>
    </div>
  </div>`
);
fs.writeFileSync('sidebar/sidebar.html', html);
console.log("Updated loading state HTML");

// 2. Update CSS - replace old spinner with new dot animation
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// Remove old spinner
css = css.replace(`.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--text-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}
@keyframes spin { 100% { transform: rotate(360deg); } }`, 
`/* Loading Dots */
.loading-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}
.loading-dots {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}
.loading-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--primary);
  animation: dot-bounce 1.2s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
  40% { transform: scale(1.2); opacity: 1; }
}
.loading-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: 6px;
}
.loading-subtitle {
  font-size: 12px;
  color: var(--text-gray);
  line-height: 1.6;
}`);

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Updated loading state CSS");
