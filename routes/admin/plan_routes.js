const express = require("express");
const PlanController = require("../../controllers/admin/plan_controller");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const {
  createPlanValidator,
  updatePlanValidator,
  createAndAssignPlanLimitValidator,
} = require("../../validators/plan_validator");
const validateRequest = require("../../middleware/validateRequest");

const router = express.Router();

// ---------- PLAN ROUTES ----------

// List all plans (paginated)
router.get("/", PlanController.listPlans);

// Get plan by name and billing cycle
router.get("/by-name", PlanController.getPlanByName);

// Get a plan by ID
router.get("/:id", PlanController.getPlanById);

// Create a new plan
router.post(
  "/create",
  protect("user"),
  authorize("super_admin"),
  createPlanValidator,
  validateRequest,
  PlanController.createPlan
);

// Update a plan and its limits
router.put(
  "/update/:id",
  protect("user"),
  authorize("super_admin"),
  updatePlanValidator,
  validateRequest,
  PlanController.updatePlan
);

// Delete a plan and its limits
router.delete(
  "/delete/:id",
  protect("user"),
  authorize("super_admin"),
  PlanController.deletePlan
);

// ---------- PLAN LIMIT ROUTES ----------

// List all plan limits (without assigned plans)
router.get(
  "/plan-limit",
  protect("user"),
  authorize("super_admin"),
  PlanController.listPlanLimits
);

// List all plan limits with assigned plans
router.get(
  "/plan-limit/with-plans",
  protect("user"),
  authorize("super_admin"),
  PlanController.listPlanLimitsWithPlans
);

// Create and assign a plan limit to multiple plans
router.post(
  "/plan-limit/create-and-assign",
  protect("user"),
  authorize("super_admin"),
  createAndAssignPlanLimitValidator,
  validateRequest,
  PlanController.createAndAssign
);

module.exports = router;
