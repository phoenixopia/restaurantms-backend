const express = require("express");
const BranchController = require("../../controllers/admin/branch_controller");

const router = express.Router();
router.post("/branches", BranchController.createBranch);
router.get(
  "/restaurants/branches/:restaurantId",
  BranchController.getAdminBranches
);
router.get("/branches/:branchId", BranchController.getBranchById);
router.put("/branches/:branchId", BranchController.updateBranch);
router.delete("/branches/:branchId", BranchController.deleteBranch);
router.get(
  "/restaurants/branches/:restaurantId",
  BranchController.getAllBranchesUnderRestaurant
);

module.exports = router;
