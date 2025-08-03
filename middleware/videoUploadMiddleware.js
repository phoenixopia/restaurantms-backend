const multer = require("multer");
const path = require("path");
const fs = require("fs");

const VIDEO_DIR = path.resolve(__dirname, "../uploads/videos");

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VIDEO_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  },
});

const videoFileFilter = (req, file, cb) => {
  const videoTypes = ["video/mp4", "video/webm"];
  const imageTypes = ["image/jpeg", "image/png", "image/jpg"];

  if (videoTypes.includes(file.mimetype)) return cb(null, true);
  if (imageTypes.includes(file.mimetype)) return cb(null, true);

  return cb(
    new Error(
      "Invalid file type. Only MP4/WebM videos and JPEG/PNG thumbnails are allowed"
    ),
    false
  );
};

const uploadVideoFile = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
}).fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

const validateVideoThumbnailSizes = (req, res, next) => {
  const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

  try {
    const { video, thumbnail } = req.files || {};

    if (video && video[0].size > MAX_VIDEO_SIZE) {
      fs.unlinkSync(video[0].path);
      if (thumbnail) fs.unlinkSync(thumbnail[0].path);
      return res.status(400).json({
        success: false,
        message: "Video file size exceeds 200MB limit.",
      });
    }

    if (thumbnail && thumbnail[0].size > MAX_IMAGE_SIZE) {
      fs.unlinkSync(thumbnail[0].path);
      if (video) fs.unlinkSync(video[0].path);
      return res.status(400).json({
        success: false,
        message: "Thumbnail image size exceeds 5MB limit.",
      });
    }

    next();
  } catch (err) {
    console.error("Error validating uploaded video/thumbnail size:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during file validation.",
    });
  }
};

module.exports = {
  uploadVideoFile,
  validateVideoThumbnailSizes,
};
