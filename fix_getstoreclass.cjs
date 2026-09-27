const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');
js = js.replace('if (storeName === "دیوار") return "divar";', 'if (storeName === "دیوار") return "divar";\n  if (storeName === "مسترکالا") return "masterkala";');
fs.writeFileSync('sidebar/sidebar.js', js);
console.log("getStoreClass updated");
