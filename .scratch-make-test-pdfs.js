const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

const OUT_DIR = path.join(__dirname, "assets", "documents", "editorial-layout");
fs.mkdirSync(OUT_DIR, { recursive: true });

function drawPageLabel(page, font, text, w, h, color) {
  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color });
  page.drawText(text, {
    x: w / 2 - (text.length * 14) / 2,
    y: h / 2,
    size: 28,
    font,
    color: rgb(1, 1, 1),
  });
  page.drawRectangle({ x: 20, y: 20, width: w - 40, height: h - 40, borderColor: rgb(1, 1, 1), borderWidth: 2 });
}

async function makePortraitCatalogue() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const colors = [rgb(0.06, 0.3, 0.3), rgb(0.15, 0.15, 0.15), rgb(0.2, 0.4, 0.38), rgb(0.25, 0.22, 0.2)];
  for (let i = 1; i <= 8; i++) {
    const page = doc.addPage([595, 842]); // A4 portrait
    drawPageLabel(page, font, `Catalogue — Page ${i}`, 595, 842, colors[i % colors.length]);
  }
  fs.writeFileSync(path.join(OUT_DIR, "test-portrait-catalogue.pdf"), await doc.save());
  console.log("wrote test-portrait-catalogue.pdf (8 portrait pages)");
}

async function makeLandscapeMagazine() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const colors = [rgb(0.3, 0.18, 0.1), rgb(0.1, 0.2, 0.3), rgb(0.22, 0.22, 0.05)];
  for (let i = 1; i <= 6; i++) {
    const page = doc.addPage([842, 595]); // A4 landscape
    drawPageLabel(page, font, `Spread ${i}`, 842, 595, colors[i % colors.length]);
  }
  fs.writeFileSync(path.join(OUT_DIR, "test-landscape-magazine.pdf"), await doc.save());
  console.log("wrote test-landscape-magazine.pdf (6 landscape pages)");
}

async function makeSquareLookbook() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const colors = [rgb(0.35, 0.1, 0.15), rgb(0.1, 0.1, 0.1), rgb(0.3, 0.28, 0.05)];
  for (let i = 1; i <= 5; i++) {
    const page = doc.addPage([700, 700]);
    drawPageLabel(page, font, `Look ${i}`, 700, 700, colors[i % colors.length]);
  }
  fs.writeFileSync(path.join(OUT_DIR, "test-square-lookbook.pdf"), await doc.save());
  console.log("wrote test-square-lookbook.pdf (5 square pages)");
}

async function makeMixedBrandBook() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  // cover (portrait), then: portrait, portrait, LANDSCAPE (full spread), portrait, portrait, LANDSCAPE, portrait (odd trailing page)
  const spec = [
    [595, 842, "Cover"],
    [595, 842, "Page 2"],
    [595, 842, "Page 3"],
    [842, 595, "Wide Spread A"],
    [595, 842, "Page 5"],
    [595, 842, "Page 6"],
    [842, 595, "Wide Spread B"],
    [595, 842, "Page 8"],
    [595, 842, "Page 9 (final, unpaired)"],
  ];
  const colors = [rgb(0.05, 0.25, 0.35), rgb(0.15, 0.15, 0.15), rgb(0.3, 0.15, 0.1), rgb(0.1, 0.3, 0.2)];
  spec.forEach(([w, h, label], i) => {
    const page = doc.addPage([w, h]);
    drawPageLabel(page, font, label, w, h, colors[i % colors.length]);
  });
  fs.writeFileSync(path.join(OUT_DIR, "test-mixed-brandbook.pdf"), await doc.save());
  console.log("wrote test-mixed-brandbook.pdf (9 mixed pages, incl. trailing odd page)");
}

(async () => {
  await makePortraitCatalogue();
  await makeLandscapeMagazine();
  await makeSquareLookbook();
  await makeMixedBrandBook();
})();
