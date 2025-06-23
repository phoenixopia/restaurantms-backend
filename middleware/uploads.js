const multer = require("multer");
const path = require("path");

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg"];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Invalid file type. Only JPEG/PNG allowed"), false);
};

const RESTAURANT_DIR = path.join(__dirname, "..", "..", "uploads");

const restaurantStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RESTAURANT_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  },
});

const uploadRestaurantFiles = multer({
  storage: restaurantStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6,
  },
}).fields([
  { name: "logo", maxCount: 1 },
  { name: "images", maxCount: 5 },
]);

const CATEGORY_DIR = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "menu-categories"
);

const categoryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CATEGORY_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  },
});

const uploadCategoryImage = multer({
  storage: categoryStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("image");

const MENUITEM_DIR = path.join(__dirname, "..", "..", "uploads", "menu-items");

const menuItemStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MENUITEM_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  },
});

const uploadMenuItemImage = multer({
  storage: menuItemStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("image");

module.exports = {
  uploadRestaurantFiles,
  uploadCategoryImage,
  uploadMenuItemImage,
};
