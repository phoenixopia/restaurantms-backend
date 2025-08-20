async function saveOrUpdateUploadedFiles(UploadedFile, inputData) {
  if (!inputData) return null;

  const files = Array.isArray(inputData) ? inputData : [inputData];

  const results = [];

  for (const file of files) {
    const fileData = {
      restaurant_id: file.restaurant_id,
      uploaded_by: file.uploaded_by || null,
      path: file.path.replace(/\\/g, "/"),
      size_mb: parseFloat(file.size_mb.toFixed(2)),
      type: file.type,
      reference_id: file.reference_id || null,
    };

    console.log("Processing file:", fileData);

    const existing = await UploadedFile.findOne({
      where: {
        restaurant_id: fileData.restaurant_id,
        type: fileData.type,
        reference_id: fileData.reference_id,
      },
    });

    if (existing) {
      console.log(`Found existing record with ID ${existing.id}, updating...`);
      await existing.update(fileData);
      results.push(existing);
      console.log("Updated successfully.");
    } else {
      console.log("No existing record found, creating new...");
      const created = await UploadedFile.create(fileData);
      results.push(created);
      console.log(`Created new record with ID ${created.id}.`);
    }
  }

  return Array.isArray(inputData) ? results : results[0];
}

module.exports = saveOrUpdateUploadedFiles;
