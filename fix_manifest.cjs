const fs = require('fs');
let manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

// Add digipay and masterkala to host_permissions if they don't exist
const newHosts = [
  "https://*.mydigipay.com/*",
  "https://www.mydigipay.com/*",
  "https://*.masterkala.com/*",
  "https://masterkala.com/*"
];

for (const host of newHosts) {
  if (!manifest.host_permissions.includes(host)) {
    manifest.host_permissions.push(host);
  }
}

fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
console.log("Manifest updated with new host_permissions");
