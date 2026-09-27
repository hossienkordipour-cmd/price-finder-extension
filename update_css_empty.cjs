const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css += `
/* Empty States */
.empty-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}
.empty-illustration {
  width: 160px;
  height: auto;
  margin-bottom: 24px;
}
.empty-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-dark);
  margin-bottom: 8px;
}
.empty-subtitle {
  font-size: 13px;
  color: var(--text-gray);
  line-height: 1.6;
}
.clear-filters-btn {
  margin-top: 24px;
  background-color: #171717;
  color: #FFFFFF;
  border: none;
  border-radius: 100px;
  padding: 10px 24px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.clear-filters-btn:hover {
  opacity: 0.85;
}
`;

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Updated CSS for empty states");
