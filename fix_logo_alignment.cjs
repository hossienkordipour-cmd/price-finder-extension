const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// I previously added margin-top: -6px to the character-logo which is probably causing it to sit too high now.
// Let's remove that and just rely on flexbox alignment. Also we can try center alignment.
css = css.replace('.character-logo {\n  height: 32px;\n  width: auto;\n  object-fit: contain;\n  margin-top: -6px; /* Adjust slightly up or down if needed based on the image crop */\n}', 
`.character-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
}`);

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Updated character logo alignment");
