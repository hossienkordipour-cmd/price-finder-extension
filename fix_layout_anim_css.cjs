const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

const newAnimCss = `
#results-list {
  transition: opacity 0.15s ease-out, transform 0.15s ease-out;
}
#results-list.switching-layout {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}
`;

css += newAnimCss;
fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Added CSS for layout animation");
