const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const http = require('http');

function getChromePath() {
  return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
}

async function debugModal() {
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    let filePath = path.join(__dirname, '..', 'public', reqPath);
    if (fs.existsSync(filePath)) {
      res.writeHead(200);
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise(r => server.listen(8998, '127.0.0.1', r));

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: 'new'
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://127.0.0.1:8998/index.html');
    await page.evaluate(() => openPaymentModal('monthly'));
    await new Promise(r => setTimeout(r, 400));

    const info = await page.evaluate(() => {
      const box = document.querySelector('#payment-modal > div');
      const cs = window.getComputedStyle(box);
      const children = Array.from(box.children).map((c, i) => ({
        index: i,
        tag: c.tagName,
        cls: c.className,
        rect: c.getBoundingClientRect(),
        offsetHeight: c.offsetHeight,
        scrollHeight: c.scrollHeight,
        marginTop: window.getComputedStyle(c).marginTop,
        marginBottom: window.getComputedStyle(c).marginBottom
      }));
      return {
        boxRect: box.getBoundingClientRect(),
        boxScrollHeight: box.scrollHeight,
        boxClientHeight: box.clientHeight,
        boxPaddingTop: cs.paddingTop,
        boxPaddingBottom: cs.paddingBottom,
        boxOverflow: cs.overflow,
        boxOverflowY: cs.overflowY,
        parentRect: box.parentElement.getBoundingClientRect(),
        parentScrollHeight: box.parentElement.scrollHeight,
        parentClientHeight: box.parentElement.clientHeight,
        children
      };
    });

    console.log(JSON.stringify(info, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
}

debugModal();
