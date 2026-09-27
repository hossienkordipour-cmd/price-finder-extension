const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// We will reconstruct the .result-card and related styles entirely.
// Find the start of .result-card
const startIdx = css.indexOf('.result-card {');
// Find the end of the .skeleton-img block which is the last related rule we modify
const endIdx = css.indexOf('}', css.indexOf('.skeleton-img {')) + 1;

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `
.result-card {
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  text-decoration: none;
  color: inherit;
  border: none;
  box-shadow: none;
}
.card-top {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
}
.card-image-wrapper {
  width: 80px;
  height: 80px;
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
.card-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.card-store {
  font-size: 12px;
  color: #777777;
}
.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  border-top: 1px solid #F3F4F6;
  margin-top: 16px;
  padding-top: 16px;
}
.card-price {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-dark);
}
.card-price span {
  font-size: 10px;
  font-weight: 400;
  color: #909090;
  margin-right: 2px;
}
.card-discount {
  font-size: 12px;
  font-weight: 600;
  color: #777777;
}

/* Skeletons */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
.skeleton-card {
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
}
.skeleton-line {
  height: 12px;
  background: #E5E7EB;
  border-radius: 6px;
  animation: pulse 1.5s infinite;
}
.skeleton-img {
  width: 80px;
  height: 80px;
  background: #E5E7EB;
  border-radius: 12px;
  flex-shrink: 0;
  animation: pulse 1.5s infinite;
}
`.trim();

  css = css.substring(0, startIdx) + replacement + css.substring(endIdx);
  fs.writeFileSync('sidebar/sidebar.css', css);
  console.log("Updated CSS block");
} else {
  console.log("Could not find start/end bounds for CSS replace");
}
