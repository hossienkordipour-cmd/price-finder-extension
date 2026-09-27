const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// Fix image size to 72x72
css = css.replace('.base-card-img-wrapper {\n  width: 96px;\n  height: 96px;', '.base-card-img-wrapper {\n  width: 72px;\n  height: 72px;');

// Fix title font to 13px
css = css.replace('.base-card-title {\n  font-size: 14px;', '.base-card-title {\n  font-size: 13px;');

// Fix price to 16px
css = css.replace('.base-card-price {\n  font-size: 18px;', '.base-card-price {\n  font-size: 16px;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Updated base card CSS sizes");
