const {
  sequelize,
  MenuCategory,
  Menu,
  Branch,
  MenuItem,
} = require("../../models/index");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  async createCategory(req, res) {
    const t = await sequelize.transaction();
    try {
      const { branch_id, menu_id, name, description, sort_order, is_active } =
        req.body;

      const menu = await Menu.findByPk(menu_id);
      const branch = await Branch.findByPk(branch_id);
      if (!menu || !branch) {
        return res.status(404).json({ message: "Menu or Branch not found" });
      }

      const category = await MenuCategory.create(
        {
          id: uuidv4(),
          branch_id,
          menu_id,
          name,
          description,
          sort_order,
          is_active,
        },
        { transaction: t }
      );

      await t.commit();
      res
        .status(201)
        .json({ message: "Category created successfully", category });
    } catch (error) {
      await t.rollback();
      console.error("Create Category Error:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  },

  async getAllCategories(req, res) {
    try {
      const { menu_id, branch_id } = req.query;

      const where = {};
      if (menu_id) where.menu_id = menu_id;
      if (branch_id) where.branch_id = branch_id;

      const categories = await MenuCategory.findAll({
        where,
        include: [
          { model: Menu, attributes: ["id", "name"] },
          { model: Branch, attributes: ["id", "name"] },
        ],
        order: [["sort_order", "ASC"]],
      });

      res.status(200).json(categories);
    } catch (error) {
      console.error("Get Categories Error:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  },

  async getCategoriesByBranch(req, res) {
    try {
      const { branch_id } = req.params;

      const branch = await Branch.findByPk(branch_id);
      if (!branch) {
        return res.status(404).json({ message: "Branch not found" });
      }

      const categories = await MenuCategory.findAll({
        where: { branch_id },
        include: [
          { model: Menu, attributes: ["id", "name"] },
          { model: MenuItem },
        ],
        order: [["sort_order", "ASC"]],
      });

      res.status(200).json(categories);
    } catch (error) {
      console.error("Get Categories By Branch Error:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  },

  async getCategoryById(req, res) {
    try {
      const { id } = req.params;

      const category = await MenuCategory.findByPk(id, {
        include: [
          { model: Menu, attributes: ["id", "name"] },
          { model: Branch, attributes: ["id", "name"] },
          { model: MenuItem },
        ],
      });

      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.status(200).json(category);
    } catch (error) {
      console.error("Get Category By ID Error:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  },

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description, sort_order, is_active } = req.body;

      const category = await MenuCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      await category.update({ name, description, sort_order, is_active });

      res
        .status(200)
        .json({ message: "Category updated successfully", category });
    } catch (error) {
      console.error("Update Category Error:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  },

  async deleteCategory(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;

      const category = await MenuCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      await MenuItem.destroy({
        where: { menu_category_id: id },
        transaction: t,
      });
      await category.destroy({ transaction: t });

      await t.commit();
      res
        .status(200)
        .json({ message: "Category and its items deleted successfully" });
    } catch (error) {
      await t.rollback();
      console.error("Delete Category Error:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  },
};
