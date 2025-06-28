"use strict";

const asyncHandler = require("../../middleware/asyncHandler");
const MenuService = require("../../services/menu_service");
const MenuCategoryService = require("../../services/menuCategory_service");
const MenuItemService = require("../../services/menuItem_service");
const { success } = require("../../utils/apiResponse");

// ====================== Menu
exports.createMenu = asyncHandler(async (req, res) => {
  const restaurantId = req.restaurant.id;
  const menu = await MenuService.createMenu(req.body, restaurantId);
  return success(res, "Menu created successfully", menu, 201);
});

exports.getMenu = asyncHandler(async (req, res) => {
  const restaurantId = req.restaurant.id;
  const menu = await MenuService.listMenu(restaurantId);
  return success(res, "Menu fetched successfully", menu);
});

exports.updateMenu = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const restaurantId = req.restaurant.id;
  const menu = await MenuService.updateMenu(id, restaurantId, req.body);
  return success(res, "Menu updated successfully", menu);
});

exports.deleteMenu = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const restaurantId = req.restaurant.id;
  await MenuService.deleteMenu(id, restaurantId);
  return success(res, "Menu deleted successfully");
});

exports.toggleMenuActivation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const restaurantId = req.restaurant.id;
  const menu = await MenuService.toggleMenuActivation(id, restaurantId);
  return success(
    res,
    `Menu is now ${menu.is_active ? "active" : "inactive"}`,
    menu
  );
});

// ====================== Menu Category

exports.createMenuCategory = asyncHandler(async (req, res) => {
  const { restaurantId } = req.restaurantData;
  const category = await MenuCategoryService.createMenuCategory({
    ...req.body,
    imageFile: req.file?.filename,
    restaurantId,
  });
  return success(res, "Menu category created successfully", category, 201);
});

exports.updateMenuCategory = asyncHandler(async (req, res) => {
  const { restaurantId } = req.restaurantData;
  const updated = await MenuCategoryService.updateMenuCategory(
    req.params.id,
    restaurantId,
    req.body,
    req.file?.filename
  );
  return success(res, "Menu category updated successfully", updated);
});

exports.deleteMenuCategory = asyncHandler(async (req, res) => {
  const { restaurantId } = req.restaurantData;
  await MenuCategoryService.deleteMenuCategory(req.params.id, restaurantId);
  return success(res, "Menu category deleted successfully");
});

exports.toggleMenuCategoryActivation = asyncHandler(async (req, res) => {
  const { restaurantId } = req.restaurantData;
  const toggled = await MenuCategoryService.toggleMenuCategoryActivation(
    req.params.id,
    restaurantId
  );
  return success(res, "Menu category activation toggled", toggled);
});

exports.listMenuCategories = asyncHandler(async (req, res) => {
  const { restaurantId } = req.restaurantData;
  const { branchId, page = 1, limit = 10 } = req.query;
  const result = await MenuCategoryService.listMenuCategoriesUnderRestaurant(
    restaurantId,
    branchId,
    parseInt(page),
    parseInt(limit)
  );
  return success(res, "Menu categories fetched", result);
});

exports.getMenuCategory = asyncHandler(async (req, res) => {
  const { restaurantId } = req.restaurantData;
  const category = await MenuCategoryService.getMenuCategoryById(
    req.params.id,
    restaurantId
  );
  return success(res, "Menu category fetched", category);
});

exports.listCategoryTags = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const tags = await MenuCategoryService.listAllCategoriesTags(
    parseInt(page),
    parseInt(limit)
  );
  return success(res, "Category tags fetched", tags);
});

// ===================== Menu Items

exports.createMenuItem = asyncHandler(async (req, res) => {
  const restaurantId = req.restaurant.id;
  const item = await MenuItemService.createMenuItem(
    req.body,
    req.file?.filename,
    restaurantId
  );
  return success(res, "Menu item created successfully", item, 201);
});

exports.listMenuItemsWithRestaurant = asyncHandler(async (req, res) => {
  const restaurantId = req.restaurant.id;
  const items = await MenuItemService.listMenuItemsWithRestaurant(
    req.query,
    restaurantId
  );
  return success(res, "Menu items fetched successfully", items);
});

exports.updateMenuItem = asyncHandler(async (req, res) => {
  const restaurantId = req.restaurant.id;
  const item = await MenuItemService.updateMenuItem(
    req.params.id,
    req.body,
    req.file?.filename,
    restaurantId
  );
  return success(res, "Menu item updated successfully", item);
});

exports.deleteMenuItem = asyncHandler(async (req, res) => {
  const restaurantId = req.restaurant.id;
  await MenuItemService.deleteMenuItem(req.params.id, restaurantId);
  return success(res, "Menu item deleted successfully");
});

exports.toggleSeasonal = asyncHandler(async (req, res) => {
  const restaurantId = req.restaurant.id;
  const item = await MenuItemService.toggleSeasonal(
    req.params.id,
    restaurantId
  );
  return success(
    res,
    `Menu item is now ${item.seasonal ? "seasonal" : "non-seasonal"}`,
    item
  );
});

exports.getSingleMenuItem = asyncHandler(async (req, res) => {
  const restaurantId = req.restaurant.id;
  const item = await MenuItemService.getSingleMenuItem(
    req.params.id,
    restaurantId
  );
  return success(res, "Menu item fetched successfully", item);
});
