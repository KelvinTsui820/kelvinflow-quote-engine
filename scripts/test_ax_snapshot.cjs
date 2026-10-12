const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  try {
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <input id="t1" type="number" role="textbox" value="7.2" />
        </body>
      </html>
    `);
    const snapshot = await page.accessibility.snapshot();
    console.log('AX Snapshot:', JSON.stringify(snapshot, null, 2));
    
    const dom = await page.evaluate(() => {
      const el = document.getElementById('t1');
      return { type: el.type, matches: el.matches('input[type="number"]'), value: el.value };
    });
    console.log('DOM:', dom);

    await browser.close();
  } catch (err) {
    console.error(err);
  }
})();
