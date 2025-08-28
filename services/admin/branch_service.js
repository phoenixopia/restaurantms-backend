"use strict";

const moment = require("moment");
const validator = require("validator");
const throwError = require("../../utils/throwError");
const {
  Branch,
  Restaurant,
  Location,
  ContactInfo,
  User,
  MenuCategory,
  MenuItem,
  sequelize,
} = require("../../models");

const { validateManagerById } = require("../../utils/validateManager");
const { where } = require("sequelize");

const BranchService = {
  async createBranch(restaurantId, payload, userId) {
    const transaction = await sequelize.transaction();
    try {
      const {
        opening_time,
        closing_time,
        name,
        status,
        manager_id,
        main_branch,
        address,
        latitude,
        longitude,
        staff_ids = [],
      } = payload;

      if (!address || !latitude || !longitude) {
        throwError("Address, latitude, and longitude are required", 400);
      }

      const restaurant = await Restaurant.findByPk(restaurantId, {
        transaction,
      });
      if (!restaurant) throwError("Restaurant not found", 403);

      const existingBranch = await Branch.findOne({
        where: {
          restaurant_id: restaurantId,
          name: name.trim(),
        },
        transaction,
      });
      if (existingBranch) {
        throwError(
          `Branch name "${name}" already exists for this restaurant`,
          400
        );
      }

      if (staff_ids.length > 0) {
        const staffUsers = await User.findAll({
          where: {
            id: staff_ids,
            created_by: userId,
          },
          transaction,
        });

        if (staffUsers.length !== staff_ids.length) {
          throwError("Some staff are not created by you", 400);
        }

        const assignedStaff = staffUsers.filter((u) => u.branch_id !== null);
        if (assignedStaff.length > 0) {
          const names = assignedStaff.map((u) => u.full_name).join(", ");
          throwError(`Staff already assigned to another branch: ${names}`, 400);
        }
      }

      const location = await Location.create(
        {
          address,
          latitude,
          longitude,
        },
        { transaction }
      );

      let validatedManagerId = null;
      if (manager_id) {
        const manager = await validateManagerById(
          manager_id,
          userId,
          transaction
        );
        validatedManagerId = manager.id;
      }

      if (main_branch === true) {
        const existingMain = await Branch.findOne({
          where: {
            restaurant_id: restaurantId,
            main_branch: true,
          },
          transaction,
        });
        if (existingMain) {
          throwError("Main branch already exists for this restaurant", 400);
        }
      }

      const branch = await Branch.create(
        {
          restaurant_id: restaurantId,
          location_id: location.id,
          name: name.trim(),
          status,
          manager_id: validatedManagerId,
          main_branch,
          opening_time,
          closing_time,
        },
        { transaction }
      );

      if (staff_ids.length > 0) {
        await User.update(
          { branch_id: branch.id },
          {
            where: { id: staff_ids },
            transaction,
          }
        );
      }

      await transaction.commit();
      return branch;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async updateBranch(user, branchId, updates) {
    const transaction = await sequelize.transaction();
    try {
      const branch = await Branch.findByPk(branchId, { transaction });
      if (!branch) throwError("Branch not found", 404);

      if (user.restaurant_id) {
        if (branch.restaurant_id !== user.restaurant_id) {
          throwError("You are not authorized to update this branch", 403);
        }
      } else if (user.branch_id) {
        if (branch.id !== user.branch_id) {
          throwError("You are not authorized to update this branch", 403);
        }
      } else {
        throwError("User not associated with any restaurant or branch", 403);
      }

      if (updates.name && updates.name !== branch.name) {
        const exists = await Branch.findOne({
          where: {
            restaurant_id: branch.restaurant_id,
            name: updates.name,
          },
          transaction,
        });
        if (exists) throwError("Branch name already exists", 400);
      }

      if (updates.opening_time && updates.closing_time) {
        const opening = moment(updates.opening_time, "HH:mm", true);
        const closing = moment(updates.closing_time, "HH:mm", true);

        if (!opening.isValid() || !closing.isValid()) {
          throwError("Invalid opening or closing time format (use HH:mm)", 400);
        }
      }

      const updatedBranch = await branch.update(updates, { transaction });

      await transaction.commit();
      return updatedBranch;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async deleteBranch(branchId, userId) {
    const transaction = await sequelize.transaction();
    try {
      const branch = await Branch.findByPk(branchId, { transaction });
      if (!branch) throwError("Branch not found", 404);

      const user = await User.findByPk(userId, { transaction });
      if (!user || user.restaurant_id !== branch.restaurant_id) {
        throwError("Access denied", 403);
      }

      await branch.destroy({ transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async getAllBranches({ page = 1, limit = 10, user }) {
    const offset = (page - 1) * limit;
    const where = {};

    if (user.branch_id) {
      where.id = user.branch_id;
    } else if (user.restaurant_id) {
      where.restaurant_id = user.restaurant_id;
    } else {
      throwError("User not associated with any branch or restaurant", 403);
    }

    const { count, rows } = await Branch.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset,
      include: [
        {
          model: Location,
          attributes: ["id", "address", "latitude", "longitude"],
        },
        { model: Restaurant, attributes: ["restaurant_name"] },
        {
          model: User,
          as: "manager",
          attributes: [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
          ],
        },
        {
          model: User,
          as: "assigned_users",
          attributes: [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
          ],
        },
        {
          model: MenuCategory,
          attributes: ["id"],
          include: [{ model: MenuItem, attributes: ["id"] }],
        },
      ],
    });

    const branchIds = rows.map((b) => b.id);
    const contacts = await ContactInfo.findAll({
      where: {
        module_type: "branch",
        module_id: branchIds,
        is_primary: true,
      },
    });

    const data = rows.map((branch) => {
      const totalStaffs = branch.assigned_users.length;
      const totalCategories = branch.MenuCategories.length;
      const totalMenuItems = branch.MenuCategories.reduce(
        (sum, cat) => sum + (cat.MenuItems ? cat.MenuItems.length : 0),
        0
      );

      const primaryContact =
        contacts.find((c) => c.module_id === branch.id) || null;

      return {
        id: branch.id,
        name: branch.name,
        status: branch.status,
        main_branch: branch.main_branch,
        opening_time: branch.opening_time,
        closing_time: branch.closing_time,
        created_at: branch.created_at,
        updated_at: branch.updated_at,
        location: branch.Location
          ? {
              id: branch.Location.id,
              address: branch.Location.address,
              latitude: branch.Location.latitude,
              longitude: branch.Location.longitude,
            }
          : null,
        restaurant_name: branch.Restaurant?.restaurant_name || null,
        manager: branch.manager
          ? {
              id: branch.manager.id,
              first_name: branch.manager.first_name,
              last_name: branch.manager.last_name,
              email: branch.manager.email,
              phone_number: branch.manager.phone_number,
            }
          : null,
        assigned_users: branch.assigned_users.map((u) => ({
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
          phone_number: u.phone_number,
        })),
        total_staffs: totalStaffs,
        total_menu_categories: totalCategories,
        total_menu_items: totalMenuItems,
        primary_contact: primaryContact
          ? { type: primaryContact.type, value: primaryContact.value }
          : null,
      };
    });

    const totalPages = Math.ceil(count / limit);

    return {
      data,
      meta: {
        totalItems: count,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    };
  },

  async getBranchById(branchId, user) {
    const branch = await Branch.findByPk(branchId, {
      include: [
        { model: Location, attributes: ["address"] },
        { model: Restaurant, attributes: ["restaurant_name"] },
        { model: User, as: "assigned_users", attributes: ["id"] },
        {
          model: MenuCategory,
          include: [{ model: MenuItem, attributes: ["id"] }],
        },
      ],
    });

    if (!branch) throwError("Branch not found", 404);

    if (user.restaurant_id && branch.restaurant_id !== user.restaurant_id) {
      throwError("You are not authorized to view this branch", 403);
    } else if (user.branch_id && branch.id !== user.branch_id) {
      throwError("You are not authorized to view this branch", 403);
    } else if (!user.restaurant_id && !user.branch_id) {
      throwError("User not associated with any restaurant or branch", 403);
    }

    const contacts = await ContactInfo.findAll({
      where: {
        module_type: "branch",
        module_id: branch.id,
      },
      attributes: ["id", "type", "value", "is_primary"],
    });

    const totalStaffs = branch.assigned_users.length;
    const totalCategories = branch.MenuCategories.length;
    const totalMenuItems = branch.MenuCategories.reduce(
      (sum, cat) => sum + (cat.MenuItems ? cat.MenuItems.length : 0),
      0
    );

    return {
      id: branch.id,
      name: branch.name,
      status: branch.status,
      main_branch: branch.main_branch,
      opening_time: branch.opening_time,
      closing_time: branch.closing_time,
      created_at: branch.created_at,
      updated_at: branch.updated_at,
      location: branch.Location?.address || null,
      restaurant_name: branch.Restaurant?.restaurant_name || null,
      total_staffs: totalStaffs,
      total_menu_categories: totalCategories,
      total_menu_items: totalMenuItems,
      contacts: contacts.map((c) => ({
        id: c.id,
        type: c.type,
        value: c.value,
        is_primary: c.is_primary,
      })),
    };
  },

  async toggleBranchStatus(branchId, updates, user) {
    const transaction = await sequelize.transaction();
    try {
      const branch = await Branch.findByPk(branchId, { transaction });
      if (!branch) throwError("Branch not found", 404);

      if (user.restaurant_id) {
        if (branch.restaurant_id !== user.restaurant_id) {
          throwError("You are not authorized to update this branch", 403);
        }
      } else if (user.branch_id) {
        if (branch.id !== user.branch_id) {
          throwError("You are not authorized to update this branch", 403);
        }
      } else {
        throwError("User not associated with any restaurant or branch", 403);
      }

      if (
        !updates.status ||
        !["active", "inactive", "under_maintenance"].includes(updates.status)
      ) {
        throwError("Invalid status value", 400);
      }

      const updatedBranch = await branch.update(
        { status: updates.status },
        { transaction }
      );

      await transaction.commit();
      return updatedBranch;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async changeLocation(user, branchId, body) {
    const transaction = await sequelize.transaction();
    try {
      const branch = await Branch.findByPk(branchId, { transaction });
      if (!branch) throwError("Branch not found", 404);

      if (user.restaurant_id && branch.restaurant_id !== user.restaurant_id) {
        throwError("You are not authorized to update this branch", 403);
      } else if (user.branch_id && branch.id !== user.branch_id) {
        throwError("You are not authorized to update this branch", 403);
      } else if (!user.restaurant_id && !user.branch_id) {
        throwError("User not associated with any restaurant or branch", 403);
      }

      const location = await Location.findByPk(branch.location_id, {
        transaction,
      });
      if (!location) throwError("Location not found", 404);

      const { address, latitude, longitude } = body;
      if (address !== undefined) location.address = address;
      if (latitude !== undefined) location.latitude = latitude;
      if (longitude !== undefined) location.longitude = longitude;

      await location.save({ transaction });
      await transaction.commit();

      return location;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async setDefault(user, branchId) {
    const transaction = await sequelize.transaction();
    try {
      const branch = await Branch.findByPk(branchId, { transaction });
      if (!branch) throwError("Branch not found", 404);

      let restaurantId;

      if (user.restaurant_id) {
        restaurantId = user.restaurant_id;
      } else {
        throwError("User not associated with any restaurant", 403);
      }

      if (branch.restaurant_id !== restaurantId) {
        throwError(
          "You are not authorized to set default for this branch",
          403
        );
      }

      await Branch.update(
        { main_branch: false },
        { where: { restaurant_id: restaurantId }, transaction }
      );

      await branch.update({ main_branch: true }, { transaction });
      await transaction.commit();
      return branch;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};

module.exports = BranchService;
