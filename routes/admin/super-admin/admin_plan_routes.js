const express = require("express");
const {
  verifyToken,
  isSuperAdmin,
} = require("../../../middleware/authMiddleware");
const {
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
} = require("../../../controllers/admin/super-admin/plan_controller");

const router = express.Router();

router.get("/", verifyToken, isSuperAdmin, listPlans);
router.post("/create", verifyToken, isSuperAdmin, createPlan);
router.put("/update/:id", verifyToken, isSuperAdmin, updatePlan);
router.delete("/delete/:id", verifyToken, isSuperAdmin, deletePlan);

module.exports = router;
