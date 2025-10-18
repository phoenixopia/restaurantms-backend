const asyncHandler = require("../../utils/asyncHandler");
const CateringService = require("../../services/customer/catering_service");
const { success } = require("../../utils/apiResponse");

// =============== Catering

// // Get CATERINGS FOR CUSTOMER
// exports.listCateringsForCustomer = asyncHandler(async (req, res) => {
//   const customerId = req.user.id;

//   const result = await CateringService.listCateringsForCustomer(
//     customerId,
//     req.query
//   );

//   return success(res, "Caterings fetched successfully", result);
// });


exports.getCateringById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await CateringService.getCateringById(id);
  return success(res, "Catering fetched successfully", result);
});

exports.listCaterings = asyncHandler(async (req, res) => {
  const restaurant_id = req.params.id;
  const { page = 1, limit = 10 } = req.query;

  const result = await CateringService.listCaterings(
    restaurant_id,
    parseInt(page),
    parseInt(limit)
  );
  return success(res, "Caterings fetched successfully", result);
});

exports.listOneCateringPerRestaurant = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const result = await CateringService.listOneCateringPerRestaurant({
    page: parseInt(page),
    limit: parseInt(limit),
  });

  return success(
    res,
    "One catering per restaurant fetched successfully",
    result
  );
});

exports.createRequest = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const data = req.body;

  const result = await CateringService.createCateringRequest({
    customerId,
    data,
  });

  return success(res, "Catering request submitted successfully", result, 201);
});

exports.updateMyCateringRequest = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const requestId = req.params.id;
  const data = req.body;

  const updatedRequest = await CateringService.updateMyCateringRequest({
    customerId,
    requestId,
    data,
  });

  return success(res, "Catering request updated successfully", updatedRequest);
});

exports.getAllMyCateringRequest = asyncHandler(async (req, res) => {
  console.log("Inside getAllMyCateringRequest controller");
  const customerId = req.user.id;
  const { page = 1, limit = 10, status } = req.query;

  const result = await CateringService.getAllMyCateringRequests({
    customerId,
    page: parseInt(page),
    limit: parseInt(limit),
    status,
  });

  return success(
    res,
    "Customer catering requests fetched successfully",
    result
  );
});

exports.getCateringQuoteByRequestId = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const cateringRequestId = req.params.id;

  const quote = await CateringService.getCateringQuoteByRequestId(
    customerId,
    cateringRequestId
  );

  return success(res, "Catering quote fetched successfully", quote);
});

exports.updateCateringQuoteByCustomer = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const quoteId = req.params.id;
  const { status } = req.body;

  const updatedQuote = await CateringService.updateCateringQuoteByCustomer(
    customerId,
    quoteId,
    status
  );

  return success(res, "Catering quote updated successfully", updatedQuote);
});

exports.getAcceptedCateringQuote = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  const updatedQuote = await CateringService.getAcceptedCateringQuote({
    customerId,
    page: parseInt(page),
    limit: parseInt(limit),
  });

  return success(res, "Catering quote fetched successfully", updatedQuote);
});
