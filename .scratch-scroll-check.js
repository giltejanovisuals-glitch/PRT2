const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:8123/pages/editorial-layout.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => ({
    scrollY: window.scrollY,
    headerText: document.getElementById("category-title")?.textContent,
    headerRect: document.querySelector(".project-header")?.getBoundingClientRect(),
  }));
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
