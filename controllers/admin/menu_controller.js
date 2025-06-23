const { Menu, sequelize } = require("../../models");
const { Op } = require("sequelize");

// list active menus under a restaurant for users
exports.getActiveMenus = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const menu = await Menu.findOne({
      where: {
        restaurant_id: restaurantId,
        is_active: true,
      },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "No active menu found for this restaurant.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Active menu retrieved successfully",
      data: menu,
    });
  } catch (error) {
    console.error("Error retrieving active menu:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve active menu",
    });
  }
};

// create menu for restaurant admin plus stuff with create menu permission
exports.createMenu = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, description, is_active } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Menu name is required",
      });
    }

    const existingMenu = await Menu.findOne({
      where: { restaurant_id: req.restaurant.id },
    });

    if (existingMenu) {
      return res.status(400).json({
        success: false,
        message: "A menu already exists for this restaurant",
      });
    }

    const menu = await Menu.create(
      {
        name,
        description,
        is_active: is_active !== undefined ? is_active : true,
        restaurant_id: req.restaurant.id,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({
      success: true,
      message: "Menu created successfully",
      data: menu,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error creating menu:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create menu",
    });
  }
};

// for admins and staffs
exports.listMenus = async (req, res) => {
  try {
    const menu = await Menu.findOne({
      where: { restaurant_id: req.restaurant.id },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "No menu found for this restaurant.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Menu retrieved successfully.",
      data: menu,
    });
  } catch (error) {
    console.error("List menu error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve menu",
    });
  }
};

exports.getMenuById = async (req, res) => {
  try {
    const { id } = req.params;

    const menu = await Menu.findOne({
      where: { id, restaurant_id: req.restaurant.id },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Menu fetched successfully.",
      data: menu,
    });
  } catch (error) {
    console.error("Get Menu by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch menu.",
    });
  }
};

exports.updateMenu = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    const menu = await Menu.findOne({
      where: { id, restaurant_id: req.restaurant.id },
    });

    if (!menu) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Menu not found.",
      });
    }

    if (name !== undefined) menu.name = name;
    if (description !== undefined) menu.description = description;
    if (is_active !== undefined) menu.is_active = is_active;

    await menu.save({ transaction: t });
    await t.commit();

    return res.status(200).json({
      success: true,
      message: "Menu updated successfully.",
      data: menu,
    });
  } catch (error) {
    await t.rollback();
    console.error("Update Menu error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update menu.",
    });
  }
};

exports.deleteMenu = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const menu = await Menu.findOne({
      where: { id, restaurant_id: req.restaurant.id },
    });

    if (!menu) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Menu not found.",
      });
    }
    menu.is_active = false;
    await menu.save({ transaction: t });
    await t.commit();

    return res.status(200).json({
      success: true,
      message: "Menu soft deleted successfully.",
    });
  } catch (error) {
    await t.rollback();
    console.error("Delete Menu error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete menu.",
    });
  }
};

exports.toggleMenuActivation = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const menu = await Menu.findOne({
      where: { id, restaurant_id: req.restaurant.id },
    });

    if (!menu) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Menu not found.",
      });
    }

    menu.is_active = !menu.is_active;
    await menu.save({ transaction: t });
    await t.commit();

    return res.status(200).json({
      success: true,
      message: `Menu is now ${menu.is_active ? "active" : "inactive"}.`,
      data: menu,
    });
  } catch (error) {
    await t.rollback();
    console.error("Toggle Menu error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle menu status.",
    });
  }
};
