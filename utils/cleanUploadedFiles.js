const fs = require("fs").promises;

async function cleanupUploadedFiles(files) {
  if (!files) return;

  const flattenFiles = (input) => {
    if (!input) return [];
    if (Array.isArray(input)) return input.flatMap(flattenFiles);
    if (typeof input === "object" && input.path) return [input]; // single file
    if (typeof input === "object")
      return Object.values(input).flatMap(flattenFiles);
    return [];
  };

  const allFiles = flattenFiles(files);

  const deletions = allFiles.map((file) =>
    fs.unlink(file.path).catch((err) => {
      if (err.code !== "ENOENT") {
        console.error("Error deleting file:", err);
      }
    })
  );

  await Promise.all(deletions);
  console.log(`Cleanup completed: ${allFiles.length} file(s) processed`);
}

module.exports = cleanupUploadedFiles;
