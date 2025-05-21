const express = require("express");
const router = express.Router();
const menuController = require("../../controllers/admin/menu_controller");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const checkPermission = require("../../middleware/checkPermission");

router.post("/", protect, menuController.createMenu);
router.get("/", protect, menuController.getMenusByRestaurant);
router.get("/:id", protect, menuController.getMenuById);
router.put("/:id", protect, menuController.updateMenu);
router.delete("/:id", protect, menuController.deleteMenu);

module.exports = router;
