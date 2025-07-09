const { body } = require("express-validator");

const createSubscriptionValidator = [
  body("plan_name")
    .notEmpty()
    .withMessage("Plan name is required")
    .bail()
    .isString()
    .withMessage("Plan name must be a string"),

  body("billing_cycle")
    .notEmpty()
    .withMessage("Billing cycle is required")
    .bail()
    .isIn(["monthly", "yearly"])
    .withMessage("Billing cycle must be either 'monthly' or 'yearly'"),

  body("billing_provider")
    .optional()
    .isIn(["stripe", "paypal", "telebirr", "cash", "CBE"])
    .withMessage(
      "Billing provider must be one of 'stripe', 'paypal', 'telebirr', 'cash', or 'CBE'"
    ),
];

module.exports = {
  createSubscriptionValidator,
};
