const { validationResult } = require("express-validator");
const { error: apiError } = require("../utils/apiResponse");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return apiError(res, "Validation failed", errors.array(), 400);
  }
  next();
};

module.exports = validateRequest;
