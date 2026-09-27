const fs = require('fs');

const css = `
:root {
  --bg-color: #F7F7F7;
  --card-bg: #FFFFFF;
  --text-dark: #111827;
  --text-gray: #6B7280;
  --text-light: #9CA3AF;
  --primary: #00A95C;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

body {
  background-color: var(--bg-color);
  color: var(--text-dark);
  padding: 16px;
  direction: rtl;
}

.hidden {
  display: none !important;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.header-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-badge {
  background: rgba(0, 169, 92, 0.1);
  color: var(--primary);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}
.header-close-btn {
  background: #E5E7EB;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #4B5563;
}

/* Empty State / Loading */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 0;
}
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--text-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}
@keyframes spin { 100% { transform: rotate(360deg); } }

/* Manual Search */
.manual-search-input {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  font-size: 13px;
  background: #fff;
  outline: none;
}
.manual-search-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-light);
}

/* Section Header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  margin-top: 24px;
}
.section-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--text-dark);
}
.grid-icon {
  color: var(--text-dark);
  cursor: pointer;
}

/* Filters Row */
.filters-row {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  margin-bottom: 16px;
}
.pill-select {
  appearance: none;
  background-color: var(--card-bg);
  border: none;
  border-radius: 20px;
  padding: 8px 16px 8px 32px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dark);
  cursor: pointer;
  background-image: url('data:image/svg+xml;utf8,<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="6 9 12 15 18 9"></polyline></svg>');
  background-repeat: no-repeat;
  background-position: left 12px center;
}

/* Cards */
.result-card {
  display: flex;
  background: var(--card-bg);
  border-radius: 16px;
  padding: 12px;
  margin-bottom: 12px;
  text-decoration: none;
  color: inherit;
  align-items: center;
  border: none;
  box-shadow: none;
}
.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-left: 12px;
}
.card-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-dark);
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}
.card-store {
  font-size: 11px;
  color: var(--text-light);
  margin-bottom: 12px;
}
.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.card-discount {
  font-size: 10px;
  color: var(--text-light);
}
.card-price {
  font-size: 14px;
  font-weight: 800;
  color: var(--text-dark);
}
.card-price span {
  font-size: 10px;
  font-weight: 400;
  color: var(--text-light);
  margin-right: 4px;
}
.card-image-wrapper {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  background: #F3F4F6;
  flex-shrink: 0;
  overflow: hidden;
}
.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Skeletons */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
.skeleton-card {
  display: flex;
  background: var(--card-bg);
  border-radius: 16px;
  padding: 12px;
  margin-bottom: 12px;
  align-items: center;
}
.skeleton-content {
  flex: 1;
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.skeleton-line {
  height: 12px;
  background: #E5E7EB;
  border-radius: 6px;
  animation: pulse 1.5s infinite;
}
.skeleton-img {
  width: 72px;
  height: 72px;
  background: #E5E7EB;
  border-radius: 12px;
  flex-shrink: 0;
  animation: pulse 1.5s infinite;
}
`;
fs.writeFileSync('sidebar/sidebar.css', css);

const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>piqo</title>
  <link rel="stylesheet" href="sidebar.css" />
</head>
<body>
  <header class="header">
    <div class="header-logo">
      <strong style="font-size: 18px; letter-spacing: -0.5px;">piqo</strong>
      <span class="header-badge">بتا</span>
    </div>
    <button id="popup-close-btn" class="header-close-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  </header>

  <!-- Base Product -->
  <div id="current-product" class="hidden"></div>

  <!-- Loading -->
  <div id="loading-state" class="state-container hidden">
    <div class="spinner"></div>
    <p style="font-size: 12px; color: var(--text-light);">در حال جستجو...</p>
  </div>

  <!-- Empty / Manual Search -->
  <div id="empty-state" class="state-container">
    <form id="manual-search-form" style="width: 100%; position: relative; margin-bottom: 24px;">
      <input type="text" id="manual-search-input" placeholder="جستجوی کالا..." autocomplete="off" class="manual-search-input" />
      <button type="submit" class="manual-search-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </button>
    </form>
  </div>

  <!-- Results Section -->
  <div id="results-state" class="hidden">
    <div class="section-header">
      <h2 class="section-title">محصولات مشابه</h2>
      <svg class="grid-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    </div>

    <div class="filters-row">
      <select id="sort-filter" class="pill-select">
        <option value="cheap">ارزان ترین</option>
        <option value="match">دقیق ترین</option>
      </select>
      <select id="condition-filter" class="pill-select">
        <option value="all">وضعیت کالا</option>
        <option value="new">فقط نو</option>
        <option value="used">دست دوم</option>
      </select>
    </div>

    <div id="results-list"></div>
  </div>

  <!-- Error -->
  <div id="error-state" class="state-container hidden">
    <p style="font-size: 12px; color: var(--text-light);">خطا در جستجو</p>
  </div>

  <script src="sidebar.js"></script>
</body>
</html>`;
fs.writeFileSync('sidebar/sidebar.html', html);

console.log("Rewrote CSS and HTML to match Figma design");
