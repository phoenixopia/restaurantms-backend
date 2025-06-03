const express = require("express");
const PlanController = require("../../controllers/admin/plan_controller");
const { permissionCheck } = require("../../middleware/permissionCheck");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");

const router = express.Router();

// List plans
router.get("/", protect, PlanController.listPlans);

// Get plan by ID
router.get("/id/:id", protect, PlanController.getPlanById);

// Get plan by name
router.get("/name/:name", protect, PlanController.getPlanByName);

// Update plan
router.put(
  "/update/:id",
  protect,
  authorize("super_admin"),
  permissionCheck("update_plan"),
  PlanController.updatePlan
);

// Delete plan
router.delete(
  "/delete/:id",
  protect,
  authorize("super_admin"),
  permissionCheck("delete_plan"),
  PlanController.deletePlan
);

module.exports = router;

/*
update_plan
delete_plan
 */
