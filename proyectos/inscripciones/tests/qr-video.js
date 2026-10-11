/* Genera un video y4m con un código QR para simular la cámara en las pruebas.
   Chromium lo usa con --use-file-for-fake-video-capture. */
const fs = require('node:fs');
const path = require('node:path');
const qrcode = require('../vendor/qrcode.js');

const W = 320;
const H = 240;

function writeQrVideo(file, text, frames = 3) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const margin = 4;
  const scale = Math.floor(Math.min(W, H) / (n + margin * 2));
  const side = (n + margin * 2) * scale;
  const x0 = Math.floor((W - side) / 2);
  const y0 = Math.floor((H - side) / 2);

  const y = Buffer.alloc(W * H, 235); // blanco
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          y[(y0 + (r + margin) * scale + dy) * W + x0 + (c + margin) * scale + dx] = 16; // negro
        }
      }
    }
  }
  const u = Buffer.alloc((W / 2) * (H / 2), 128);
  const v = Buffer.alloc((W / 2) * (H / 2), 128);

  const header = Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`);
  const frame = Buffer.concat([Buffer.from('FRAME\n'), y, u, v]);
  const parts = [header];
  for (let i = 0; i < frames; i++) parts.push(frame);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat(parts));
}

module.exports = { writeQrVideo };
