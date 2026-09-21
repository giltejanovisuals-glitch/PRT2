const { chromium } = require("playwright");
const OUT = "C:\\Users\\Graphics-pc\\AppData\\Local\\Temp\\claude\\d--Z-GIL-00-INBOX-PRT2\\321855af-de8c-4200-83a2-b3140d83d251\\scratchpad\\";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push("[console] " + msg.text()); });
  const notFound = [];
  page.on("response", (r) => { if (r.status() >= 400) notFound.push(`${r.status()} ${r.url()}`); });

  await page.goto("http://localhost:8123/pages/editorial-layout.html", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("#pub-library-track .pub-card", { timeout: 15000 }).catch(() => console.log("no cards found in time"));

  await page.waitForTimeout(1500); // let first publication render

  const info = await page.evaluate(() => {
    const cards = document.querySelectorAll(".pub-card");
    const canvases = document.querySelectorAll("#pub-pages canvas");
    return {
      cardCount: cards.length,
      firstCardDisabled: cards[0]?.disabled,
      pageInputValue: document.getElementById("pub-page-input")?.value,
      pageTotal: document.getElementById("pub-page-total")?.textContent,
      canvasCount: canvases.length,
      infoTitle: document.getElementById("pub-info-title")?.textContent,
    };
  });
  console.log("INFO:", JSON.stringify(info, null, 2));
  await page.screenshot({ path: OUT + "pub-initial.png" });

  console.log("ERRORS:", JSON.stringify(errors.slice(0, 20), null, 2));
  console.log("BAD RESPONSES:", JSON.stringify(notFound.filter(u => !u.includes("TTModernist")), null, 2));

  await browser.close();
})();
