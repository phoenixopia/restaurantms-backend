const express = require("express");
const CateringController = require("../../controllers/admin/catering_controller");
const router = express.Router();

router.get("/under-restaurant/id", CateringController.listCaterings);
router.get("/one-from-each", CateringController.listOneCateringPerRestaurant);
router.get("/get-catering/:id", CateringController.getCateringById);

module.exports = router;
