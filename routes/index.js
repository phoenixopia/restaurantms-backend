const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// routes for admin side
router.use("/admin", require("./admin/index"));

// routes for customers side
router.use("/customer", require("./customer/index"));

// common routes for both admin and customer
router.get("/profile", userController.getProfile);
router.put("/update-profile", userController.updateProfile);
router.delete("/delete-profile", userController.deleteAccount);
router.post("/change-password", userController.changePassword);

module.exports = router;
