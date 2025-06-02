const express = require("express");
const PlanController = require("../../controllers/admin/plan_controller");
const checkPermission = require("../../middlewares/check_permission");
const { protect } = require("../../middlewares/protect");

const router = express.Router();

// List plans
router.get(
  "/",
  protect,
  checkPermission("view_plans"),
  PlanController.listPlans
);

// Get plan by ID
router.get(
  "/id/:id",
  protect,
  checkPermission("view_plans"),
  PlanController.getPlanById
);

// Get plan by name
router.get(
  "/name/:name",
  protect,
  checkPermission("view_plans"),
  PlanController.getPlanByName
);

// Update plan
router.put(
  "/update/:id",
  protect,
  checkPermission("update_plan"),
  PlanController.updatePlan
);

// Delete plan
router.delete(
  "/delete/:id",
  protect,
  checkPermission("delete_plan"),
  PlanController.deletePlan
);

module.exports = router;
