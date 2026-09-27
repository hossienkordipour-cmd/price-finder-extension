const fs = require('fs');

let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// 1. Fix Scrollbar
const hideScrollbarCss = `
/* Hide scrollbar for Chrome, Safari and Opera */
::-webkit-scrollbar {
  display: none;
}
/* Hide scrollbar for IE, Edge and Firefox */
body {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
`;

if (!css.includes('::-webkit-scrollbar')) {
  css += hideScrollbarCss;
  console.log("Added scrollbar hiding rules.");
}

// 2. Fix Flexbox Overflow for card-content
if (!css.includes('min-width: 0;') && css.includes('.card-content {') ) {
  css = css.replace('.card-content {\n  flex: 1;', '.card-content {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;');
  console.log("Added min-width: 0 to card-content.");
} else if (css.includes('.card-content {')) {
  // If my replace regex is too strict, I'll just do a basic string replace
  css = css.replace('.card-content {', '.card-content {\n  min-width: 0;\n  overflow: hidden;');
  console.log("Added min-width: 0 to card-content (fallback).");
}

fs.writeFileSync('sidebar/sidebar.css', css);

