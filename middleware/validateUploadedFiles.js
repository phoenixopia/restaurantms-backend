exports.validateUploadedFiles = (type) => {
  return (req, res, next) => {
    if (!req.files && !req.file) {
      return next();
    }

    const errors = [];

    if (type === "restaurant") {
      const { logo, images } = req.files || {};

      if (logo) {
        if (logo.length > 1) {
          errors.push("Only one logo is allowed");
        } else {
          const logoFile = logo[0];
          if (!logoFile.mimetype.startsWith("image/")) {
            errors.push("Logo must be an image file");
          }
          if (logoFile.size > 5 * 1024 * 1024) {
            errors.push("Logo must be less than 5MB");
          }
        }
      }

      if (images) {
        if (images.length > 1) {
          errors.push("Only one image is allowed");
        } else {
          const img = images[0];
          if (!img.mimetype.startsWith("image/")) {
            errors.push("Image must be an image file");
          }
          if (img.size > 5 * 1024 * 1024) {
            errors.push("Image must be less than 5MB");
          }
        }
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

    if (type === "receipt") {
      const image = req.file;
      if (!image) return next();

      if (!image.mimetype.startsWith("image/")) {
        errors.push("Receipt image must be an image file");
      }

      if (image.size > 5 * 1024 * 1024) {
        errors.push("Receipt image must be less than 5MB");
      }
    }

    if (type === "profile") {
      const image = req.file;
      if (!image) return next();

      if (!image.mimetype.startsWith("image/")) {
        errors.push("Profile picture must be an image file");
      }

      if (image.size > 5 * 1024 * 1024) {
        errors.push("Profile picture must be less than 5MB");
      }
    }

    if (type === "image-gallery") {
      const images = req.files || [];

      if (!Array.isArray(images) || images.length === 0) {
        errors.push(
          "At least one image must be uploaded for the image gallery"
        );
      }

      if (images.length > 5) {
        errors.push(
          "You can upload up to 5 images for the image gallery at a time"
        );
      }

      images.forEach((img, index) => {
        if (!img.mimetype.startsWith("image/")) {
          errors.push(`Gallery image ${index + 1} must be an image file`);
        }
        if (img.size > 5 * 1024 * 1024) {
          errors.push(`Gallery image ${index + 1} must be less than 5MB`);
        }
      });
    }

    if (type === "catering-card") {
      const image = req.file;
      if (!image) return next();

      if (!image.mimetype.startsWith("image/")) {
        errors.push("Catering card image must be an image file");
      }

      if (image.size > 5 * 1024 * 1024) {
        errors.push("Catering card image must be less than 5MB");
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
