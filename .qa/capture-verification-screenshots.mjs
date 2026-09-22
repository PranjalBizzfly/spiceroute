import { chromium } from "playwright";

async function snap() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 }
  });
  const page = await context.newPage();

  async function scrollAndCapture(url, filePath) {
    await page.goto(url, { waitUntil: "networkidle" });
    // Scroll down gradually so all lazy-loaded images load
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 400;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Captured ${filePath}`);
  }

  // 1. Welcome Aboard
  await scrollAndCapture("http://localhost:3002/stories/welcome-aboard", ".qa/welcome-aboard-verified.png");

  // 2. Predictions
  await scrollAndCapture("http://localhost:3002/stories/predictions", ".qa/predictions-verified.png");

  // 3. Wildlife & Nature
  await scrollAndCapture("http://localhost:3002/stories/wildlife-nature", ".qa/wildlife-nature-verified.png");

  await browser.close();
}

snap().catch(console.error);
