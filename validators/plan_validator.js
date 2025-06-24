const { body } = require("express-validator");

exports.createPlanValidator = [
  body("name")
    .notEmpty()
    .withMessage("Plan name is required.")
    .bail()
    .isIn(["Basic", "Pro", "Enterprise"])
    .withMessage("Invalid plan name."),

  body("price")
    .notEmpty()
    .withMessage("Price is required.")
    .bail()
    .isNumeric()
    .withMessage("Price must be a number."),
];

exports.updatePlanValidator = [
  body("name")
    .optional()
    .isIn(["Basic", "Pro", "Enterprise"])
    .withMessage("Invalid plan name."),

  body("price").optional().isNumeric().withMessage("Price must be a number."),
];
