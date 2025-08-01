const express = require("express");
const ValidateUploadedFiles = require("../../middleware/validateUploadedFiles");
const GalleryImageService = require("../../controllers/admin/image_controller");
const Upload = require("../../middleware/uploads");
const RestaurantStatus = require("../../middleware/checkRestaurantStatus");
const validateRequest = require("../../middleware/validateRequest");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");

const router = express.Router();

router.post(
  "/upload-images",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantStatus.checkRestaurantStatus,
  ValidateUploadedFiles.validateUploadedFiles("image-gallery"),
  Upload.uploadGalleryImages,
  validateRequest,
  GalleryImageService.uploadImageGalleryFiles
);

router.put(
  "/update-image/:id",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantStatus.checkRestaurantStatus,
  ValidateUploadedFiles.validateUploadedFiles("image-gallery"),
  Upload.uploadGalleryImages,
  validateRequest,
  GalleryImageService.updateImageGalleryFile
);

router.get(
  "/get-one-image/:id",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantStatus.checkRestaurantStatus,
  GalleryImageService.getImageGalleryById
);

router.get(
  "/list-images/:id",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantStatus.checkRestaurantStatus,
  GalleryImageService.listImageGallery
);

module.exports = router;
