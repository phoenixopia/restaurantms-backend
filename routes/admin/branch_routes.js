const express = require("express");
const router = express.Router();
const branchController = require("../../controllers/admin/branch_controller");
const { protect } = require("../../middleware/protect");
const { authorize } = require("../../middleware/authorize");
const checkPermission = require("../../middleware/checkPermission");

router.post("/", branchController.createBranch);
router.get("/", branchController.getAllBranches);
router.get("/:id", branchController.getBranchById);
router.put("/:id", branchController.updateBranch);
router.delete("/:id", branchController.deleteBranch);

module.exports = router;
