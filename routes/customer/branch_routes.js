const express = require("express");
const BranchController = require("../../controllers/admin/branch_controller");
const { filterActiveBranches } = require("../../middleware/branchMiddleware");

const router = express.Router();

// to view active branches
router.get(
  "/branches/:restaurantId",
  filterActiveBranches,
  BranchController.getAllBranchesUnderRestaurant
);

module.exports = router;
