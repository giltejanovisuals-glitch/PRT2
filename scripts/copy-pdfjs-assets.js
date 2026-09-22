const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const VENDOR_DIR = path.join(ROOT, "assets", "vendor", "pdfjs");

const files = [
  {
    from: path.join(ROOT, "node_modules", "pdfjs-dist", "build", "pdf.min.mjs"),
    to: path.join(VENDOR_DIR, "pdf.mjs"),
  },
  {
    from: path.join(ROOT, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs"),
    to: path.join(VENDOR_DIR, "pdf.worker.mjs"),
  },
];

fs.mkdirSync(VENDOR_DIR, { recursive: true });

for (const file of files) {
  if (!fs.existsSync(file.from)) {
    console.error(`[pdfjs-assets] ERROR: missing ${path.relative(ROOT, file.from)}. Run npm ci first.`);
    process.exitCode = 1;
    break;
  }

  fs.copyFileSync(file.from, file.to);
  console.log(`[pdfjs-assets] Copied ${path.relative(ROOT, file.to)}`);
}
