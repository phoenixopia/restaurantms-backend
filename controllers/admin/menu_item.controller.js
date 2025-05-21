const { MenuItem, MenuCategory } = require("../../../models");
const { v4: uuidv4 } = require("uuid");
const { sequelize } = require("../../../models");

module.exports = {
  // Create a menu item
  async createMenuItem(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const {
        menu_category_id,
        name,
        description,
        unit_price,
        image_url,
        seasonal,
      } = req.body;

      // Ensure the category exists
      const category = await MenuCategory.findByPk(menu_category_id);
      if (!category) {
        return res.status(404).json({ message: "Menu category not found" });
      }

      const newItem = await MenuItem.create(
        {
          id: uuidv4(),
          menu_category_id,
          name,
          description,
          unit_price,
          image_url,
          seasonal,
        },
        { transaction }
      );

      await transaction.commit();
      res.status(201).json(newItem);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      res.status(500).json({ message: "Failed to create menu item" });
    }
  },

  // Get all menu items
  async getAllMenuItems(req, res) {
    try {
      const items = await MenuItem.findAll();
      res.status(200).json(items);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  },

  // Get all items by category
  async getMenuItemsByCategory(req, res) {
    try {
      const { menu_category_id } = req.params;

      const items = await MenuItem.findAll({
        where: { menu_category_id },
      });

      res.status(200).json(items);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch items by category" });
    }
  },

  // Get a single item by ID
  async getMenuItemById(req, res) {
    try {
      const { id } = req.params;
      const item = await MenuItem.findByPk(id);
      if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.status(200).json(item);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch menu item" });
    }
  },

  // Update a menu item
  async updateMenuItem(req, res) {
    try {
      const { id } = req.params;
      const updated = await MenuItem.update(req.body, {
        where: { id },
        returning: true,
      });

      if (updated[0] === 0) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      res.status(200).json(updated[1][0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update menu item" });
    }
  },

  // Delete a menu item
  async deleteMenuItem(req, res) {
    try {
      const { id } = req.params;
      const deleted = await MenuItem.destroy({ where: { id } });

      if (!deleted) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      res.status(200).json({ message: "Menu item deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  },
};
