const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage();
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('search') || url.includes('api')) {
      console.log('REQUEST:', url);
    }
  });

  console.log('Navigating to snapp shop...');
  await page.goto('https://snapp.ir/shop/search?q=گوشی', { waitUntil: 'networkidle2' });
  
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
})();
