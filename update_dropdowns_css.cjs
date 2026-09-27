const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

const oldCss = `.pill-select {
  appearance: none;
  background-color: var(--card-bg);
  border: none;
  border-radius: 20px;
  padding: 8px 12px 8px 28px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dark);
  cursor: pointer;
  background-image: url('data:image/svg+xml;utf8,<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="6 9 12 15 18 9"></polyline></svg>');
  background-repeat: no-repeat;
  background-position: left 10px center;
}`;

const newCss = `.custom-dropdown {
  position: relative;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dark);
  user-select: none;
}
.dropdown-header {
  background-color: var(--card-bg);
  border-radius: 20px;
  padding: 8px 12px 8px 28px;
  cursor: pointer;
  background-image: url('data:image/svg+xml;utf8,<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="6 9 12 15 18 9"></polyline></svg>');
  background-repeat: no-repeat;
  background-position: left 10px center;
  transition: background-color 0.2s;
}
.dropdown-header:hover {
  background-color: #ECECEC;
}
.dropdown-list {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 6px;
  min-width: 140px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dropdown-list.hidden {
  display: none;
}
.dropdown-item {
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  color: var(--text-muted);
}
.dropdown-item:hover {
  background: #F3F4F6;
  color: var(--text-dark);
}
.dropdown-item.selected {
  background: #E5E7EB;
  color: var(--text-dark);
}`;

css = css.replace(oldCss, newCss);
fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Updated CSS for custom dropdowns");
