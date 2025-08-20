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

router.get("/get-all", PlanController.listPlans);

// for landing page
router.get("/get-grouped-plan", PlanController.listGroupedPlans);

router.get("/search-plan", PlanController.getPlanByName);

router.get("/get-byId/:id", PlanController.getPlanById);

// Create a new plan
router.post(
  "/create-plan",
  protect("user"),
  authorize("super_admin"),
  createPlanValidator,
  validateRequest,
  PlanController.createPlan
);

// Update a plan and its limits
router.put(
  "/update-plan/:id",
  protect("user"),
  authorize("super_admin"),
  updatePlanValidator,
  validateRequest,
  PlanController.updatePlan
);

// Delete a plan and its limits
router.delete(
  "/delete-plan/:id",
  protect("user"),
  authorize("super_admin"),
  PlanController.deletePlan
);

// ---------- PLAN LIMIT ROUTES ----------

// List all plan limits (without assigned plans)
router.get(
  "/get-all-plan-limit",
  protect("user"),
  authorize("super_admin"),
  PlanController.listPlanLimits
);

// List all plan limits with assigned plans
router.get(
  "/plan-limit-with-plan",
  protect("user"),
  authorize("super_admin"),
  PlanController.listPlanLimitsWithPlans
);

// Create and assign a plan limit to multiple plans
router.post(
  "/create-and-assign/plan-limit",
  protect("user"),
  authorize("super_admin"),
  createAndAssignPlanLimitValidator,
  validateRequest,
  PlanController.createAndAssign
);

module.exports = router;
