const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css += `
/* Character Logo Layout */
.logo-wrapper {
  display: flex;
  align-items: center;
  gap: 4px; /* Space between character and text logo */
}

.character-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
  margin-top: -6px; /* Adjust slightly up or down if needed based on the image crop */
}
`;

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Updated CSS with character logo styles");
