const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const access = promisify(fs.access);

// --------------------------- Config ---------------------------
const PROJECT_ROOT = process.cwd(); // always project root
const UPLOADS_DIR = path.join(PROJECT_ROOT, "uploads");

const SERVER_URL = (process.env.SERVER_URL || "http://localhost:8000").replace(
  /\/+$/,
  ""
);

// --------------------------- Core Functions ---------------------------
function getFileUrl(folder, filename) {
  if (!filename) return null;
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  const encodedFile = encodeURIComponent(filename);
  return `${SERVER_URL}/uploads/${cleanFolder}/${encodedFile}`;
}

function getFilePath(folder, filename) {
  if (!filename) return null;
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  return path.join(UPLOADS_DIR, cleanFolder, filename);
}

async function fileExists(folder, filename) {
  const fullPath = getFilePath(folder, filename);
  try {
    await access(fullPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function getFFprobePath(folder, filename) {
  const absolutePath = getFilePath(folder, filename);
  return absolutePath.replace(/\\/g, "/"); // ffprobe prefers forward slashes
}

/**
 * Ensure folder exists (creates it recursively)
 */
async function ensureFolder(folder) {
  const fullPath = path.join(UPLOADS_DIR, folder.replace(/^\/+|\/+$/g, ""));
  await fs.promises.mkdir(fullPath, { recursive: true });
  return fullPath;
}

module.exports = {
  UPLOADS_DIR,
  SERVER_URL,
  getFileUrl,
  getFilePath,
  fileExists,
  getFFprobePath,
  ensureFolder,
};
