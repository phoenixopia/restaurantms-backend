const asyncHandler = require("../../utils/asyncHandler");
const CateringService = require("../../services/admin/catering_service");
const { success } = require("../../utils/apiResponse");

exports.createCatering = asyncHandler(async (req, res) => {
  const data = req.body;
  const file = req.file;
  const catering = await CateringService.createCatering({ data, file });

  return success(res, "Catering created successfully", catering, 201);
});

exports.updateCatering = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { restaurant_id } = req.body;
  const data = req.body;
  const file = req.file;

  const updated = await CateringService.updateCatering(
    id,
    restaurant_id,
    data,
    file
  );

  return success(res, "Catering updated successfully", updated);
});

exports.deleteCatering = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const restaurant_id = req.user.restaurant_id;

  const result = await CateringService.deleteCatering(id, restaurant_id);
  return success(res, result.message);
});

exports.toggleCateringStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const restaurant_id = req.user.restaurant_id;

  const result = await CateringService.toggleCateringStatus(id, restaurant_id);
  return success(res, "Catering status toggled successfully", result);
});

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

exports.giveResponse = asyncHandler(async (req, res) => {
  const { id } = req.params; // CateringRequest ID
  const { status } = req.body;
  const { id: userId, restaurant_id, branch_id, role_name } = req.user;

  const result = await CateringService.respondToCateringRequest({
    requestId: id,
    userId,
    role: role_name,
    restaurant_id,
    branch_id,
    status,
  });

  return success(
    res,
    "Response to catering request recorded successfully",
    result
  );
});
