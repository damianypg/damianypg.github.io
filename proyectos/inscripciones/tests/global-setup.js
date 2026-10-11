const path = require('node:path');
const J = require('../logic.js');
const { writeQrVideo } = require('./qr-video.js');

/* El código de la persona que "muestra su credencial" a la cámara simulada. */
module.exports = async () => {
  const seeded = J.seed(J.emptyState(), 0);
  const target = seeded.regs[14];
  writeQrVideo(path.join(__dirname, '.fixtures', 'qr.y4m'), target.code);
};
