const { User, Permission } = require("../models");

const checkUserPermission = async (userId, permissionKey, restaurantId) => {
  if (!userId || !permissionKey || !restaurantId) {
    return false;
  }

  const user = await User.findByPk(userId, {
    include: [
      {
        model: Permission,
        where: { key: permissionKey },
        through: {
          where: {
            restaurant_id: restaurantId,
            granted: true,
          },
        },
      },
    ],
  });

  return !!user && user.Permissions && user.Permissions.length > 0;
};

module.exports = { checkUserPermission };
