const fs = require('fs');
const html = fs.readFileSync('digipay.html', 'utf8');

const blocks = html.split('<article>');
for (let i = 1; i < 6; i++) {
  const block = blocks[i];
  const logoSnippetMatch = block.match(/class="store-logo([^]*?)<\/div>/i);
  if (logoSnippetMatch) {
    const snippet = logoSnippetMatch[1];
    const altMatch = snippet.match(/alt=(?:"([^"]+)"|([^\r\n]+))/i);
    let store = altMatch ? (altMatch[1] || altMatch[2]) : null;
    if (store) store = store.trim();
    console.log("Persian Store:", store);
  }
}
