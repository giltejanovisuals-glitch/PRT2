const { chromium } = require("playwright");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (msg) => { if (msg.text().includes("[DBG]")) console.log(msg.text()); });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  await page.goto("http://localhost:8123/pages/editorial-layout.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const catalogueCard = await page.locator('.pub-card[aria-label*="Catalogue"]');
  await catalogueCard.click();
  await wait(1000);
  await page.click("#pub-next");
  await wait(900);
  await page.click("#pub-next");
  await wait(900);
  await page.fill("#pub-page-input", "8");
  await page.press("#pub-page-input", "Enter");
  await wait(900);

  const mixedCard = await page.locator('.pub-card[aria-label*="Brandbook"]');
  await mixedCard.click();
  await wait(1000);
  console.log(">>> checking disabled right after 1000ms wait");
  console.log(">>> disabled:", await page.evaluate(() => document.getElementById("pub-next").disabled));

  console.log(">>> attempting click with 5s timeout");
  try {
    await page.click("#pub-next", { timeout: 5000 });
    console.log(">>> click succeeded");
  } catch (e) {
    console.log(">>> click FAILED:", e.message.split("\n")[0]);
  }
  console.log(">>> disabled after attempt:", await page.evaluate(() => document.getElementById("pub-next").disabled));
  await browser.close();
})();
