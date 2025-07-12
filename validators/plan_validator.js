const { body } = require("express-validator");

const PLAN_NAMES = ["Basic", "Pro", "Enterprise"];
const BILLING_CYCLES = ["monthly", "yearly"];
const DATA_TYPES = ["number", "boolean", "string"];

exports.createPlanValidator = [
  body("name")
    .notEmpty()
    .withMessage("Plan name is required.")
    .bail()
    .isIn(PLAN_NAMES)
    .withMessage("Invalid plan name."),

  body("price")
    .notEmpty()
    .withMessage("Price is required.")
    .bail()
    .isNumeric()
    .withMessage("Price must be a number."),

  body("billing_cycle")
    .notEmpty()
    .withMessage("Billing cycle is required.")
    .bail()
    .isIn(BILLING_CYCLES)
    .withMessage("Billing cycle must be either 'monthly' or 'yearly'."),

  body("plan_limits").optional().isArray(),

  body("plan_limits.*.key")
    .notEmpty()
    .withMessage("Plan limit key is required."),

  body("plan_limits.*.value")
    .not()
    .isEmpty()
    .withMessage("Plan limit value is required."),

  body("plan_limits.*.data_type")
    .notEmpty()
    .withMessage("Data type is required.")
    .bail()
    .isIn(DATA_TYPES)
    .withMessage("Data type must be one of: number, boolean, string."),
];

exports.updatePlanValidator = [
  body("name").optional().isIn(PLAN_NAMES).withMessage("Invalid plan name."),

  body("price").optional().isNumeric().withMessage("Price must be a number."),

  body("billing_cycle")
    .optional()
    .isIn(BILLING_CYCLES)
    .withMessage("Billing cycle must be either 'monthly' or 'yearly'."),

  body("plan_limits").optional().isArray(),

  body("plan_limits.*.id").optional().isUUID().withMessage("Invalid limit ID."),

  body("plan_limits.*.key").optional(),

  body("plan_limits.*.value").optional(),

  body("plan_limits.*.data_type")
    .optional()
    .isIn(DATA_TYPES)
    .withMessage("Data type must be one of: number, boolean, string."),
];

exports.createAndAssignPlanLimitValidator = [
  body("key").notEmpty().withMessage("Plan limit key is required."),

  body("value").not().isEmpty().withMessage("Plan limit value is required."),

  body("data_type")
    .notEmpty()
    .withMessage("Data type is required.")
    .bail()
    .isIn(DATA_TYPES)
    .withMessage("Data type must be one of: number, boolean, string."),

  body("description").optional().isString(),

  body("plan_ids")
    .isArray({ min: 1 })
    .withMessage("At least one plan must be provided."),

  body("plan_ids.*").isUUID().withMessage("Each plan ID must be a valid UUID."),
];
