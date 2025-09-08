const express = require("express");
const router = express.Router();

const ProfileController = require("../../controllers/admin/profile_controller");
const { protect } = require("../../middleware/protect");
const ValidateUploadedFiles = require("../../middleware/validateUploadedFiles");
const Upload = require("../../middleware/uploads");

router.get("/get-profile", protect("user"), ProfileController.getProfile);

router.put(
  "/update-profile",
  protect("user"),
  Upload.uploadProfilePicture,
  ValidateUploadedFiles.validateUploadedFiles("profile"),
  ProfileController.updateProfile
);

module.exports = router;
