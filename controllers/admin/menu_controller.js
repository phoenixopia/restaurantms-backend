"use strict";

const asyncHandler = require("../../utils/asyncHandler");
const MenuService = require("../../services/admin/menu_service");
const MenuCategoryService = require("../../services/admin/menuCategory_service");
const MenuItemService = require("../../services/admin/menuItem_service");
const { success } = require("../../utils/apiResponse");
const bwipjs = require('bwip-js');

// ====================== Menu
exports.createMenu = asyncHandler(async (req, res) => {
  const restaurantId = req.user.restaurant_id;
  const menu = await MenuService.createMenu(req.body, restaurantId, req.user);
  return success(res, "Menu created successfully", menu, 201);
});

exports.getMenu = asyncHandler(async (req, res) => {
  const menu = await MenuService.listMenu(req.user);
  return success(res, "Menu fetched successfully", menu);
});

exports.getSingleMenu = asyncHandler(async (req, res) => {
  const menu = await MenuService.getSingleMenu(req.params.id);
  return success(res, "Menu item fetched successfully",menu);
});


exports.updateMenu = asyncHandler(async (req, res) => {
  const menu = await MenuService.updateMenu(req.user, req.body);
  return success(res, "Menu updated successfully", menu);
});

exports.deleteMenu = asyncHandler(async (req, res) => {
  await MenuService.deleteMenu(req.user);
  return success(res, "Menu deleted successfully");
});

// ====================== Menu Category

exports.createMenuCategory = asyncHandler(async (req, res) => {
  const category = await MenuCategoryService.createMenuCategory(
    req.user,
    req.body
  );
  return success(res, "Menu category created successfully", category, 201);
});

exports.updateMenuCategory = asyncHandler(async (req, res) => {
  const updated = await MenuCategoryService.updateMenuCategory(
    req.params.id,
    req.user,
    req.body
  );
  return success(res, "Menu category updated successfully", updated);
});

exports.deleteMenuCategory = asyncHandler(async (req, res) => {
  await MenuCategoryService.deleteMenuCategory(req.params.id, req.user);
  return success(res, "Menu category deleted successfully");
});

exports.toggleMenuCategoryActivation = asyncHandler(async (req, res) => {
  const toggled = await MenuCategoryService.toggleMenuCategoryActivation(
    req.params.id,
    req.user
  );
  return success(res, "Menu category activation toggled", toggled);
});

exports.listMenuCategories = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, ...filters } = req.query;

  const result = await MenuCategoryService.listMenuCategoriesUnderRestaurant(
    req.user,
    parseInt(page),
    parseInt(limit),
    filters
  );

  return success(res, "Menu categories fetched", result);
});

exports.getMenuCategory = asyncHandler(async (req, res) => {
  const category = await MenuCategoryService.getMenuCategoryById(
    req.params.id,
    req.user
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
  const item = await MenuItemService.createMenuItem(req.body, req.user);
  return success(res, "Menu item created successfully", item, 201);
});

exports.uploadImage = asyncHandler(async (req, res) => {
  const result = await MenuItemService.uploadImage(
    req.file,
    req.params.id,
    req.user
  );
  return success(res, "Menu item image uploaded successfully", result, 201);
});

exports.listMenuItemsWithRestaurant = asyncHandler(async (req, res) => {
  const items = await MenuItemService.listMenuItemsWithRestaurant(
    req.query,
    req.user
  );
  return success(res, "Menu items fetched successfully", items);
});

exports.updateMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItemService.updateMenuItem(
    req.params.id,
    req.user,
    req.body
  );
  return success(res, "Menu item updated successfully", item);
});

exports.deleteMenuItem = asyncHandler(async (req, res) => {
  await MenuItemService.deleteMenuItem(req.params.id, req.user);
  return success(res, "Menu item deleted successfully");
});

exports.toggleSeasonal = asyncHandler(async (req, res) => {
  const item = await MenuItemService.toggleSeasonal(req.params.id, req.user);
  return success(
    res,
    `Menu item is now ${item.seasonal ? "seasonal" : "non-seasonal"}`,
    item
  );
});

exports.toggleMenuItemActivation = asyncHandler(async (req, res) => {
  const menuItem = await MenuItemService.toggleActivation(
    req.params.id,
    req.user
  );

  return success(
    res,
    `Menu item is now ${menuItem.is_active ? "active" : "inactive"}`,
    menuItem
  );
});

exports.getSingleMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItemService.getSingleMenuItem(req.params.id, req.user);
  return success(res, "Menu item fetched successfully", item);
});

exports.generateBarcode = asyncHandler(async (req, res) => {
  const { menuId } = req.params;
  // const url = `${process.env.TEST_FRONTEND_URL}/menu/${menuId}`;
    const url = `https://restaurant-zeta-wheat.vercel.app/menu/${menuId}`;


  try {
    const png = await bwipjs.toBuffer({
      bcid: 'qrcode',
      text: url,
      scale: 3,
      height: 30,
      includetext: false,
    });

    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to generate barcode' });
  }
});
