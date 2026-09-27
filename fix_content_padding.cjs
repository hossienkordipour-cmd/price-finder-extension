const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.card-content {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  padding-top: 2px;', 
                  '.card-content {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  padding-top: 4px;');

// If the padding-top was somewhere else or the spacing was different, do a simpler replace too:
if (!css.includes('padding-top: 4px;') && css.includes('.card-content {')) {
  css = css.replace('padding-top: 2px;', 'padding-top: 4px;');
}

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Card content top padding changed to 4px");
