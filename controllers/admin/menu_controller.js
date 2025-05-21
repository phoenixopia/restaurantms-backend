const {
  sequelize,
  Menu,
  Restaurant,
  RestaurantMenu,
  MenuCategory,
  MenuItem,
} = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  async createMenu(req, res) {
    const t = await sequelize.transaction();
    try {
      const { name, description, is_active, restaurant_id } = req.body;

      if (!restaurant_id) {
        return res.status(400).json({ message: "restaurant_id is required" });
      }

      const restaurant = await Restaurant.findByPk(restaurant_id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const menu = await Menu.create(
        {
          id: uuidv4(),
          name,
          description,
          is_active,
        },
        { transaction: t }
      );

      await RestaurantMenu.create(
        {
          id: uuidv4(),
          restaurant_id,
          menu_id: menu.id,
        },
        { transaction: t }
      );

      await t.commit();

      res
        .status(201)
        .json({ message: "Menu created and linked successfully", menu });
    } catch (error) {
      await t.rollback();
      console.error("Create Menu Error:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  },

  async getMenusByRestaurant(req, res) {
    try {
      const { restaurant_id } = req.query;

      if (!restaurant_id) {
        return res.status(400).json({ message: "restaurant_id is required" });
      }

      const restaurant = await Restaurant.findByPk(restaurant_id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const menus = await Menu.findAll({
        include: [
          {
            model: Restaurant,
            where: { id: restaurant_id },
            attributes: ["id", "name"],
            through: { attributes: [] },
          },
        ],
      });

      res.status(200).json(menus);
    } catch (error) {
      console.error("Get Menus Error:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  },

  // Get a single menu by ID
  async getMenuById(req, res) {
    try {
      const { id } = req.params;

      const menu = await Menu.findByPk(id, {
        include: [
          { model: MenuCategory },
          { model: MenuItem },
          { model: Restaurant, through: { attributes: [] } },
        ],
      });

      if (!menu) {
        return res.status(404).json({ message: "Menu not found" });
      }

      res.status(200).json(menu);
    } catch (error) {
      console.error("Get Menu By ID Error:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  },

  async updateMenu(req, res) {
    try {
      const { id } = req.params;
      const { name, description, is_active } = req.body;

      const menu = await Menu.findByPk(id);
      if (!menu) {
        return res.status(404).json({ message: "Menu not found" });
      }

      await menu.update({ name, description, is_active });

      res.status(200).json({ message: "Menu updated successfully", menu });
    } catch (error) {
      console.error("Update Menu Error:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  },

  // Delete menu and its restaurant association in a transaction
  async deleteMenu(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;

      const menu = await Menu.findByPk(id, { transaction: t });
      if (!menu) {
        await t.rollback();
        return res.status(404).json({ message: "Menu not found" });
      }

      // Delete associated restaurant link
      await RestaurantMenu.destroy({
        where: { menu_id: id },
        transaction: t,
      });

      await menu.destroy({ transaction: t });

      await t.commit();
      res.status(200).json({ message: "Menu and link deleted successfully" });
    } catch (error) {
      await t.rollback();
      console.error("Delete Menu Error:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  },
};
