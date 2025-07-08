const fs = require("fs").promises;
const path = require("path");

module.exports = async function cleanupUploadedFiles(files) {
  if (!files) return;

  try {
    const deletions = [];

    if (files.logo?.[0]?.path) {
      deletions.push(
        fs.unlink(files.logo[0].path).catch((err) => {
          if (err.code !== "ENOENT") console.error("Error deleting logo:", err);
        })
      );
    }

    // Handle images
    if (Array.isArray(files.images)) {
      files.images.forEach((img) => {
        if (img.path) {
          deletions.push(
            fs.unlink(img.path).catch((err) => {
              if (err.code !== "ENOENT")
                console.error("Error deleting image:", err);
            })
          );
        }
      });
    }

    await Promise.all(deletions);
    console.log("File cleanup completed successfully");
  } catch (err) {
    console.error("Cleanup failed:", err);
  }
};
