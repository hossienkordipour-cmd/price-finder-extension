const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

const additionalCss = `
/* Multi-select and checkboxes */
.dropdown-header {
  display: flex;
  align-items: center;
  gap: 6px;
}
.clear-filter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #E5E7EB;
  color: #6B7280;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  z-index: 2;
}
.clear-filter:hover {
  background: #D1D5DB;
  color: #374151;
}
.clear-filter.hidden {
  display: none;
}
.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.check-box {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid #D1D5DB;
  background: #FFF;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.check-box svg {
  opacity: 0;
  transition: opacity 0.2s;
}
.dropdown-item.selected .check-box {
  background: var(--primary);
  border-color: var(--primary);
}
.dropdown-item.selected .check-box svg {
  opacity: 1;
}
.dropdown-item.selected {
  /* Override background for checkbox items so they don't look completely gray */
  background: transparent;
}
.dropdown-item.selected:hover {
  background: #F0F0F0;
}
`;

css += additionalCss;
fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Added CSS for checkboxes and clear filter");
