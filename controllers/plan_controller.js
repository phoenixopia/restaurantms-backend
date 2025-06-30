const PlanService = require("../services/plan_service");
const asyncHandler = require("../middleware/asyncHandler");
const { success } = require("../utils/apiResponse");

exports.listPlans = asyncHandler(async (req, res) => {
  const plans = await PlanService.listPlans();
  return success(res, "Plans fetched successfully", plans);
});

exports.getPlanById = asyncHandler(async (req, res) => {
  const plan = await PlanService.getById(req.params.id);
  return success(res, "Plan fetched successfully", plan);
});

exports.createPlan = asyncHandler(async (req, res) => {
  const newPlan = await PlanService.create(req.body);
  return success(res, "Plan created successfully", newPlan, 201);
});

exports.updatePlan = asyncHandler(async (req, res) => {
  await PlanService.update(req.params.id, req.body);
  return success(res, "Plan updated successfully");
});

exports.deletePlan = asyncHandler(async (req, res) => {
  await PlanService.delete(req.params.id);
  return success(res, "Plan deleted successfully");
});
