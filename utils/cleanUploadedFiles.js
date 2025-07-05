// utils/cleanupUploadedFiles.js
const fs = require("fs");
const path = require("path");

module.exports = function cleanupUploadedFiles(files, uploadDir) {
  if (!files) return;

  if (files.logo?.[0]) {
    const logoPath = path.join(uploadDir, files.logo[0].filename);
    fs.existsSync(logoPath) && fs.unlinkSync(logoPath);
  }

  if (Array.isArray(files.images)) {
    files.images.forEach((img) => {
      const imgPath = path.join(uploadDir, img.filename);
      fs.existsSync(imgPath) && fs.unlinkSync(imgPath);
    });
  }
};
