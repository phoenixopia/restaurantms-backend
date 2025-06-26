const { body } = require("express-validator");

// ========== ROLE ==========

exports.createRoleValidator = [
  body("name")
    .notEmpty()
    .withMessage("Role name is required.")
    .bail()
    .isString()
    .withMessage("Role name must be a string."),
];

exports.updateRoleValidator = [
  body("name").optional().isString().withMessage("Role name must be a string."),
];

// ========== PERMISSION ==========

exports.createPermissionValidator = [
  body("name")
    .notEmpty()
    .withMessage("Permission name is required.")
    .bail()
    .isString()
    .withMessage("Permission name must be a string."),
];

exports.updatePermissionValidator = [
  body("name")
    .optional()
    .isString()
    .withMessage("Permission name must be a string."),
];

// ========== ROLE-PERMISSION ==========

exports.grantOrRevokePermissionToRoleValidator = [
  body("permissionIds")
    .isArray({ min: 1 })
    .withMessage("permissionIds must be a non-empty array."),
  body("permissionIds.*")
    .isUUID()
    .withMessage("Each permission ID must be a valid UUID."),
];

// ========== USER-PERMISSION ==========

exports.grantOrRevokePermissionToUserValidator = [
  body("permissionIds")
    .isArray({ min: 1 })
    .withMessage("permissionIds must be a non-empty array."),
  body("permissionIds.*")
    .isUUID()
    .withMessage("Each permission ID must be a valid UUID."),
];

// ========== ASSIGN ROLE TO USER ==========

exports.assignRoleToUserValidator = [
  body("roleId")
    .notEmpty()
    .withMessage("Role ID is required.")
    .bail()
    .isUUID()
    .withMessage("Role ID must be a valid UUID."),
];
