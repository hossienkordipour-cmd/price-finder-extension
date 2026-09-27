const fs = require('fs');

let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');

const oldHeader = `<div class="header-logo">
      <img class="primary-logo" src="primary-logo.png" width="50" height="24" style="object-fit: contain;" alt="PIQO" />
      <span class="header-badge">نسخه بتا</span>
    </div>`;

const newHeader = `<div class="header-logo">
      <div class="logo-wrapper">
        <img class="character-logo" src="assets/logo-character.png" alt="piqo character" />
        <img class="primary-logo" src="primary-logo.png" width="50" height="24" style="object-fit: contain;" alt="PIQO" />
      </div>
      <span class="header-badge">نسخه بتا</span>
    </div>`;

html = html.replace(oldHeader, newHeader);
fs.writeFileSync('sidebar/sidebar.html', html);
console.log("Updated HTML with character logo");
