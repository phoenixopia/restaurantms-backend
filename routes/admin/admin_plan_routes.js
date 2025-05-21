const express = require("express");
const { listPlans, createPlan, updatePlan, deletePlan,} = require("../../controllers/admin/plan_controller");
const { isAuthenticated, authorize } = require("../../middleware/auth");

const router = express.Router();

router.get("/", isAuthenticated, authorize('super-admin'), listPlans);
router.post("/", isAuthenticated, authorize('super-admin'), createPlan);
router.put("/:id", isAuthenticated, authorize('super-admin'), updatePlan);
router.delete("/:id", isAuthenticated, authorize('super-admin'), deletePlan);

module.exports = router;
