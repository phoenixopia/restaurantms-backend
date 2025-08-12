"use strict";

const { Op, fn, col, literal, QueryTypes, where } = require("sequelize");
const throwError = require("../../utils/throwError");
const { ContactInfo, Restaurant, Branch, sequelize } = require("../../models");

const ContactInfoService = {
  async addContactInfo(user, data) {
    const { module_type, module_id, type, value, is_primary = false } = data;
    let restaurant_id = null;

    if (user.restaurant_id) {
      restaurant_id = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      restaurant_id = branch.restaurant_id;
    } else {
      throwError("User does not belong to a restaurant or branch");
    }

    if (is_primary) {
      const existingPrimary = await ContactInfo.findOne({
        where: {
          restaurant_id,
          module_type,
          module_id,
          is_primary: true,
        },
      });

      if (existingPrimary) {
        throw new Error(
          `There is already a primary contact for this ${module_type}. Only one primary contact is allowed.`
        );
      }
    }

    const contactInfo = await ContactInfo.create({
      restaurant_id,
      module_type,
      module_id,
      type,
      value,
      is_primary,
    });

    return contactInfo;
  },

  async getAllContactInfo(user, filters) {
    const { module_type, search_value, page, limit } = filters;
    const offset = (page - 1) * limit;

    let where = {};

    if (user.restaurant_id) {
      where.restaurant_id = user.restaurant_id;

      if (module_type) {
        where.module_type = module_type;
      }
      if (search_value) {
        where.value = {
          [Op.iLike]: `%${search_value}%`,
        };
      }
    } else if (user.branch_id) {
      where = {
        module_type: "branch",
        module_id: user.branch_id,
      };
    } else {
      throwError("User does not belong to a restaurant or branch", 404);
    }

    const { count, rows } = await ContactInfo.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      offset,
      limit,
      include: [
        {
          model: Restaurant,
          attributes: ["id", "restaurant_name"],
          required: false,
          where: { id: sequelize.col("ContactInfo.module_id") },
        },
        {
          model: Branch,
          attributes: ["id", "name"],
          required: false,
          where: { id: sequelize.col("ContactInfo.module_id") },
        },
      ],
    });

    return {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: rows,
    };
  },

  async getContactInfoById(user, id) {
    const contactInfo = await ContactInfo.findByPk(id, {
      include: [
        {
          model: Restaurant,
          attributes: ["id", "restaurant_name"],
          required: false,
          where: sequelize.literal(
            `"ContactInfo"."module_type" = 'restaurant' AND "ContactInfo"."module_id" = "restaurant"."id"`
          ),
        },
        {
          model: Branch,
          attributes: ["id", "name", "restaurant_id"],
          required: false,
          where: sequelize.literal(
            `"ContactInfo"."module_type" = 'branch' AND "ContactInfo"."module_id" = "branch"."id"`
          ),
        },
      ],
    });

    if (!contactInfo) {
      throwError("Contact info not found", 404);
    }

    let restaurant_id = null;

    if (user.restaurant_id) {
      restaurant_id = user.restaurant_id;
    } else if (user.branch_id) {
      if (!contactInfo.Branch) {
        throwError("Branch info not found", 404);
      }
      restaurant_id = contactInfo.Branch.restaurant_id;
    } else {
      throwError("User does not belong to a restaurant or branch", 403);
    }

    if (contactInfo.restaurant_id !== restaurant_id) {
      throwError("Not authorized to access this contact info", 403);
    }

    if (user.branch_id) {
      if (
        contactInfo.module_type !== "branch" ||
        contactInfo.module_id !== user.branch_id
      ) {
        throwError("Not authorized to access this contact info", 403);
      }
    }

    return contactInfo;
  },

  async updateContactInfo(user, id, data) {
    const transaction = await sequelize.transaction();
    try {
      const contactInfo = await ContactInfo.findByPk(id, { transaction });
      if (!contactInfo) {
        throwError("Contact info not found", 404);
      }

      let restaurant_id = null;

      if (user.restaurant_id) {
        restaurant_id = user.restaurant_id;
      } else if (user.branch_id) {
        const branch = await Branch.findByPk(user.branch_id, { transaction });
        if (!branch) {
          throwError("Branch not found", 404);
        }
        restaurant_id = branch.restaurant_id;
      } else {
        throwError("User does not belong to a restaurant or branch", 403);
      }

      if (contactInfo.restaurant_id !== restaurant_id) {
        throwError("Not authorized to update this contact info", 403);
      }

      if (user.branch_id) {
        if (
          contactInfo.module_type !== "branch" ||
          contactInfo.module_id !== user.branch_id
        ) {
          throwError("Not authorized to update this contact info", 403);
        }
      }

      if (data.is_primary === true && !contactInfo.is_primary) {
        const existingPrimary = await ContactInfo.findOne({
          where: {
            restaurant_id,
            module_type: contactInfo.module_type,
            module_id: contactInfo.module_id,
            is_primary: true,
            id: { [Op.ne]: id },
          },
          transaction,
        });

        if (existingPrimary) {
          throwError(
            `There is already a primary contact for this ${contactInfo.module_type}. Only one primary contact is allowed.`,
            400
          );
        }
      }

      const allowedFields = ["type", "value", "is_primary"];
      allowedFields.forEach((field) => {
        if (data[field] !== undefined) {
          contactInfo[field] = data[field];
        }
      });

      await contactInfo.save({ transaction });

      await transaction.commit();
      return contactInfo;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async deleteContactInfo(user, id) {
    const transaction = await sequelize.transaction();
    try {
      const contactInfo = await ContactInfo.findByPk(id, {
        include: [
          {
            model: Branch,
            attributes: ["id", "restaurant_id"],
            required: false,
            where: sequelize.literal(
              `"ContactInfo"."module_type" = 'branch' AND "ContactInfo"."module_id" = "branch"."id"`
            ),
          },
        ],
        transaction,
      });

      if (!contactInfo) {
        throwError("Contact info not found", 404);
      }

      let restaurant_id = null;

      if (user.restaurant_id) {
        restaurant_id = user.restaurant_id;
      } else if (user.branch_id) {
        if (!contactInfo.Branch) {
          throwError("Branch info not found", 404);
        }
        restaurant_id = contactInfo.Branch.restaurant_id;
      } else {
        throwError("User does not belong to a restaurant or branch", 403);
      }

      if (contactInfo.restaurant_id !== restaurant_id) {
        throwError("Not authorized to delete this contact info", 403);
      }

      if (user.branch_id) {
        if (
          contactInfo.module_type !== "branch" ||
          contactInfo.module_id !== user.branch_id
        ) {
          throwError("Not authorized to delete this contact info", 403);
        }
      }

      await contactInfo.destroy({ transaction });

      await transaction.commit();
      return { message: "Contact info deleted successfully" };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async setPrimaryContactInfo(user, contactInfoId) {
    const transaction = await sequelize.transaction();
    try {
      const contactInfo = await ContactInfo.findByPk(contactInfoId, {
        include: [
          {
            model: Branch,
            attributes: ["id", "restaurant_id"],
            required: false,
            where: sequelize.literal(
              `"ContactInfo"."module_type" = 'branch' AND "ContactInfo"."module_id" = "branch"."id"`
            ),
          },
        ],
        transaction,
      });

      if (!contactInfo) {
        throwError("Contact info not found", 404);
      }

      let restaurant_id = null;
      if (user.restaurant_id) {
        restaurant_id = user.restaurant_id;
      } else if (user.branch_id) {
        if (!contactInfo.Branch) {
          throwError("Branch info not found", 404);
        }
        restaurant_id = contactInfo.Branch.restaurant_id;
      } else {
        throwError("User does not belong to a restaurant or branch", 403);
      }

      if (contactInfo.restaurant_id !== restaurant_id) {
        throwError("Not authorized to update this contact info", 403);
      }

      if (user.branch_id) {
        if (
          contactInfo.module_type !== "branch" ||
          contactInfo.module_id !== user.branch_id
        ) {
          throwError("Not authorized to update this contact info", 403);
        }
      }

      const existingPrimary = await ContactInfo.findOne({
        where: {
          restaurant_id,
          module_type: contactInfo.module_type,
          module_id: contactInfo.module_id,
          is_primary: true,
          id: { [Op.ne]: contactInfoId },
        },
        transaction,
      });

      if (existingPrimary) {
        existingPrimary.is_primary = false;
        await existingPrimary.save({ transaction });
      }

      contactInfo.is_primary = true;
      await contactInfo.save({ transaction });

      await transaction.commit();
      return contactInfo;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};

module.exports = ContactInfoService;
