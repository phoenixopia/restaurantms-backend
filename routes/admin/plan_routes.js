const express = require("express");
const PlanController = require("../../controllers/admin/plan_controller");

const router = express.Router();

router.get("/", PlanController.listPlans);
router.get("/id/:id", PlanController.getPlanById);
router.get("/name/:name", PlanController.getPlanByName);
router.put("/update/:id", PlanController.updatePlan);
router.delete("/delete/:id", PlanController.deletePlan);
``;
module.exports = router;
