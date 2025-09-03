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
const checkStorageQuota = require("../../middleware/checkStorageCapacity");

router.post(
  "/create-catering",
  protect("user"),
  // permissionCheck("create_catering"),
  RestaurantStatus.checkRestaurantStatus,
  CateringController.createCatering
);

router.put(
  "/update-basic-info/:id",
  protect("user"),
  // permissionCheck("update_catering"),
  RestaurantStatus.checkRestaurantStatus,
  CateringController.updateBasicInfo
);

router.put(
  "/upload-image/:id",
  protect("user"),
  // permissionCheck("update_catering"),
  RestaurantStatus.checkRestaurantStatus,
  Upload.uploadCateringCard,
  ValidateUploadedFiles.validateUploadedFiles("catering-card"),
  validateRequest,
  checkStorageQuota,
  CateringController.uploadImage
);

router.get(
  "/get-all-catering",
  protect("user"),
  // permissionCheck("view_catering"),
  RestaurantStatus.checkRestaurantStatus,
  CateringController.getAllCateringSerivces
);

router.get(
  "/get-catering-byId/:id",
  protect("user"),
  // permissionCheck("view_catering"),
  RestaurantStatus.checkRestaurantStatus,
  CateringController.getCateringServiceById
);

router.patch(
  "toggle-status/:id",
  protect("user"),
  // permissionCheck("update_catering"),
  CateringController.toggleCateringStatus
);

router.delete(
  "/delete-catering/:id",
  protect("user"),
  // permissionCheck("delete_catering"),
  CateringController.deleteCatering
);

// ================ Catering Request ==================

router.get(
  "/get-catering-request",
  protect("user"),
  // permissionCheck("view_catering_request"),
  CateringController.viewCateringRequests
);

router.get(
  "/get-catering-request-byId/:id",
  protect("user"),
  // permissionCheck("view_catering_request"),
  CateringController.viewCateringRequestById
);

router.patch(
  "/reject-request/:id",
  protect("user"),
  // permissionCheck("manage_catering"),
  CateringController.giveResponseCateringRequest
);

router.put(
  "/accept-with-quote/:id",
  protect("user"),
  // permissionCheck("manage_catering"),
  CateringController.acceptCateringRequestWithQuote
);

// ================== Catering Quote ====================

router.post(
  "/prepare-quote/:id",
  protect("user"),
  // permissionCheck("prepare_catering_quote"),
  CateringController.prepareCateringQuote
);

router.post(
  "/update-quote/:id",
  protect("user"),
  // permissionCheck("update_catering_quote"),
  CateringController.updateCateringQuote
);

router.get(
  "/list-catering-quotes",
  protect("user"),
  // permissionCheck("view_catering_quote"),
  RestaurantStatus.checkRestaurantStatus,
  CateringController.listCateringQuotes
);

module.exports = router;
