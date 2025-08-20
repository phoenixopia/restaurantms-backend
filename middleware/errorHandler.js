const { error: apiError } = require("../utils/apiResponse");

module.exports = (err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  // add for custom error handling
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  return apiError(res, message, null, statusCode);
};
