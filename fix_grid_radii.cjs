const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// Update result-card explicitly for grid view just in case
if (!css.includes('border-radius: 16px;', css.indexOf('.results-list.grid-view .result-card {'))) {
  css = css.replace('.results-list.grid-view .result-card {\n  flex-direction: column;', 
                    '.results-list.grid-view .result-card {\n  flex-direction: column;\n  border-radius: 16px;');
}

// Update card-image-wrapper border radius to 12px
css = css.replace('.results-list.grid-view .card-image-wrapper {\n  width: 100%;\n  height: 140px; \n  border-radius: 8px;', 
                  '.results-list.grid-view .card-image-wrapper {\n  width: 100%;\n  height: 140px; \n  border-radius: 12px;');

// Update skeleton img too
css = css.replace('.results-list.grid-view .skeleton-img {\n  width: 100%;\n  height: 140px;', 
                  '.results-list.grid-view .skeleton-img {\n  width: 100%;\n  height: 140px;\n  border-radius: 12px;');


// Add side padding to card-content
css = css.replace('.results-list.grid-view .card-content {\n  padding-top: 0;\n  justify-content: flex-start;', 
                  '.results-list.grid-view .card-content {\n  padding-top: 0;\n  justify-content: flex-start;\n  padding-left: 4px;\n  padding-right: 4px;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Updated border-radii and padding");
