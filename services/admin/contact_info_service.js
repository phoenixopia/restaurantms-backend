"use strict";

const { Op, fn, col, literal, QueryTypes, where } = require("sequelize");
const throwError = require("../../utils/throwError");
const { ContactInfo, Restaurant, Branch, sequelize } = require("../../models");

async function authorizeContactInfoAccess(user, contactInfo, transaction) {
  let restaurantId;

  if (user.restaurant_id) {
    restaurantId = user.restaurant_id;
  } else if (user.branch_id) {
    const branch = await Branch.findByPk(user.branch_id, { transaction });
    if (!branch) throwError("Branch not found", 404);
    restaurantId = branch.restaurant_id;
  } else {
    throwError("User does not belong to a restaurant or branch", 403);
  }

  if (contactInfo.restaurant_id !== restaurantId) {
    throwError("Not authorized to access this contact info", 403);
  }

  if (contactInfo.module_type === "restaurant") {
    if (contactInfo.module_id !== restaurantId) {
      throwError("Not authorized for this restaurant contact info", 403);
    }
  } else if (contactInfo.module_type === "branch") {
    const branch = await Branch.findByPk(contactInfo.module_id, {
      transaction,
    });
    if (!branch || branch.restaurant_id !== restaurantId) {
      throwError("Branch does not belong to your restaurant", 403);
    }

    if (user.branch_id && user.branch_id !== contactInfo.module_id) {
      throwError(
        "Branch user can only access their own branch contact info",
        403
      );
    }
  }

  return restaurantId;
}

const ContactInfoService = {
  async addContactInfo(user, data) {
    const { module_type, module_id, type, value, is_primary = false } = data;

    let restaurantId;
    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    } else {
      throwError("User does not belong to a restaurant or branch", 404);
    }

    if (is_primary) {
      const existingPrimary = await ContactInfo.findOne({
        where: {
          restaurant_id: restaurantId,
          module_type,
          module_id,
          is_primary: true,
        },
      });
      if (existingPrimary) {
        throwError(
          `There is already a primary contact for this ${module_type}.`,
          400
        );
      }
    }

    return ContactInfo.create({
      restaurant_id: restaurantId,
      module_type,
      module_id,
      type,
      value,
      is_primary,
    });
  },

  async getAllContactInfo(user, filters) {
    const { module_type, search_value, page, limit } = filters;
    const offset = (page - 1) * limit;

    let where = {};
    if (user.restaurant_id) {
      where.restaurant_id = user.restaurant_id;
      if (module_type) where.module_type = module_type;
      if (search_value) where.value = { [Op.iLike]: `%${search_value}%` };
    } else if (user.branch_id) {
      where = { module_type: "branch", module_id: user.branch_id };
    } else {
      throwError("User does not belong to a restaurant or branch", 404);
    }

    const { count, rows } = await ContactInfo.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      offset,
      limit,
      include: [
        {
          model: Restaurant,
          attributes: ["id", "restaurant_name"],
        },
      ],
      attributes: {
        include: [
          [
            sequelize.literal(`(
            SELECT name 
            FROM branches AS b
            WHERE 
              b.id = "ContactInfo"."module_id" 
              AND "ContactInfo"."module_type" = 'branch'
          )`),
            "branch_name",
          ],
        ],
      },
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
    const contactInfo = await ContactInfo.findByPk(id);
    if (!contactInfo) throwError("Contact info not found", 404);

    await authorizeContactInfoAccess(user, contactInfo);
    return contactInfo;
  },

  async updateContactInfo(user, id, data) {
    const transaction = await sequelize.transaction();
    try {
      const contactInfo = await ContactInfo.findByPk(id, { transaction });
      if (!contactInfo) throwError("Contact info not found", 404);

      await authorizeContactInfoAccess(user, contactInfo, transaction);

      if (data.is_primary === true && !contactInfo.is_primary) {
        const existingPrimary = await ContactInfo.findOne({
          where: {
            restaurant_id: contactInfo.restaurant_id,
            module_type: contactInfo.module_type,
            module_id: contactInfo.module_id,
            is_primary: true,
            id: { [Op.ne]: id },
          },
          transaction,
        });
        if (existingPrimary) {
          throwError(
            `There is already a primary contact for this ${contactInfo.module_type}.`,
            400
          );
        }
      }

      const allowedFields = ["type", "value", "is_primary"];
      allowedFields.forEach((field) => {
        if (data[field] !== undefined) contactInfo[field] = data[field];
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
      const contactInfo = await ContactInfo.findByPk(id, { transaction });
      if (!contactInfo) throwError("Contact info not found", 404);

      await authorizeContactInfoAccess(user, contactInfo, transaction);

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
        transaction,
      });
      if (!contactInfo) throwError("Contact info not found", 404);

      await authorizeContactInfoAccess(user, contactInfo, transaction);

      const existingPrimary = await ContactInfo.findOne({
        where: {
          restaurant_id: contactInfo.restaurant_id,
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
