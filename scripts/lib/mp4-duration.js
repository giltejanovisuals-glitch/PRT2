/*
 * Duration of an MP4/MOV in seconds, read from its mvhd box (no
 * dependencies, no decoding). Returns 0 when it can't be found.
 */
const fs = require("fs");

function mp4Duration(file) {
  const fd = fs.openSync(file, "r");
  const read = (pos, len) => {
    const buffer = Buffer.alloc(len);
    fs.readSync(fd, buffer, 0, len, pos);
    return buffer;
  };
  const walk = (start, end) => {
    for (let pos = start; pos + 8 <= end; ) {
      const head = read(pos, 16);
      let length = head.readUInt32BE(0);
      const type = head.toString("latin1", 4, 8);
      let header = 8;
      if (length === 1) { length = Number(head.readBigUInt64BE(8)); header = 16; }
      if (length === 0) length = end - pos;
      if (length < header) return 0;
      if (type === "moov") return walk(pos + header, pos + length);
      if (type === "mvhd") {
        const box = read(pos + header, 32);
        return box[0] === 1 ? Number(box.readBigUInt64BE(24)) / box.readUInt32BE(20) : box.readUInt32BE(16) / box.readUInt32BE(12);
      }
      pos += length;
    }
    return 0;
  };
  try {
    return walk(0, fs.fstatSync(fd).size);
  } catch (error) {
    return 0;
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = { mp4Duration };
