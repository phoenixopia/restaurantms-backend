const express = require("express");
const PlanController = require("../../controllers/admin/plan_controller");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");

const router = express.Router();

// List plans
router.get("/", protect, PlanController.listPlans);

// Get plan by ID
router.get("/plan-id/:id", protect, PlanController.getPlanById);

// Get plan by name
router.get("/plan-name/:name", protect, PlanController.getPlanByName);

// create a new plan . . . . maybe for the feature
router.post(
  "/create",
  protect,
  authorize("super_admin"),
  PlanController.createPlan
);

// Update plan
router.put(
  "/update/:id",
  protect,
  authorize("super_admin"),
  PlanController.updatePlan
);

// Delete plan
router.delete(
  "/delete/:id",
  protect,
  authorize("super_admin"),
  PlanController.deletePlan
);

module.exports = router;
