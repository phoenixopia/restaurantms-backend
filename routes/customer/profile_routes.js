const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/protect");
const ValidateUploadedFiles = require("../../middleware/validateUploadedFiles");
const Upload = require("../../middleware/uploads");
const ProfileController = require("../../controllers/customer/profileController");

router.put(
  "/edit-profile",
  protect("customer"),
  ValidateUploadedFiles.validateUploadedFiles("profile"),
  Upload.uploadProfilePicture,
  ProfileController.updateProfile
);

router.put(
  "/address",
  protect("customer"),
  ProfileController.updateMultipleAddresses
);

router.put(
  "/address/:type",
  protect("customer"),
  ProfileController.updateAddress
);

module.exports = router;
