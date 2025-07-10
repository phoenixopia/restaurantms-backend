const fs = require("fs").promises;

module.exports = async function cleanupUploadedFiles(files) {
  if (!files) return;

  try {
    const deletions = [];

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
