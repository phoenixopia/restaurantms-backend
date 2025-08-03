const path = require("path");

const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
const SERVER_URL = process.env.SERVER_URL || "http://localhost:8000";


function getFileUrl(folder, filename) {
  if (!filename) return null;
  const encoded = encodeURIComponent(filename);
  return `${SERVER_URL}/uploads/${folder}/${encoded}`;
}


function getFilePath(folder, filename) {
  return path.join(UPLOADS_DIR, folder, filename);
}

module.exports = {
  getFileUrl,
  getFilePath,
};
