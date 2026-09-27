const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

// Replace No Results state
js = js.replace('<div class="empty-title">همه‌جا رو گشتیم، نبود! 📦</div>', '<div class="empty-title">همه‌جا رو گشتیم، نبود!</div>');
js = js.replace('<div class="empty-subtitle">متأسفانه این کالا تو هیچ‌کدوم از فروشگاه‌ها پیدا نشد. یه محصول دیگه رو امتحان کن تا دوباره برات بگردم!</div>', '<div class="empty-subtitle">این محصول فعلاً تو فروشگاه‌ها پیدا نشد. یه محصول دیگه رو امتحان کن.</div>');

// Replace Filtered Out state
js = js.replace('<div class="empty-title">نتیجه‌ای با این فیلترها نیست</div>', '<div class="empty-title">با این فیلترها چیزی پیدا نکردیم!</div>');
js = js.replace('<div class="empty-subtitle">فیلترها رو تغییر بده تا گزینه‌های بیشتری ببینی.</div>', '<div class="empty-subtitle">فیلترها رو تغییر بده یا بعضی‌هاشون رو بردار تا گزینه‌های بیشتری ببینی.</div>');

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated JS with final copy");
