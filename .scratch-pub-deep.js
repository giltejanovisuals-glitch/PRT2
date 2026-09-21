const { chromium } = require("playwright");
const OUT = "C:\\Users\\Graphics-pc\\AppData\\Local\\Temp\\claude\\d--Z-GIL-00-INBOX-PRT2\\321855af-de8c-4200-83a2-b3140d83d251\\scratchpad\\";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => { if (msg.text().includes("[DBG]")) console.log(msg.text()); });
  await page.goto("http://localhost:8123/pages/editorial-layout.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const getState = () => page.evaluate(() => {
    const canvases = [...document.querySelectorAll("#pub-pages canvas")];
    return {
      pageInput: document.getElementById("pub-page-input").value,
      pageTotal: document.getElementById("pub-page-total").textContent,
      canvasCount: canvases.length,
      canvasSizes: canvases.map((c) => `${c.width}x${c.height}`),
      infoTitle: document.getElementById("pub-info-title").textContent,
    };
  });

  // --- Switch to the portrait catalogue (should pair spreads book-style) ---
  const catalogueCard = await page.locator('.pub-card[aria-label*="Catalogue"]');
  await catalogueCard.click();
  await wait(1000);
  console.log("Opened portrait catalogue:", JSON.stringify(await getState()));

  // cover alone -> go next should show spread (2,3)
  await page.click("#pub-next");
  await wait(900);
  console.log("After 1 next (expect spread 2-3):", JSON.stringify(await getState()));
  await page.screenshot({ path: OUT + "pub-portrait-spread.png" });

  await page.click("#pub-next");
  await wait(900);
  console.log("After 2nd next (expect spread 4-5):", JSON.stringify(await getState()));

  // jump to last page (8) via page input -- 8 pages total, should be unpaired trailing single (since 2-3,4-5,6-7 pairs, 8 alone)
  await page.fill("#pub-page-input", "8");
  await page.press("#pub-page-input", "Enter");
  await wait(900);
  console.log("Jumped to page 8 (expect single, unpaired trailing page):", JSON.stringify(await getState()));
  await page.screenshot({ path: OUT + "pub-trailing-single.png" });

  // --- Switch to mixed brandbook: cover, 2-3 spread, then landscape single-wide at page4, then 5-6, landscape at 7, then 8, trailing 9 ---
  const mixedCard = await page.locator('.pub-card[aria-label*="Brandbook"]');
  await mixedCard.click();
  await wait(1000);
  console.log("Opened mixed brandbook:", JSON.stringify(await getState()));

  const seq = [];
  for (let i = 0; i < 7; i++) {
    seq.push(await getState());
    await page.click("#pub-next");
    await wait(700);
  }
  seq.push(await getState());
  console.log("Mixed brandbook navigation sequence:");
  seq.forEach((s, i) => console.log(`  step ${i}:`, JSON.stringify(s)));
  await page.screenshot({ path: OUT + "pub-mixed-final.png" });

  // --- Square lookbook ---
  const squareCard = await page.locator('.pub-card[aria-label*="Lookbook"]');
  await squareCard.click();
  await wait(1000);
  console.log("Opened square lookbook:", JSON.stringify(await getState()));
  await page.click("#pub-next");
  await wait(900);
  console.log("Square lookbook after next:", JSON.stringify(await getState()));
  await page.screenshot({ path: OUT + "pub-square.png" });

  // --- Single view mode ---
  await page.click('[data-mode="single"]');
  await wait(700);
  console.log("Switched to single mode:", JSON.stringify(await getState()));

  console.log("PAGE ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
