const path = require("path");

const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
const SERVER_URL = process.env.SERVER_URL || "http://localhost:8000";

exports.getFileUrl = (filename) => {
  if (!filename) return null;
  const encoded = encodeURIComponent(filename);
  return `${SERVER_URL}/uploads/receipts/${encoded}`;
};

exports.getFilePath = (filename) =>
  path.join(UPLOADS_DIR, "receipts", filename);
