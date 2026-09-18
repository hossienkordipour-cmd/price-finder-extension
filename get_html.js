const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage();
  
  await page.goto('https://snapp.ir/shop/search?q=گوشی', { waitUntil: 'networkidle2' });
  
  const html = await page.content();
  console.log(html.substring(0, 1000));
  
  const requireNext = html.includes('__NEXT_DATA__');
  console.log("Has Next.js data:", requireNext);
  
  if (requireNext) {
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
      if (match) {
          console.log("NEXT_DATA length:", match[1].length);
          const data = JSON.parse(match[1]);
          // Find products in props
          console.log("Keys:", Object.keys(data.props));
      }
  }

  await browser.close();
})();
