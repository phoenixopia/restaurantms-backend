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
    .custom((value) => {
      if (!value) {
        throw new Error("permissionIds is required.");
      }
      if (Array.isArray(value)) {
        if (value.length === 0) {
          throw new Error("permissionIds array must not be empty.");
        }
        return value.every(
          (id) => typeof id === "string" && /^[0-9a-fA-F-]{36}$/.test(id)
        );
      } else if (typeof value === "string") {
        return /^[0-9a-fA-F-]{36}$/.test(value);
      } else {
        throw new Error(
          "permissionIds must be a UUID string or array of UUIDs."
        );
      }
    })
    .withMessage("Each permission ID must be a valid UUID."),
];

// ========== USER-PERMISSION ==========

exports.grantOrRevokePermissionToUserValidator = [
  body("permissionIds").custom((value) => {
    if (Array.isArray(value)) {
      if (value.length === 0)
        throw new Error("permissionIds array must not be empty");
      for (const id of value) {
        if (typeof id !== "string" || !/^[0-9a-fA-F-]{36}$/.test(id)) {
          throw new Error(
            "Each permission ID in the array must be a valid UUID."
          );
        }
      }
      return true;
    }

    if (typeof value === "string" && /^[0-9a-fA-F-]{36}$/.test(value)) {
      return true;
    }

    throw new Error(
      "permissionIds must be either a UUID string or a non-empty array of UUIDs."
    );
  }),
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
