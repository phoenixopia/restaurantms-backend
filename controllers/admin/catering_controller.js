const asyncHandler = require("../../utils/asyncHandler");
const CateringService = require("../../services/admin/catering_service");
const { success } = require("../../utils/apiResponse");

exports.createCatering = asyncHandler(async (req, res) => {
  const data = req.body;
  const catering = await CateringService.createCatering(req.user, data);

  return success(res, "Catering created successfully", catering, 201);
});

exports.updateBasicInfo = asyncHandler(async (req, res) => {
  const data = req.body;
  const result = await CateringService.updateBasicInfo(
    req.params.id,
    req.user,
    data
  );

  return success(res, "Catering updated successfully", result);
});

exports.uploadImage = asyncHandler(async (req, res) => {
  const updated = await CateringService.uploadImage(
    req.params.id,
    req.files,
    req.user
  );

  return success(res, "Catering updated successfully", updated);
});

exports.getAllCateringSerivces = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const result = await CateringService.getAllCateringSerivce(req.user, {
    page,
    limit,
  });

  return success(res, "Caterings fetched successfully", result);
});

exports.getCateringServiceById = asyncHandler(async (req, res) => {
  const cateringId = req.params.id;

  const catering = await CateringService.getCateringServiceById(
    req.user,
    cateringId
  );

  return success(res, "Catering fetched successfully", catering);
});

exports.deleteCatering = asyncHandler(async (req, res) => {
  const cateringId = req.params.id;

  const result = await CateringService.deleteCatering(cateringId, req.user);
  return success(res, result.message);
});

exports.toggleCateringStatus = asyncHandler(async (req, res) => {
  const cateringId = req.params.id;

  const updated = await CateringService.toggleStatus(req.user, cateringId);

  return success(res, "Catering status updated successfully", updated);
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

// ================ Catering request ==============

exports.viewCateringRequests = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status;

  const result = await CateringService.getCateringRequests(req.user, {
    page,
    limit,
    status,
  });

  return success(res, "Catering requests fetched successfully", result);
});

exports.viewCateringRequestById = asyncHandler(async (req, res) => {
  const cateringRequestId = req.params.id;

  const result = await CateringService.getCateringRequestById(
    cateringRequestId,
    req.user
  );

  return success(res, "Catering request fetched successfully", result);
});

exports.giveResponseCateringRequest = asyncHandler(async (req, res) => {
  const cateringRequestId = req.params.id;
  const { status } = req.body;

  const result = await CateringService.giveResponseCateringRequest(
    cateringRequestId,
    req.user,
    { status }
  );

  return success(
    res,
    "Response given to catering request successfully",
    result
  );
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
