const TableService = require("../../services/admin/table_service");
const { success } = require("../../utils/apiResponse");
const asyncHandler = require("../../utils/asyncHandler");

exports.createTable = asyncHandler(async (req, res) => {
  const result = await TableService.createTable(req.body, req.user);

  return success(res, result.message, result.data, 201);
});

exports.getTables = asyncHandler(async (req, res) => {
  const result = await TableService.getTables(req.user, req.query);

  return success(res, "Tables fetched successfully", result, 200);
});

exports.getTableById = asyncHandler(async (req, res) => {
  const result = await TableService.getTableById(req.params.id, req.user);

  return success(res, result.message, result.data, 200);
});

exports.updateTable = asyncHandler(async (req, res) => {
  const result = await TableService.updateTable(
    req.params.id,
    req.body,
    req.user
  );

  return success(res, result.message, result.data, 200);
});

exports.deleteTable = asyncHandler(async (req, res) => {
  const { tableId } = req.params;
  const result = await TableService.deleteTable(req.params.id, req.user);

  return success(res, result.message, result.data, 200);
});

// table kpi
exports.getTableKPI = asyncHandler(async (req, res) => {
  const result = await TableService.getTableKPI(req.user, req.query);

  return success(res, result.message, result.data, 200);
});
