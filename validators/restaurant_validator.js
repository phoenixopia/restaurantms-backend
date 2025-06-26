const { body, param, query } = require("express-validator");

const restaurantNameValidation = body("restaurant_name")
  .notEmpty()
  .withMessage("Restaurant name is required")
  .bail()
  .isString()
  .withMessage("Restaurant name must be a string");

const locationNameValidation = body("location_name")
  .notEmpty()
  .withMessage("Location name is required")
  .bail()
  .isString()
  .withMessage("Location name must be a string");

const addressValidation = body("address")
  .notEmpty()
  .withMessage("Address is required")
  .bail()
  .isString()
  .withMessage("Address must be a string");

const latitudeValidation = body("latitude")
  .optional()
  .isFloat({ min: -90, max: 90 })
  .withMessage("Latitude must be a valid coordinate between -90 and 90");

const longitudeValidation = body("longitude")
  .optional()
  .isFloat({ min: -180, max: 180 })
  .withMessage("Longitude must be a valid coordinate between -180 and 180");

const primaryColorValidation = body("primary_color")
  .optional()
  .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
  .withMessage("Primary color must be a valid hex color code");

const languageValidation = body("language")
  .optional()
  .isIn(["en", "ar"])
  .withMessage("Language must be 'en' or 'ar'");

const rtlEnabledValidation = body("rtl_enabled")
  .optional()
  .isBoolean()
  .withMessage("rtl_enabled must be a boolean");

const statusValidation = body("status")
  .optional()
  .isIn(["active", "trial", "cancelled", "expired"])
  .withMessage("Status must be one of active, trial, cancelled, expired");

const idParamValidation = param("id")
  .isUUID()
  .withMessage("Invalid restaurant ID");

const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be an integer greater than 0")
    .bail(),
  query("limit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Limit must be an integer greater than 0")
    .bail(),
  query("sort")
    .optional()
    .isString()
    .withMessage("Sort must be a string")
    .bail(),
  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Order must be 'asc' or 'desc'"),
];

module.exports = {
  createRestaurantValidator: [
    restaurantNameValidation,
    locationNameValidation,
    addressValidation,
    latitudeValidation,
    longitudeValidation,
    primaryColorValidation,
    languageValidation,
    rtlEnabledValidation,
  ],
  updateRestaurantValidator: [
    idParamValidation,
    restaurantNameValidation.optional(),
    locationNameValidation.optional(),
    addressValidation.optional(),
    latitudeValidation,
    longitudeValidation,
    primaryColorValidation,
    languageValidation,
    rtlEnabledValidation,
  ],
  deleteRestaurantValidator: [idParamValidation],
  changeStatusValidator: [
    idParamValidation,
    body("status")
      .notEmpty()
      .withMessage("Status is required")
      .bail()
      .isIn(["active", "trial", "cancelled", "expired"])
      .withMessage("Invalid status"),
  ],
  paginationValidation,
};
