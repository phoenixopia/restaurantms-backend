const multer = require("multer");
const path = require("path");

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  allowedTypes.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Invalid file type. Only JPEG/PNG allowed"), false);
};

const uploadRestaurantFiles = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6,
  },
}).fields([
  { name: "logo", maxCount: 1 },
  { name: "images", maxCount: 5 },
]);

module.exports = uploadRestaurantFiles;
