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

// router.post("/", , CateringController.createCatering);
// router.put("/:id", upload.single("cover_image"), CateringController.updateCatering);
// router.delete("/:id", CateringController.deleteCatering);
// router.patch("/:id/toggle-status", CateringController.toggleCateringStatus)

router.get("/restaurant", CateringController.listCaterings);
router.get("/one-from-each", CateringController.listOneCateringPerRestaurant);
router.get("/:id", CateringController.getCateringById);

module.exports = router;
