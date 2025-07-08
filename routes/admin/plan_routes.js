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

router.get("/", protect("user"), PlanController.listPlans);

router.get("/:id", protect("user"), PlanController.getPlanById);

router.post(
  "/create",
  protect("user"),
  authorize("super_admin"),
  createPlanValidator,
  validateRequest,
  PlanController.createPlan
);

// update
router.put(
  "/update/:id",
  protect("user"),
  authorize("super_admin"),
  updatePlanValidator,
  validateRequest,
  PlanController.updatePlan
);

//
router.delete(
  "/delete/:id",
  protect("user"),
  authorize("super_admin"),
  PlanController.deletePlan
);

module.exports = router;
