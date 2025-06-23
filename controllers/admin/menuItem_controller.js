"use strict";

const path = require("path");
const fs = require("fs");
const {
  MenuItem,
  MenuCategory,
  Menu,
  Branch,
  sequelize,
} = require("../../models");
const { Op } = require("sequelize");

const SERVER_URL = process.env.SERVER_URL || "http://127.0.0.1:8000";
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "menu-items");

const getFileUrl = (filename) =>
  filename
    ? `${SERVER_URL}/uploads/menu-items/${encodeURIComponent(filename)}`
    : null;

const getFilePath = (filename) => path.join(UPLOADS_DIR, filename);

exports.createMenuItem = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      menu_category_name,
      name,
      description,
      unit_price,
      seasonal,
      is_active,
    } = req.body;

    if (!menu_category_name || !name || !unit_price) {
      return res.status(400).json({
        success: false,
        message: "menu_category_name, name, and unit_price are required",
      });
    }

    const category = await MenuCategory.findOne({
      where: { name: menu_category_name },
      include: [
        {
          association: "Menu",
          where: { restaurant_id: req.restaurant.id },
          required: true,
        },
      ],
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Menu category not found under your restaurant",
      });
    }

    const image = req.file ? req.file.filename : null;

    const menuItem = await MenuItem.create(
      {
        menu_category_id: category.id,
        name,
        description,
        unit_price,
        image: getFileUrl(image),
        seasonal: seasonal ?? false,
        is_active: is_active ?? true,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      data: menuItem,
    });
  } catch (error) {
    await t.rollback();
    console.error("Create menu item error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create menu item" });
  }
};

exports.listMenuItems = async (req, res) => {
  try {
    const { categoryId, branchId, seasonal } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filters = {};
    if (categoryId) filters.menu_category_id = categoryId;
    if (seasonal !== undefined) filters.seasonal = seasonal === "true";

    const menuItems = await MenuItem.paginate({
      page,
      paginate: limit,
      where: filters,
      include: [
        {
          association: "MenuCategory",
          required: true,
          include: [
            {
              association: "Menu",
              required: true,
              where: { restaurant_id: req.restaurant.id },
            },
            ...(branchId
              ? [
                  {
                    association: "Branch",
                    required: true,
                    where: { id: branchId },
                  },
                ]
              : []),
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({ success: true, data: menuItems });
  } catch (error) {
    console.error("List menu items error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to list menu items" });
  }
};

// user side
exports.listActiveMenuItems = async (req, res) => {
  try {
    const { categoryId, seasonal } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filters = {
      is_active: true,
      ...(categoryId && { menu_category_id: categoryId }),
      ...(seasonal !== undefined && { seasonal: seasonal === "true" }),
    };

    const items = await MenuItem.paginate({
      page,
      paginate: limit,
      where: filters,
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error("User menu items error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to list active menu items" });
  }
};

exports.updateMenuItem = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { name, description, unit_price, seasonal, is_active } = req.body;

    const item = await MenuItem.findByPk(id, {
      include: {
        association: "MenuCategory",
        include: {
          association: "Menu",
          where: { restaurant_id: req.restaurant.id },
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found or unauthorized",
      });
    }

    if (req.file) {
      const oldFilename = item.image?.split("/uploads/menu-items/")[1];
      if (oldFilename && fs.existsSync(getFilePath(oldFilename))) {
        fs.unlinkSync(getFilePath(oldFilename));
      }
      item.image = getFileUrl(req.file.filename);
    }

    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    if (unit_price !== undefined) item.unit_price = unit_price;
    if (seasonal !== undefined) item.seasonal = seasonal;
    if (is_active !== undefined) item.is_active = is_active;

    await item.save({ transaction: t });
    await t.commit();

    return res
      .status(200)
      .json({ success: true, message: "Menu item updated", data: item });
  } catch (error) {
    await t.rollback();
    console.error("Update menu item error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update menu item" });
  }
};

exports.deleteMenuItem = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const item = await MenuItem.findByPk(id, {
      include: {
        association: "MenuCategory",
        include: {
          association: "Menu",
          where: { restaurant_id: req.restaurant.id },
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found or unauthorized",
      });
    }

    item.is_active = false;
    await item.save({ transaction: t });
    await t.commit();

    return res
      .status(200)
      .json({ success: true, message: "Menu item soft deleted" });
  } catch (error) {
    await t.rollback();
    console.error("Soft delete menu item error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete menu item" });
  }
};

exports.toggleSeasonal = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const item = await MenuItem.findByPk(id, {
      include: {
        association: "MenuCategory",
        include: {
          association: "Menu",
          where: { restaurant_id: req.restaurant.id },
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found or unauthorized",
      });
    }

    item.seasonal = !item.seasonal;
    await item.save({ transaction: t });
    await t.commit();

    return res.status(200).json({
      success: true,
      message: `Item is now ${item.seasonal ? "seasonal" : "non-seasonal"}`,
      data: item,
    });
  } catch (error) {
    await t.rollback();
    console.error("Toggle seasonal error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to toggle seasonal flag" });
  }
};

exports.searchMenuItems = async (req, res) => {
  try {
    const { query } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!query || query.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Search query is required" });
    }

    const items = await MenuItem.paginate({
      page,
      paginate: limit,
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
        ],
      },
      include: [
        {
          association: "MenuCategory",
          include: {
            association: "Menu",
            where: { restaurant_id: req.restaurant.id },
          },
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error("Search menu items error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to search menu items" });
  }
};

exports.getSingleMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await MenuItem.findByPk(id, {
      include: {
        association: "MenuCategory",
        include: {
          association: "Menu",
          where: { restaurant_id: req.restaurant.id },
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found or unauthorized",
      });
    }

    return res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error("Get single item error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch menu item" });
  }
};
