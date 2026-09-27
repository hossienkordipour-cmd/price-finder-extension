const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// 1. Text frame top padding
css = css.replace('.card-content {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  padding-top: 0;', 
                  '.card-content {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  padding-top: 2px;');

// 2. Distance between store and price (store margin-bottom)
css = css.replace('.card-store {\n  font-size: 11px;\n  color: #777777;\n  margin-bottom: 12px;', 
                  '.card-store {\n  font-size: 11px;\n  color: #777777;\n  margin-bottom: 4px;');

// 3. Remove margin-top: auto from card-bottom in list view
css = css.replace('.card-bottom {\n  display: flex;\n  justify-content: space-between;\n  align-items: baseline;\n  margin-top: auto;\n}', 
                  '.card-bottom {\n  display: flex;\n  justify-content: space-between;\n  align-items: baseline;\n}');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Adjusted text frame padding and spacing");
