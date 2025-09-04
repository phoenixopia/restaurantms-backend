const multer = require("multer");
const path = require("path");
const cleanupUploadedFiles = require("../utils/cleanUploadedFiles");
const { error } = require("../utils/apiResponse");

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

  if (
    videoTypes.includes(file.mimetype) ||
    imageTypes.includes(file.mimetype)
  ) {
    return cb(null, true);
  }

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

const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const validateVideoThumbnailSizes = async (req, res, next) => {
  try {
    const { video, thumbnail } = req.files || {};

    if (!video?.[0] || !thumbnail?.[0]) {
      await cleanupUploadedFiles(req.files);
      return error(res, "Both video and thumbnail are required", null, 400);
    }

    if (video[0].size > MAX_VIDEO_SIZE) {
      await cleanupUploadedFiles(req.files);
      return error(res, "Video file size exceeds 200MB limit", null, 400);
    }

    if (thumbnail[0].size > MAX_IMAGE_SIZE) {
      await cleanupUploadedFiles(req.files);
      return error(res, "Thumbnail image size exceeds 5MB limit", null, 400);
    }

    next();
  } catch (err) {
    console.error("Video/thumbnail validation error:", err);
    await cleanupUploadedFiles(req.files);
    return error(
      res,
      "Internal server error during file validation",
      null,
      500
    );
  }
};

module.exports = {
  uploadVideoFile,
  validateVideoThumbnailSizes,
};
