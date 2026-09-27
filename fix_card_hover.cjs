const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// Add transition to .result-card
css = css.replace('.result-card {\n  display: flex;\n  gap: 8px;', 
                  '.result-card {\n  display: flex;\n  gap: 8px;\n  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);');

// Add :hover state
const hoverCss = `
.result-card:hover {
  transform: scale(1.02);
}
`;

if (!css.includes('.result-card:hover {')) {
  css = css.replace('.result-card {', hoverCss + '\n.result-card {');
}

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Added smooth hover zoom effect to cards");
