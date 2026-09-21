const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (msg) => { if (msg.text().includes("DEBUG")) console.log(msg.text()); });
  await page.goto("http://localhost:8123/pages/editorial-layout.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const mixedCard = await page.locator('.pub-card[aria-label*="Brandbook"]');
  await mixedCard.click();
  await page.waitForTimeout(1200);
  const disabled = await page.evaluate(() => document.getElementById("pub-next").disabled);
  console.log("next disabled:", disabled);
  await browser.close();
})();
