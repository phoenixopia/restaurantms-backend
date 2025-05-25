const express = require("express");
// const { protect } = require("../../middleware/protect");
// const { authorize } = require("../../middleware/authorize");
// const checkPermission = require("../../middleware/checkPermission");
const PlanController = require("../../controllers/admin/plan_controller");

const router = express.Router();

router.get("/", PlanController.listPlans);
router.get("/id/:id", PlanController.getPlanById);
router.get("/name/:name", PlanController.getPlanByName);
router.put(
  "/update/:id",
  // protect,
  // authorize("super_admin"),
  PlanController.updatePlan
);
router.delete(
  "/delete/:id",
  // protect,
  // authorize("super_admin"),
  PlanController.deletePlan
);

module.exports = router;
