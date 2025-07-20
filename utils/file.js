const path = require("path");

const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
const SERVER_URL = process.env.SERVER_URL || "http://localhost:8000";

/**
 * Get full URL to access an uploaded file
 * @param {string} folder - subfolder under uploads (e.g. "profile", "receipts")
 * @param {string} filename - file name stored
 * @returns {string|null}
 */
function getFileUrl(folder, filename) {
  if (!filename) return null;
  const encoded = encodeURIComponent(filename);
  return `${SERVER_URL}/uploads/${folder}/${encoded}`;
}

/**
 * Get absolute file system path for an uploaded file
 * @param {string} folder - subfolder under uploads (e.g. "profile", "receipts")
 * @param {string} filename - file name stored
 * @returns {string}
 */
function getFilePath(folder, filename) {
  return path.join(UPLOADS_DIR, folder, filename);
}

module.exports = {
  getFileUrl,
  getFilePath,
};
