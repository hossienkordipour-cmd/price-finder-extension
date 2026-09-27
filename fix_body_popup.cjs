const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace(
  'body {\n  background-color: var(--bg-color);\n  color: var(--text-dark);\n  padding: 16px;\n  direction: rtl;\n}',
  'body {\n  background-color: var(--bg-color);\n  color: var(--text-dark);\n  padding: 16px;\n  direction: rtl;\n  min-width: 380px;\n  min-height: 500px;\n}'
);

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Updated body CSS for native popup sizing");
