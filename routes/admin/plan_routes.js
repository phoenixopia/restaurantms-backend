const express = require("express");
const { listPlans, createPlan, updatePlan, deletePlan, getPlanByName, getPlanById,} = require("../../controllers/admin/plan_controller");
const { protect } = require('../../middleware/protect');
const { authorize } = require('../../middleware/authorize');

const router = express.Router();

router.get("/", protect, authorize('super-admin'), listPlans);
router.get("/:name", protect, authorize('super-admin'), getPlanByName);
router.get("/:id", protect, getPlanById);
// router.post("/", protect, authorize('super-admin'), createPlan);
router.put("/:id", protect, authorize('super-admin'), updatePlan);
router.delete("/:id", protect, authorize('super-admin'), deletePlan);

module.exports = router;
