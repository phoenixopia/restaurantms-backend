const express = require("express");
const PlanController = require("../../controllers/admin/plan_controller");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const {
  createPlanValidator,
  updatePlanValidator,
} = require("../../validators/plan_validator");
const validateRequest = require("../../middleware/validateRequest");

const router = express.Router();

router.get("/", protect, PlanController.listPlans);
router.get("/name/:name", protect, PlanController.getPlanByName);
router.get("/:id", protect, PlanController.getPlanById);

// create a new plan . . . . maybe for the feature
router.post(
  "/create",
  protect,
  authorize("super_admin"),
  createPlanValidator,
  validateRequest,
  PlanController.createPlan
);

router.put(
  "/update/:id",
  protect,
  authorize("super_admin"),
  updatePlanValidator,
  validateRequest,
  PlanController.updatePlan
);

router.delete(
  "/delete/:id",
  protect,
  authorize("super_admin"),
  PlanController.deletePlan
);

module.exports = router;
