const asyncHandler = require("../../utils/asyncHandler");
const InventoryService = require("../../services/admin/inventory_serivce");
const { success } = require("../../utils/apiResponse");

exports.createInventory = asyncHandler(async (req, res) => {
  const item = await InventoryService.createInventory(req.user, req.body);
  return success(res, "Inventory created successfully", item, 201);
});

exports.updateInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, quantity, threshold } = req.body;

  const updatedItem = await InventoryService.updateInventory(req.user, id, {
    name,
    quantity,
    threshold,
  });

  return success(res, "Inventory item updated successfully", updatedItem, 200);
});

exports.adjustInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, quantity, reason } = req.body;

  const updatedItem = await InventoryService.adjustInventory(req.user, id, {
    type,
    quantity,
    reason,
  });

  return success(res, "Inventory adjusted successfully", updatedItem, 200);
});

exports.deleteInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await InventoryService.deleteInventory(req.user, id);

  return success(res, result.message);
});

exports.getAllInventory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "createdAt";
  const order = req.query.order || "DESC";
  const branchId = req.query.branchId || null;

  const result = await InventoryService.listAllInventory(req.user, {
    page,
    limit,
    search,
    sortBy,
    order,
    branchId,
  });

  return success(res, "Inventory fetched successfully", result);
});

exports.getInventoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await InventoryService.getInventory(req.user, id);
  return success(res, "Inventory item fetched successfully", item, 200);
});

// ===================== KPI

exports.getKpis = asyncHandler(async (req, res) => {
  const branchId = req.query.branchId || null;
  const data = await InventoryService.getKpis(req.user, branchId);
  return success(res, "Inventory KPIs fetched successfully", data, 200);
});

exports.getInventoryTransactionKpis = asyncHandler(async (req, res) => {
  const branchId = req.query.branchId || null;
  const data = await InventoryService.getInventoryTransactionKpis(
    req.user,
    branchId
  );
  return success(
    res,
    "Inventory transactions KPIs fetched successfully",
    data,
    200
  );
});

exports.listInventoryTransactions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy || "created_at";
  const order = req.query.order || "DESC";
  const branchId = req.query.branchId || null;

  const data = await InventoryService.listInventoryTransactions(req.user, {
    page,
    limit,
    search,
    sortBy,
    order,
    branchId,
  });

  return success(res, "Inventory transactions fetched successfully", data, 200);
});
