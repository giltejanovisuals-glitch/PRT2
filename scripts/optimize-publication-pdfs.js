const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("@napi-rs/canvas");

const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "assets", "documents", "editorial-layout");
const SOURCE_DIR = path.join(ROOT, "source-publications", "editorial-layout", "originals");

const PUBLICATIONS = [
  {
    input: "PORTA BRAND BOOK.pdf",
    output: "porta-brand-book-web.pdf",
    title: "Porta Brand Book",
  },
  {
    input: "PORTA MOBILI BRAND DECK.pdf",
    output: "porta-mobili-brand-deck-web.pdf",
    title: "Porta Mobili Brand Deck",
  },
];

const WEB_PDF_OPTIONS = {
  producer: "PRT2 publication optimizer",
  rasterDPI: 144,
  encodingQuality: 35,
  compressionLevel: 9,
};

function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function optimizePublication(pdfjsLib, publication) {
  const inputPath = fs.existsSync(path.join(SOURCE_DIR, publication.input))
    ? path.join(SOURCE_DIR, publication.input)
    : path.join(OUTPUT_DIR, publication.input);
  const outputPath = path.join(OUTPUT_DIR, publication.output);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`${publication.input} was not found in ${path.relative(ROOT, SOURCE_DIR)} or ${path.relative(ROOT, OUTPUT_DIR)}`);
  }

  const originalSize = fs.statSync(inputPath).size;
  const data = new Uint8Array(fs.readFileSync(inputPath));
  const source = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const output = new PDFDocument({
    ...WEB_PDF_OPTIONS,
    title: publication.title,
  });

  for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
    // eslint-disable-next-line no-await-in-loop
    const page = await source.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const ctx = output.beginPage(viewport.width, viewport.height);
    const canvas = {
      width: viewport.width,
      height: viewport.height,
      getContext: () => ctx,
    };
    ctx.canvas = canvas;

    // eslint-disable-next-line no-await-in-loop
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    output.endPage();

    if (pageNumber % 10 === 0 || pageNumber === source.numPages) {
      console.log(`[publication-optimize] ${publication.output}: rendered ${pageNumber}/${source.numPages} pages`);
    }
  }

  fs.writeFileSync(outputPath, output.close());
  if (typeof source.cleanup === "function") await source.cleanup();

  const optimizedSize = fs.statSync(outputPath).size;
  const savings = 100 - (optimizedSize / originalSize) * 100;
  console.log(
    `[publication-optimize] ${publication.output}: ${formatMb(originalSize)} -> ${formatMb(optimizedSize)} (${savings.toFixed(1)}% smaller)`
  );
}

async function main() {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  for (const publication of PUBLICATIONS) {
    // eslint-disable-next-line no-await-in-loop
    await optimizePublication(pdfjsLib, publication);
  }
}

main().catch((error) => {
  console.error("[publication-optimize] ERROR:", error);
  process.exitCode = 1;
});
