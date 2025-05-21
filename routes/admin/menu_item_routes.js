const express = require("express");
const router = express.Router();
const menuItemController = require("../../controllers/admin/menu_item.controller");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const checkPermission = require("../../middleware/checkPermission");

// in all this specified middlewares will be add this is just for now.... in all other routes also
// Create a menu item
router.post("/", menuItemController.createMenuItem);

// Get all menu items
router.get("/", menuItemController.getAllMenuItems);

// Get all menu items in a category
router.get(
  "/category/:menu_category_id",
  menuItemController.getMenuItemsByCategory
);

// Get a single menu item
router.get("/:id", menuItemController.getMenuItemById);

// Update a menu item
router.put("/:id", menuItemController.updateMenuItem);

// Delete a menu item
router.delete("/:id", menuItemController.deleteMenuItem);

module.exports = router;
