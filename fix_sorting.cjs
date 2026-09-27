const fs = require('fs');

let code = fs.readFileSync('background.js', 'utf8');

const oldSort = 'unique.sort((a, b) => Number(b.availability) - Number(a.availability) || Number(a.condition === "used") - Number(b.condition === "used") || b.matchScore - a.matchScore || a.price - b.price);';
const newSort = 'unique.sort((a, b) => Number(b.availability) - Number(a.availability) || Number(a.condition === "used") - Number(b.condition === "used") || a.price - b.price || b.matchScore - a.matchScore);';

code = code.replace(oldSort, newSort);

fs.writeFileSync('background.js', code);
console.log("Sorting fixed");
