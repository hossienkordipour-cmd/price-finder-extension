const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM(`<h1><span class="badge">ناموجود</span>شامپو روزانه مو شبنم مخصوص موهای معمولی، حجم 1000 گرم</h1>`);
const h1 = dom.window.document.querySelector("h1");
console.log("textContent:", h1.textContent);

let name = h1.textContent.trim();
// Sometimes textContent lumps it together "ناموجودشامپو"
name = name.replace(/^ناموجود\s*/, '');
console.log("Fixed 1:", name);

// What if we just use innerText? jsdom doesn't support innerText fully but in browser it has a space usually.

// What if we just clone h1, remove all child elements, and get textContent?
const clone = h1.cloneNode(true);
clone.querySelectorAll('*').forEach(n => n.remove());
console.log("Clone text:", clone.textContent.trim());

