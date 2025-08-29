const path = require("path");

const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
const SERVER_URL = process.env.SERVER_URL || "http://localhost:8000";

function getFileUrl(folder, filename) {
  if (!filename) return null;

  const encoded = encodeURIComponent(filename);

  const baseUrl = SERVER_URL.replace(/\/+$/, "");

  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");

  return `${baseUrl}/uploads/${cleanFolder}/${encoded}`;
}

function getFilePath(folder, filename) {
  return path.join(UPLOADS_DIR, folder, filename);
}

module.exports = {
  getFileUrl,
  getFilePath,
};
