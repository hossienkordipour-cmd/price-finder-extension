const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// 1. Image wrapper size
css = css.replace('.card-image-wrapper {\n  width: 80px;\n  height: 80px;', 
                  '.card-image-wrapper {\n  width: 72px;\n  height: 72px;');

css = css.replace('.skeleton-img {\n  width: 80px;\n  height: 80px;', 
                  '.skeleton-img {\n  width: 72px;\n  height: 72px;');

// 2. Title size
css = css.replace('.card-title {\n  font-size: 14px;', 
                  '.card-title {\n  font-size: 12px;');

// 3. Store size
css = css.replace('.card-store {\n  font-size: 12px;', 
                  '.card-store {\n  font-size: 10px;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("List view sizes adjusted");
