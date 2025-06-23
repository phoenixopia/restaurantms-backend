"use strict";

const path = require("path");
const fs = require("fs");
const { MenuCategory, Menu, Branch, sequelize } = require("../../models");
const { Op } = require("sequelize");

const SERVER_URL = process.env.SERVER_URL || "http://127.0.0.1:8000";
const UPLOADS_DIR = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "menu-categories"
);

const getFileUrl = (filename) =>
  filename
    ? `${SERVER_URL}/uploads/menu-categories/${encodeURIComponent(filename)}`
    : null;
const getFilePath = (filename) => path.join(UPLOADS_DIR, filename);

exports.createMenuCategory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { branch_name, name, description, sort_order, is_active } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const menu = await Menu.findOne({
      where: {
        restaurant_id: req.restaurant.id,
      },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found for your restaurant",
      });
    }

    let branchId = null;

    if (branch_name) {
      const branch = await Branch.findOne({
        where: {
          name: branch_name,
          restaurant_id: req.restaurant.id,
        },
      });

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found under your restaurant",
        });
      }

      branchId = branch.id;
    }

    const image = req.file ? req.file.filename : null;

    const category = await MenuCategory.create(
      {
        menu_id: menu.id,
        branch_id: branchId,
        name,
        description,
        image: getFileUrl(image),
        sort_order,
        is_active: is_active !== undefined ? is_active : true,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({
      success: true,
      message: "Menu category created successfully",
      data: category,
    });
  } catch (error) {
    await t.rollback();
    console.error("Create category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create menu category",
    });
  }
};

// user side
exports.listActiveMenuCategories = async (req, res) => {
  try {
    const { branchId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const menu = await Menu.findOne({
      where: {
        restaurant_id: req.restaurant.id,
        is_active: true,
      },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found for your restaurant",
      });
    }

    const filters = {
      is_active: true,
      menu_id: menu.id,
    };

    if (branchId) {
      filters.branch_id = branchId;
    }

    const categories = await MenuCategory.paginate({
      page,
      paginate: limit,
      where: filters,
      order: [["sort_order", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Menu categories fetched for user",
      data: categories,
    });
  } catch (error) {
    console.error("User category list error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

// for admin and staff side
exports.listMenuCategories = async (req, res) => {
  try {
    const { branchId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const menu = await Menu.findOne({
      where: {
        restaurant_id: req.restaurant.id,
      },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found for your restaurant",
      });
    }

    const filters = {
      menu_id: menu.id,
    };

    if (branchId) {
      filters.branch_id = branchId;
    }

    const categories = await MenuCategory.paginate({
      page,
      paginate: limit,
      where: filters,
      include: [
        {
          association: "Menu",
          required: true,
          where: {
            restaurant_id: req.restaurant.id,
          },
        },
      ],
      order: [["sort_order", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Menu categories listed successfully",
      data: categories,
    });
  } catch (error) {
    console.error("List categories error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list menu categories",
    });
  }
};

exports.searchMenuCategories = async (req, res) => {
  try {
    const { query } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const categories = await MenuCategory.paginate({
      page,
      paginate: limit,
      include: [
        {
          association: "Menu",
          required: true,
          where: {
            restaurant_id: req.restaurant.id,
          },
        },
      ],
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
        ],
      },
      order: [["sort_order", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Menu categories search successful",
      data: categories,
    });
  } catch (error) {
    console.error("Search menu categories error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search menu categories",
    });
  }
};

exports.updateMenuCategory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { name, description, sort_order, is_active } = req.body;

    const category = await MenuCategory.findByPk(id, {
      include: [
        {
          association: "Menu",
          required: true,
          where: { restaurant_id: req.restaurant.id },
        },
      ],
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message:
          "Menu category not found or does not belong to your restaurant",
      });
    }

    if (req.file) {
      const oldImageFilename = category.image?.split(
        "/uploads/menu-categories/"
      )[1];
      if (oldImageFilename) {
        const oldPath = getFilePath(oldImageFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      category.image = getFileUrl(req.file.filename);
    }

    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (sort_order !== undefined) category.sort_order = sort_order;
    if (is_active !== undefined) category.is_active = is_active;

    await category.save({ transaction: t });
    await t.commit();

    return res.status(200).json({
      success: true,
      message: "Menu category updated successfully",
      data: category,
    });
  } catch (error) {
    await t.rollback();
    console.error("Update menu category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update menu category",
    });
  }
};

exports.deleteMenuCategory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const category = await MenuCategory.findByPk(id, {
      include: [
        {
          association: "Menu",
          required: true,
          where: { restaurant_id: req.restaurant.id },
        },
      ],
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message:
          "Menu category not found or does not belong to your restaurant",
      });
    }

    category.is_active = false;
    await category.save({ transaction: t });
    await t.commit();

    return res.status(200).json({
      success: true,
      message: "Menu category soft deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    console.error("Soft delete category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete menu category",
    });
  }
};

exports.toggleMenuCategoryActivation = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const category = await MenuCategory.findByPk(id, {
      include: [
        {
          association: "Menu",
          required: true,
          where: { restaurant_id: req.restaurant.id },
        },
      ],
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Menu category not found or unauthorized",
      });
    }

    category.is_active = !category.is_active;
    await category.save({ transaction: t });
    await t.commit();

    return res.status(200).json({
      success: true,
      message: `Menu category is now ${
        category.is_active ? "active" : "inactive"
      }`,
      data: category,
    });
  } catch (error) {
    await t.rollback();
    console.error("Toggle category activation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle menu category status",
    });
  }
};
