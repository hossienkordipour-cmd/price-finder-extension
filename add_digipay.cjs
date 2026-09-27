const fs = require('fs');

let code = fs.readFileSync('background.js', 'utf8');

const digipayFunc = `
async function searchDigipay(query) {
  try {
    const url = \`https://www.mydigipay.com/search/0?query=\${encodeURIComponent(query)}\`;
    const res = await fetchWithTimeout(url, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0" }
    }, 10000);
    
    if (!res.ok) return [];
    const html = await res.text();
    
    let results = [];
    const blocks = html.split('<article>');
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      
      const linkMatch = block.match(/goToProduct\\(['"]([^'"]+)['"],\\s*['"]([^'"]+)['"]/);
      const urlMatch = linkMatch ? linkMatch[1] : '';
      const storeDomain = linkMatch ? linkMatch[2] : '';
      
      const altMatch = block.match(/class="blend-multiply"[\\s\\S]*?alt="([^"]+)"/i) || block.match(/alt="([^"]+)"[\\s\\S]*?class="blend-multiply"/i);
      const name = altMatch ? altMatch[1].replace(/<\\/?em>/g, '') : '';
      
      const srcMatch = block.match(/class="blend-multiply"[\\s\\S]*?src="([^"]+)"/i) || block.match(/src="([^"]+)"[\\s\\S]*?class="blend-multiply"/i);
      const image = srcMatch ? srcMatch[1] : '';
      
      const priceMatch = block.match(/class="price[^>]*>[\\s\\S]*?<span[^>]*>\\s*([\\d,]+)\\s*<\\/span>/i);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
      
      if (price <= 0 || !name || !urlMatch) continue;
      
      results.push({
        store: \`دیجی‌پی (\${storeDomain.replace('.com','').replace('.ir','')})\`,
        name: name,
        price: price, // Digipay returns Toman natively
        url: urlMatch,
        image: image,
        availability: true, // Digipay usually shows available items or sorts them
        condition: "new"
      });
    }
    return results;
  } catch (e) {
    return [];
  }
}
`;

if (!code.includes('searchDigipay')) {
  code = code.replace(/async function searchPricesFromStores/, digipayFunc + '\nasync function searchPricesFromStores');
  
  code = code.replace(
    /promises\.push\(\{ p: searchMasterKala\(query\), name: "MasterKala" \}\);/,
    'promises.push({ p: searchMasterKala(query), name: "MasterKala" });\n  promises.push({ p: searchDigipay(query), name: "Digipay" });'
  );
  
  fs.writeFileSync('background.js', code);
  console.log("Digipay added");
} else {
  console.log("Digipay already exists");
}
