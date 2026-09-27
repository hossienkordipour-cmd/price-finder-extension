const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

// Change the tag: use <div> for isBase, <a> for normal cards
js = js.replace(
  "  return `\n    <a href=\"${item.url}\" target=\"_blank\" class=\"result-card\">",
  "  const tag = isBase ? 'div' : 'a';\n  const tagAttrs = isBase ? '' : `href=\"${item.url}\" target=\"_blank\"`;\n  return `\n    <${tag} ${tagAttrs} class=\"result-card${isBase ? ' base-product-card' : ''}\">`"
);

js = js.replace(
  "    </a>\n  `;\n}",
  "    </${tag}>\n  `;\n}"
);

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated base card to use div instead of anchor");
