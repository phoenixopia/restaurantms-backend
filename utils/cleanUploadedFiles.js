const fs = require("fs").promises;

/**
 * Clean up uploaded files by deleting them from the server.
 * Supports both Multer's `req.files` (multiple fields) or `req.file` (single).
 *
 * @param {Object} files - Multer files object (req.files or req.file)
 */
module.exports = async function cleanupUploadedFiles(files) {
  if (!files) return;

  try {
    const deletions = [];

    // Handle array of files (e.g. images, receipts)
    if (Array.isArray(files)) {
      for (const file of files) {
        if (file?.path) {
          deletions.push(
            fs.unlink(file.path).catch((err) => {
              if (err.code !== "ENOENT") {
                console.error("Error deleting file:", err);
              }
            })
          );
        }
      }
    }

    // Handle object fields (e.g. { logo: [file], images: [file1, file2] })
    if (typeof files === "object" && !Array.isArray(files)) {
      for (const field of Object.values(files)) {
        for (const file of Array.isArray(field) ? field : [field]) {
          if (file?.path) {
            deletions.push(
              fs.unlink(file.path).catch((err) => {
                if (err.code !== "ENOENT") {
                  console.error("Error deleting file:", err);
                }
              })
            );
          }
        }
      }
    }

    await Promise.all(deletions);
    console.log("File cleanup completed successfully");
  } catch (err) {
    console.error("Cleanup failed:", err);
  }
};
