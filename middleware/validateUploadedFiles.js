exports.validateUploadedFiles = (type) => {
  return (req, res, next) => {
    if (!req.files && !req.file) {
      return next();
    }

    const errors = [];

    if (type === "restaurant") {
      const { logo, images } = req.files || {};

      if (logo) {
        const logoFile = logo[0];
        if (!logoFile.mimetype.startsWith("image/")) {
          errors.push("Logo must be an image file");
        }
        if (logoFile.size > 3 * 1024 * 1024) {
          errors.push("Logo must be less than 3MB");
        }
      }

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
    }

    if (type === "menuItem") {
      const image = req.file;
      if (!image) return next();

      if (!image.mimetype.startsWith("image/")) {
        errors.push("Menu item image must be an image file");
      }

      if (image.size > 5 * 1024 * 1024) {
        errors.push("Menu item image must be less than 5MB");
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid uploaded file(s)",
        errors,
      });
    }

    next();
  };
};
