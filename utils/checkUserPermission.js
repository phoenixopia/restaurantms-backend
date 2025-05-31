const { User, Permission } = require("../models");

const checkUserPermission = async (userId, permissionKey, restaurantId) => {
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Permission,
        where: { key: permissionKey },
        through: {
          where: {
            [sequelize.Op.or]: [
              { restaurant_id: restaurantId },
              { restaurant_id: null },
            ],
            granted: true,
          },
        },
      },
    ],
  });

  return !!user && user.Permissions.length > 0;
};
