const {
  User,
  ActivityLog,
  Restaurant,
  Branch,
  Customer,
  sequelize,
} = require("../../models");
const { Op } = require("sequelize");

const ActivityLogService = {
  async getActivityLogs(user, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    let whereCondition = {};
    let includeCondition = [
      {
        model: User,
        attributes: ["id", "first_name", "last_name", "email", "phone_number"],
        include: [
          {
            model: Restaurant,
            attributes: ["id", "restaurant_name"],
          },
          {
            model: Branch,
            attributes: ["id", "name"],
            include: [
              {
                model: Restaurant,
                attributes: ["id", "restaurant_name"],
              },
            ],
          },
        ],
      },
    ];

    if (!user.restaurant_id && !user.branch_id) {
      whereCondition = {};
    } else if (user.restaurant_id && !user.branch_id) {
      async function getAllCreatedUserIds(userId) {
        const directUsers = await User.findAll({
          where: { created_by: userId },
          attributes: ["id"],
        });

        let ids = directUsers.map((u) => u.id);

        for (const child of directUsers) {
          const childIds = await getAllCreatedUserIds(child.id);
          ids = ids.concat(childIds);
        }

        return ids;
      }

      const createdUsersIds = await getAllCreatedUserIds(user.id);

      const userIds = [user.id, ...createdUsersIds];

      whereCondition = {
        user_id: { [Op.in]: userIds },
      };
    } else if (user.branch_id) {
      whereCondition = { user_id: user.id };
    }

    const { count, rows } = await ActivityLog.findAndCountAll({
      where: whereCondition,
      include: includeCondition,
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const result = rows.map((log) => {
      const u = log.User;
      let restaurantName = null;

      if (u?.Restaurant) {
        restaurantName = u.Restaurant.restaurant_name;
      } else if (u?.Branch?.Restaurant) {
        restaurantName = u.Branch.Restaurant.restaurant_name;
      }

      return {
        id: log.id,
        action: log.action,
        created_at: log.created_at,
        user: {
          id: u?.id,
          first_name: u?.first_name,
          last_name: u?.last_name,
          email: u?.email,
          phone_number: u?.phone_number,
          restaurant_name: restaurantName,
        },
      };
    });

    return {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / limit),
      data: result,
    };
  },

  async getActivityLogById(id) {
    const log = await ActivityLog.findOne({
      where: { id },
      include: [
        {
          model: User,
          attributes: [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
          ],
        },
      ],
    });

    if (!log) {
      return null;
    }

    const u = log.User;

    return {
      id: log.id,
      module: log.module,
      action: log.action,
      details: log.details,
      created_at: log.created_at,
      user: {
        id: u?.id,
        first_name: u?.first_name,
        last_name: u?.last_name,
        email: u?.email,
        phone_number: u?.phone_number,
      },
    };
  },

  async getWholeActivityLog({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const { count, rows } = await ActivityLog.findAndCountAll({
      include: [
        {
          model: User,
          attributes: [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "profile_picture",
          ],
        },
        {
          model: Customer,
          attributes: [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "profile_picture",
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const result = rows.map((log) => {
      const u = log.User;
      const c = log.Customer;

      return {
        id: log.id,
        module: log.module,
        action: log.action,
        details: log.details,
        created_at: log.created_at,
        user: u
          ? {
              id: u.id,
              first_name: u.first_name,
              last_name: u.last_name,
              email: u.email,
              phone_number: u.phone_number,
              profile_picture: u.profile_picture,
            }
          : null,
        customer: c
          ? {
              id: c.id,
              first_name: c.first_name,
              last_name: c.last_name,
              email: c.email,
              phone_number: c.phone_number,
              profile_picture: c.profile_picture,
            }
          : null,
      };
    });

    return {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / limit),
      data: result,
    };
  },

  async getWholeActivityLogById(id) {
    const log = await ActivityLog.findOne({
      where: { id },
      include: [
        {
          model: User,
          attributes: [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "profile_picture",
          ],
        },
        {
          model: Customer,
          attributes: [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "profile_picture",
          ],
        },
      ],
    });

    if (!log) return null;

    const u = log.User;
    const c = log.Customer;

    return {
      id: log.id,
      module: log.module,
      action: log.action,
      details: log.details,
      created_at: log.created_at,
      user: u
        ? {
            id: u.id,
            first_name: u.first_name,
            last_name: u.last_name,
            email: u.email,
            phone_number: u.phone_number,
            profile_picture: u.profile_picture,
          }
        : null,
      customer: c
        ? {
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email,
            phone_number: c.phone_number,
            profile_picture: c.profile_picture,
          }
        : null,
    };
  },
};

module.exports = ActivityLogService;
