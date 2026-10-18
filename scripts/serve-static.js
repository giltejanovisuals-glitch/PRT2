const fs = require("fs");
const http = require("http");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 3000);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const server = http.createServer((req, res) => {
  const requestedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const decodedPath = decodeURIComponent(requestedUrl.pathname);
  const normalized = path.normalize(decodedPath).replace(/^([/\\])+/, "");
  let filePath = path.join(ROOT, normalized || "index.html");

  // private/ holds source documents (the original CV) that are never served.
  if (!filePath.startsWith(ROOT) || /^private([/\\]|$)/i.test(normalized)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  // A folder serves its index.html, as on Vercel (/cv/ → cv/index.html).
  try {
    if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
  } catch (e) {
    /* falls through to the 404 below */
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    // Same viewing rules for the CV preview as vercel.json sets in production.
    const cv = /^cv([/\\]|$)/i.test(normalized);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Content-Length": stats.size,
      "Cache-Control": "no-store",
      ...(cv && {
        "X-Robots-Tag": "noindex, noarchive, nosnippet, noimageindex",
        "X-Frame-Options": "DENY",
        "Content-Security-Policy": "frame-ancestors 'none'",
      }),
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[dev] Serving ${ROOT}`);
  console.log(`[dev] http://localhost:${PORT}/pages/editorial-layout.html`);
});
