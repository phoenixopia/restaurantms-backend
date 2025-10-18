const express = require("express");
const CateringController = require("../../controllers/customer/catering_controller");
const { protect } = require("../../middleware/protect");
const { permissionCheck } = require("../../middleware/permissionCheck");
const router = express.Router();

router.get("/under-restaurant/:id", CateringController.listCaterings);

router.get("/one-from-each", CateringController.listOneCateringPerRestaurant);

router.get("/get-catering/:id", CateringController.getCateringById);

router.post("/request", protect("customer"), CateringController.createRequest);


router.put(
  "/update-my-request/:id",
  protect("customer"),
  CateringController.updateMyCateringRequest
);

router.get(
  "/get-all-my-request",
  protect("customer"),
  CateringController.getAllMyCateringRequest
);

router.get(
  "/get-catering-quote/:id",
  protect("customer"),
  CateringController.getCateringQuoteByRequestId
);

router.post(
  "/response-for-catering-quote/:id",
  protect("customer"),
  CateringController.updateCateringQuoteByCustomer
);

router.get(
  "/get-accepted-catering-quota",
  // permissionCheck("customer"),
    protect("customer"),
  CateringController.getAcceptedCateringQuote
);

module.exports = router;
