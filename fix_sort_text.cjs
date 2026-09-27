const fs = require('fs');
let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');

html = html.replace('<div class="dropdown-item" data-value="match">دقیق ترین</div>', 
                    '<div class="dropdown-item" data-value="match">مرتبط ترین</div>');

fs.writeFileSync('sidebar/sidebar.html', html);
console.log("Updated sort option text");
