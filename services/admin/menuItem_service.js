"use strict";
const fs = require("fs").promises;

const path = require("path");
const {
  MenuItem,
  MenuCategory,
  Branch,
  Restaurant,
  UploadedFile,
  sequelize,
} = require("../../models");
const { Op } = require("sequelize");
const throwError = require("../../utils/throwError");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");
const { getFileUrl, getFilePath } = require("../../utils/file");
const UPLOAD_FOLDER = "menu-items";

const MenuItemService = {
  async createMenuItem(data, user) {
    const t = await sequelize.transaction();
    try {
      const category = await MenuCategory.findByPk(data.menu_category_id, {
        transaction: t,
      });
      if (!category) throwError("Menu category not found", 404);

      if (user.restaurant_id) {
        if (category.restaurant_id !== user.restaurant_id) {
          throwError("Not authorized to create item in this category", 403);
        }
      } else if (user.branch_id) {
        if (category.branch_id !== user.branch_id) {
          throwError("Not authorized to create item in this category", 403);
        }
      } else {
        throwError("User must belong to a restaurant or branch", 400);
      }

      const item = await MenuItem.create(
        {
          menu_category_id: category.id,
          name: data.name,
          description: data.description,
          unit_price: data.unit_price,
          seasonal: data.seasonal ?? false,
          is_active: data.is_active ?? true,
        },
        { transaction: t }
      );

      await t.commit();
      return item;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async listMenuItemsWithRestaurant(query, user) {
    const {
      page = 1,
      limit = 10,
      search = "",
      menu_category_id,
      branch_id: queryBranchId,
    } = query;

    const offset = (page - 1) * limit;

    const whereClause = {};

    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    if (menu_category_id) {
      whereClause.menu_category_id = menu_category_id;
    }

    const include = [
      {
        model: MenuCategory,

        include: [
          {
            model: Branch,
            attributes: ["id", "name"],
          },
          {
            model: Restaurant,
            attributes: ["id", "restaurant_name"],
          },
        ],
      },
    ];

    if (user.branch_id) {
      include[0].where = { branch_id: user.branch_id };
    } else if (user.restaurant_id) {
      if (queryBranchId) {
        include[0].where = { branch_id: queryBranchId };
      }

      include[0].where = {
        ...(include[0].where || {}),
        restaurant_id: user.restaurant_id,
      };
    }

    const { rows, count } = await MenuItem.findAndCountAll({
      where: whereClause,
      include,
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    const totalPages = Math.ceil(count / limit);

    return {
      items: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
      },
    };
  },

  async deleteMenuItem(itemId, user) {
    const t = await sequelize.transaction();
    let filePath = null;

    try {
      const item = await MenuItem.findByPk(itemId, {
        include: [{ model: MenuCategory }],
        transaction: t,
      });

      if (!item) throwError("Menu item not found", 404);

      const category = item.MenuCategory;
      if (!category) throwError("Menu category not found for this item", 400);

      if (user.restaurant_id && category.restaurant_id !== user.restaurant_id)
        throwError("Not authorized to delete this menu item", 403);
      if (user.branch_id && category.branch_id !== user.branch_id)
        throwError("Not authorized to delete this menu item", 403);
      if (!user.restaurant_id && !user.branch_id)
        throwError("User must belong to a restaurant or branch", 400);

      // Find the uploaded file
      const uploadedFile = await UploadedFile.findOne({
        where: { reference_id: item.id, type: "menu-item" },
        transaction: t,
      });

      if (uploadedFile) {
        filePath = path.join(process.cwd(), "uploads", uploadedFile.path);

        try {
          await fs.access(filePath);
          await fs.unlink(filePath); // delete the file from disk
        } catch (err) {
          // skip if the file doesn't exist
        }

        await uploadedFile.destroy({ transaction: t }); // delete the DB record
      }

      await item.destroy({ transaction: t }); // delete menu item
      await t.commit();

      return true;
    } catch (err) {
      await t.rollback();

      // If the file was partially created, clean it up
      if (filePath) {
        try {
          await fs.unlink(filePath);
        } catch (e) {
          // ignore if already deleted
        }
      }

      throw err;
    }
  },

  async toggleSeasonal(itemId, user) {
    const t = await sequelize.transaction();
    try {
      const item = await MenuItem.findByPk(itemId, {
        include: [{ model: MenuCategory }],
        transaction: t,
      });

      if (!item) throwError("Menu item not found", 404);

      const category = item.MenuCategory;
      if (!category) throwError("Menu category not found for this item", 400);

      if (user.restaurant_id) {
        if (category.restaurant_id !== user.restaurant_id) {
          throwError(
            "Not authorized to toggle seasonal on this menu item",
            403
          );
        }
      } else if (user.branch_id) {
        if (category.branch_id !== user.branch_id) {
          throwError(
            "Not authorized to toggle seasonal on this menu item",
            403
          );
        }
      } else {
        throwError("User must belong to a restaurant or branch", 400);
      }

      item.seasonal = !item.seasonal;
      await item.save({ transaction: t });

      await t.commit();
      return item;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async getSingleMenuItem(itemId, user) {
    const item = await MenuItem.findByPk(itemId, {
      include: [
        {
          model: MenuCategory,

          include: [
            { model: Branch, attributes: ["id", "name"] },
            { model: Restaurant, attributes: ["id", "restaurant_name"] },
          ],
        },
      ],
    });

    if (!item) throwError("Menu item not found", 404);

    const category = item.MenuCategory;
    if (!category) throwError("Menu category not found for this item", 400);

    if (user.restaurant_id) {
      if (category.restaurant_id !== user.restaurant_id) {
        throwError("Not authorized to view this menu item", 403);
      }
    } else if (user.branch_id) {
      if (category.branch_id !== user.branch_id) {
        throwError("Not authorized to view this menu item", 403);
      }
    } else {
      throwError("User must belong to a restaurant or branch", 400);
    }

    return item;
  },

  async toggleActivation(itemId, user) {
    const t = await sequelize.transaction();
    try {
      const item = await MenuItem.findByPk(itemId, {
        include: [{ model: MenuCategory }],
        transaction: t,
      });

      if (!item) throwError("Menu item not found", 404);

      const category = item.MenuCategory;
      if (!category) throwError("Menu category not found for this item", 400);

      if (user.restaurant_id) {
        if (category.restaurant_id !== user.restaurant_id) {
          throwError(
            "Not authorized to toggle activation on this menu item",
            403
          );
        }
      } else if (user.branch_id) {
        if (category.branch_id !== user.branch_id) {
          throwError(
            "Not authorized to toggle activation on this menu item",
            403
          );
        }
      } else {
        throwError("User must belong to a restaurant or branch", 400);
      }

      item.is_active = !item.is_active;
      await item.save({ transaction: t });

      await t.commit();
      return item;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async uploadImage(file, itemId, user) {
    const t = await sequelize.transaction();
    let oldFilePath = null;

    try {
      if (!file) throwError("No image file uploaded", 400);

      const menuItem = await MenuItem.findByPk(itemId, {
        include: [{ model: MenuCategory }],
        transaction: t,
      });

      if (!menuItem) {
        await cleanupUploadedFiles([
          { path: getFilePath(UPLOAD_FOLDER, file.filename) },
        ]);
        throwError("Menu item not found", 404);
      }

      const category = menuItem.MenuCategory;
      if (!category) throwError("Menu category not found for this item", 400);

      if (user.restaurant_id && category.restaurant_id !== user.restaurant_id)
        throwError("Not authorized", 403);
      if (user.branch_id && category.branch_id !== user.branch_id)
        throwError("Not authorized", 403);
      if (!user.restaurant_id && !user.branch_id)
        throwError("User must belong to a restaurant or branch", 400);

      const uploadDir = path.join(process.cwd(), "uploads", UPLOAD_FOLDER);
      await fs.mkdir(uploadDir, { recursive: true });

      let uploadedFile = await UploadedFile.findOne({
        where: { reference_id: menuItem.id, type: "menu-item" },
        transaction: t,
      });

      const relativePath = path.join(UPLOAD_FOLDER, file.filename);

      if (uploadedFile && uploadedFile.path) {
        oldFilePath = path.join(process.cwd(), "uploads", uploadedFile.path);
        try {
          await fs.access(oldFilePath);
          await fs.unlink(oldFilePath);
        } catch (err) {
          // skip if old file doesn’t exist
        }

        uploadedFile.path = relativePath;
        uploadedFile.size_mb = +(file.size / (1024 * 1024)).toFixed(2);
        uploadedFile.uploaded_by = user.id;
        await uploadedFile.save({ transaction: t });
      } else {
        uploadedFile = await UploadedFile.create(
          {
            restaurant_id: category.restaurant_id,
            path: relativePath,
            size_mb: +(file.size / (1024 * 1024)).toFixed(2),
            uploaded_by: user.id,
            type: "menu-item",
            reference_id: menuItem.id,
          },
          { transaction: t }
        );
      }

      menuItem.image = getFileUrl(UPLOAD_FOLDER, file.filename);
      await menuItem.save({ transaction: t });

      await t.commit();

      return {
        ...menuItem.toJSON(),
        image_url: menuItem.image_url,
      };
    } catch (err) {
      await t.rollback();

      if (file) {
        const newFilePath = getFilePath(UPLOAD_FOLDER, file.filename);
        await cleanupUploadedFiles([{ path: newFilePath }]);
      }

      throw err;
    }
  },

  async updateMenuItem(itemId, user, data) {
    const t = await sequelize.transaction();
    try {
      const item = await MenuItem.findByPk(itemId, {
        include: [{ model: MenuCategory }],
        transaction: t,
      });

      if (!item) throwError("Menu item not found", 404);

      const category = item.MenuCategory;
      if (!category) throwError("Menu category not found for this item", 400);

      // Authorization
      if (user.restaurant_id && category.restaurant_id !== user.restaurant_id)
        throwError("Not authorized to update this menu item", 403);
      if (user.branch_id && category.branch_id !== user.branch_id)
        throwError("Not authorized to update this menu item", 403);
      if (!user.restaurant_id && !user.branch_id)
        throwError("User must belong to a restaurant or branch", 400);

      // Check for uniqueness of name within the same branch
      if (data.name) {
        const existingItem = await MenuItem.findOne({
          where: {
            name: data.name,
            menu_category_id: category.id, // same category = same branch implicitly
            id: { [sequelize.Op.ne]: item.id }, // exclude current item
          },
          transaction: t,
        });

        if (existingItem) {
          throwError(
            "Menu item with this name already exists in the branch",
            400
          );
        }
      }

      // Update fields (without touching the image)
      item.name = data.name ?? item.name;
      item.description = data.description ?? item.description;
      item.unit_price = data.unit_price ?? item.unit_price;
      item.seasonal = data.seasonal ?? item.seasonal;
      item.is_active = data.is_active ?? item.is_active;

      await item.save({ transaction: t });
      await t.commit();

      return item;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};

module.exports = MenuItemService;
