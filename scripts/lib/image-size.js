/*
 * Shared, dependency-free image header parsers — reads just enough of a
 * PNG/JPEG/WEBP/AVIF file's own bytes to recover its pixel width/height.
 * Used by both scripts/generate-gallery-manifest.js (photo galleries) and
 * scripts/generate-reel-manifest.js (video poster frames) so the two build
 * scripts share one implementation instead of two copies.
 */
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function readPngSize(buffer) {
  if (buffer.length < 24) return null;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (!isPng) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  const NO_LENGTH = new Set([0xd8, 0xd9, 0x01]);
  for (let marker = 0xd0; marker <= 0xd7; marker += 1) NO_LENGTH.add(marker);
  const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

  let pos = 2;
  while (pos + 1 < buffer.length) {
    if (buffer[pos] !== 0xff) {
      pos += 1;
      continue;
    }
    let markerPos = pos + 1;
    while (markerPos < buffer.length && buffer[markerPos] === 0xff) markerPos += 1;
    if (markerPos >= buffer.length) break;
    const marker = buffer[markerPos];
    pos = markerPos + 1;

    if (NO_LENGTH.has(marker)) continue;
    if (pos + 2 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(pos);

    if (SOF.has(marker)) {
      if (pos + 7 > buffer.length) break;
      const height = buffer.readUInt16BE(pos + 3);
      const width = buffer.readUInt16BE(pos + 5);
      return { width, height };
    }
    if (segmentLength < 2) break;
    pos += segmentLength;
  }
  return null;
}

function readWebpSize(buffer) {
  if (buffer.length < 30) return null;
  const isRiff = buffer.toString("ascii", 0, 4) === "RIFF";
  const isWebp = buffer.toString("ascii", 8, 12) === "WEBP";
  if (!isRiff || !isWebp) return null;
  const chunk = buffer.toString("ascii", 12, 16);

  if (chunk === "VP8X") {
    return { width: readUInt24LE(buffer, 24) + 1, height: readUInt24LE(buffer, 27) + 1 };
  }
  if (chunk === "VP8L") {
    if (buffer[20] !== 0x2f) return null;
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8 ") {
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null;
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  return null;
}

// Minimal ISOBMFF box walker — enough to find meta > iprp > ipco > ispe for
// AVIF's declared display dimensions. Takes the first ispe box it finds,
// which is sufficient for standard single-image AVIF exports; this is not
// a full HEIF item-property-association resolver.
function readBoxes(buffer, start, end) {
  const boxes = [];
  let pos = start;
  while (pos + 8 <= end) {
    let size = buffer.readUInt32BE(pos);
    const type = buffer.toString("ascii", pos + 4, pos + 8);
    let headerSize = 8;
    if (size === 1) {
      const high = buffer.readUInt32BE(pos + 8);
      const low = buffer.readUInt32BE(pos + 12);
      size = high * 2 ** 32 + low;
      headerSize = 16;
    } else if (size === 0) {
      size = end - pos;
    }
    if (size < headerSize || pos + size > end) break;
    boxes.push({ type, start: pos + headerSize, end: pos + size });
    pos += size;
  }
  return boxes;
}

function findBox(boxes, type) {
  return boxes.find((box) => box.type === type) || null;
}

function readAvifSize(buffer) {
  if (buffer.length < 16 || buffer.toString("ascii", 4, 8) !== "ftyp") return null;

  const topBoxes = readBoxes(buffer, 0, buffer.length);
  const meta = findBox(topBoxes, "meta");
  if (!meta) return null;

  // 'meta' is a FullBox: 4 bytes of version/flags precede its children.
  const iprp = findBox(readBoxes(buffer, meta.start + 4, meta.end), "iprp");
  if (!iprp) return null;

  const ipco = findBox(readBoxes(buffer, iprp.start, iprp.end), "ipco");
  if (!ipco) return null;

  const ispe = findBox(readBoxes(buffer, ipco.start, ipco.end), "ispe");
  if (!ispe) return null;

  // 'ispe' is also a FullBox: version/flags (4 bytes), then width, height.
  return {
    width: buffer.readUInt32BE(ispe.start + 4),
    height: buffer.readUInt32BE(ispe.start + 8),
  };
}

function readImageSize(buffer, ext) {
  if (ext === ".png") return readPngSize(buffer);
  if (ext === ".jpg" || ext === ".jpeg") return readJpegSize(buffer);
  if (ext === ".webp") return readWebpSize(buffer);
  if (ext === ".avif") return readAvifSize(buffer);
  return null;
}

module.exports = { SUPPORTED_EXTENSIONS, readImageSize };
