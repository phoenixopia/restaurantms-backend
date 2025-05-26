const validateFiles = (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(); // No files to validate
  }

  const { logo, images } = req.files;
  const errors = [];

  // Validate logo
  if (logo) {
    const logoFile = logo[0];
    if (!logoFile.mimetype.startsWith("image/")) {
      errors.push("Logo must be an image file");
    }
    if (logoFile.size > 3 * 1024 * 1024) {
      errors.push("Logo must be less than 3MB");
    }
  }

  // Validate images
  if (images) {
    images.forEach((img, index) => {
      if (!img.mimetype.startsWith("image/")) {
        errors.push(`Image ${index + 1} must be an image file`);
      }
      if (img.size > 5 * 1024 * 1024) {
        errors.push(`Image ${index + 1} must be less than 5MB`);
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors,
    });
  }

  next();
};

module.exports = validateFiles;
