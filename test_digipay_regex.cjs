const fs = require('fs');
const html = fs.readFileSync('digipay.html', 'utf8');

const blocks = html.split('<article>');
for (let i = 1; i < 6; i++) {
  const block = blocks[i];
  const faStoreMatch = block.match(/class="store-logo[^>]*>[\s\S]*?<img[\s\S]*?alt="([^"]+)"/i);
  console.log("Store:", faStoreMatch ? faStoreMatch[1] : null);
}
