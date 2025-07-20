const multer = require("multer");
const path = require("path");

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg"];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Invalid file type. Only JPEG/PNG allowed"), false);
};

const RESTAURANT_DIR = path.resolve(__dirname, "../../uploads");

const restaurantStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RESTAURANT_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
    console.log();
  },
});

exports.uploadRestaurantFiles = multer({
  storage: restaurantStorage,
  fileFilter,
  limits: {
    fileSize: 1 * 1024 * 1024,
    files: 2,
  },
}).fields([
  { name: "logo", maxCount: 1 },
  { name: "images", maxCount: 1 },
]);

const MENUITEM_DIR = path.join(__dirname, "..", "..", "uploads", "menu-items");

const menuItemStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MENUITEM_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  },
});

exports.uploadMenuItemImage = multer({
  storage: menuItemStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("image");

const RECEIPT_DIR = path.resolve(__dirname, "../../uploads/receipts");

const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RECEIPT_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  },
});

exports.uploadReceiptFile = multer({
  storage: receiptStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Invalid file type. Only JPEG/PNG allowed"), false);
  },
  limits: { fileSize: 2 * 1024 * 1024 },
}).single("receipt");

//==========
const PROFILE_DIR = path.resolve(__dirname, "../../uploads/profile");

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PROFILE_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  },
});

exports.uploadProfilePicture = multer({
  storage: profileStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Invalid file type. Only JPEG/PNG allowed"), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("profile");
