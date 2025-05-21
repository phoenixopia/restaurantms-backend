const express = require("express");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const checkPermission = require("../../middleware/checkPermission");
const {
  listPlans,
  getPlanById,
  getPlanByName,
  createPlan,
  updatePlan,
  deletePlan,
} = require("../../controllers/admin/plan_controller");

const router = express.Router();

router.get("/", protect, listPlans);
router.get("/:id", protect, getPlanById);
router.get("/:name", protect, getPlanByName);
router.post("/create", protect, checkPermission("manage_plan"), createPlan);
router.put("/update/:id", protect, checkPermission("manage_plan"), updatePlan);
router.delete(
  "/delete/:id",
  protect,
  checkPermission("manage_plan"),
  deletePlan
);

module.exports = router;
