const PlanService = require("../../services/admin/plan_service");
const asyncHandler = require("../../middleware/asyncHandler");
const { success } = require("../../utils/apiResponse");

// List all plans with pagination
exports.listPlans = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const plans = await PlanService.listPlans({ page, limit });
  return success(res, "Plans fetched successfully", plans);
});

// Get plan by ID
exports.getPlanById = asyncHandler(async (req, res) => {
  const plan = await PlanService.getById(req.params.id);
  return success(res, "Plan fetched successfully", plan);
});

exports.getPlanByName = asyncHandler(async (req, res) => {
  const { name, billing_cycle } = req.query;
  const plan = await PlanService.getByName(name, billing_cycle);
  return success(res, "Plan fetched successfully", plan);
});

// Create new plan with optional limits
exports.createPlan = asyncHandler(async (req, res) => {
  const newPlan = await PlanService.create(req.body);
  return success(res, "Plan created successfully", newPlan, 201);
});

// Update plan and its limits
exports.updatePlan = asyncHandler(async (req, res) => {
  const updated = await PlanService.update(req.params.id, req.body);
  return success(res, "Plan updated successfully", updated);
});

// Delete plan and its limits
exports.deletePlan = asyncHandler(async (req, res) => {
  await PlanService.delete(req.params.id);
  return success(res, "Plan deleted successfully");
});
