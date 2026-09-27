const fs = require('fs');

let code = fs.readFileSync('background.js', 'utf8');

const masterKalaFunc = `
async function searchMasterKala(query) {
  try {
    const url = "https://masterkala.com/api/2.1.1.0.0/?route=product/searchproduct";
    const reqData = { "v": "1.2", "query": query, "from": 0, "limit": 12, "filter": "" };
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqData)
    }, 10000);
    
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !data.products) return [];

    let results = [];
    for (const item of data.products) {
      const priceStr = item.pricewithdiscount || item.price || "0";
      const price = parseInt(priceStr);
      if (price <= 0) continue;
      
      const isAvailable = item.stock_status === "موجود" || parseInt(item.quantity) > 0;
      
      results.push({
        store: "مسترکالا",
        name: item.name,
        price: price, // MasterKala uses Toman
        url: \`https://masterkala.com/product/\${item.product_id}/\${item.slug || ''}\`,
        image: item.image,
        availability: isAvailable,
        condition: "new"
      });
    }
    return results;
  } catch (e) {
    return [];
  }
}
`;

if (!code.includes('searchMasterKala')) {
  // Insert before searchPricesFromStores
  code = code.replace(/async function searchPricesFromStores/, masterKalaFunc + '\nasync function searchPricesFromStores');
  
  // Add to promises array in searchPricesFromStores
  code = code.replace(
    /promises\.push\(\{ p: searchEmalls\(query\), name: "Emalls" \}\);/,
    'promises.push({ p: searchEmalls(query), name: "Emalls" });\n  promises.push({ p: searchMasterKala(query), name: "MasterKala" });'
  );
  
  fs.writeFileSync('background.js', code);
  console.log("MasterKala added");
} else {
  console.log("MasterKala already exists");
}
