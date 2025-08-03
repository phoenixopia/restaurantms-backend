const express = require("express");
const router = express.Router();
const ValidateUploadedFiles = require("../../middleware/validateUploadedFiles");
const CateringController = require("../../controllers/admin/catering_controller");
const Upload = require("../../middleware/uploads");
const RestaurantStatus = require("../../middleware/checkRestaurantStatus");
const validateRequest = require("../../middleware/validateRequest");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const { permissionCheck } = require("../../middleware/permissionCheck");

router.post(
  "/create-catering",
  protect("user"),
  authorize("restaurant_admin"),
  RestaurantStatus.checkRestaurantStatus,
  ValidateUploadedFiles.validateUploadedFiles("catering-card"),
  Upload.uploadCateringCard,
  validateRequest,
  CateringController.createCatering
);

router.put(
  "/response-catering/:id",
  protect("user"),
  permissionCheck("manage_catering"),
  CateringController.giveResponse
);

// router.put("/:id", upload.single("cover_image"), CateringController.updateCatering);
// router.delete("/:id", CateringController.deleteCatering);
// router.patch("/:id/toggle-status", CateringController.toggleCateringStatus)

module.exports = router;
