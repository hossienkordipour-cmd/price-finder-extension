const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const oldListSvg = 'const listSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="6" rx="1"></rect><rect x="3" y="14" width="18" height="6" rx="1"></rect></svg>`;';
const newListSvg = 'const listSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>`;';

js = js.replace(oldListSvg, newListSvg);
fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated list SVG icon");
