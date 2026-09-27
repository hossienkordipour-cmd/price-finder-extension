const fs = require('fs');
let js = fs.readFileSync('background.js', 'utf8');

// Remove from promises array
js = js.replace(/,\s*\{\s*name:\s*"اسنپ‌شاپ"[^\}]+\}/g, '');
js = js.replace(/,\s*\{\s*name:\s*"خانومی"[^\}]+\}/g, '');
js = js.replace(/,\s*\{\s*name:\s*"تکنولایف"[^\}]+\}/g, '');
// If it was the last one and has no comma, let's just do a string replacement
js = js.replace('    { name: "اسنپ‌شاپ", p: searchSnappShop(searchName) },\n', '');
js = js.replace('    { name: "خانومی", p: searchKhanoumi(searchName) },\n', '');
js = js.replace('    { name: "تکنولایف", p: searchTechnolife(searchName) },\n', '');

// We will use regex to remove functions. 
// A safer way is to truncate everything from "// ==============================\n// اسنپ‌شاپ (Page Bridge + Fallback)" to the end of the file.
// Let's check what's at the end of background.js.
