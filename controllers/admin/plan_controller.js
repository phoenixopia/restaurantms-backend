const PlanService = require("../../services/admin/plan_service");
const asyncHandler = require("../../utils/asyncHandler");
const { success } = require("../../utils/apiResponse");

// List all plans with pagination
exports.listPlans = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const plans = await PlanService.listPlans({ page, limit });
  return success(res, "Plans fetched successfully", plans);
});

exports.listGroupedPlans = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const plans = await PlanService.listPlansGroupedByNameAndDuration({
    page,
    limit,
  });
  return success(res, "Plans fetched successfully", plans);
});

// Get plan by ID
exports.getPlanById = asyncHandler(async (req, res) => {
  const plan = await PlanService.getById(req.params.id);
  return success(res, "Plan fetched successfully", plan);
});

exports.getPlanByName = asyncHandler(async (req, res) => {
  const filters = req.query;
  const plan = await PlanService.getByFilters(filters);
  return success(res, "Plan fetched successfully", plan);
});

// Create new plan with optional limits
exports.createPlan = asyncHandler(async (req, res) => {
  const newPlan = await PlanService.create(req.body, req.user);
  return success(res, "Plan created successfully", newPlan, 201);
});

// Update plan and its limits
exports.updatePlan = asyncHandler(async (req, res) => {
  const updated = await PlanService.update(req.params.id, req.body, req.user);
  return success(res, "Plan updated successfully", updated);
});

// Delete plan and its limits
exports.deletePlan = asyncHandler(async (req, res) => {
  await PlanService.delete(req.params.id, req.user);
  return success(res, "Plan deleted successfully");
});

exports.listPlanLimits = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const result = await PlanService.listAllPlanLimit({ page, limit });
  return success(res, "Plan limits fetched successfully", result);
});

exports.listPlanLimitsWithPlans = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const result = await PlanService.listAllPlanLimitsWithPlans({ page, limit });
  return success(
    res,
    "Plan limits with assigned plans fetched successfully",
    result
  );
});

exports.createAndAssign = asyncHandler(async (req, res) => {
  const result = await PlanService.createAndAssign(req.body, req.user);
  return success(res, "Plan limit created and assigned successfully", result);
});
