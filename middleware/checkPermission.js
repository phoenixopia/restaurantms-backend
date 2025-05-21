const { RolePermission, Permission } = require("../models");
const redisClient = require("../utils/redis");

const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      const { role, role_id, restaurant_id } = req.user;

      const restaurantKey = restaurant_id || "global";
      const cacheKey = `permissions:${role_id}:${restaurantKey}`;

      let cachedPermissions = await redisClient.get(cacheKey);

      if (!cachedPermissions) {
        const rolePermissions = await RolePermission.findAll({
          where: {
            role_id,
            restaurant_id: restaurant_id === "global" ? null : restaurant_id,
            granted: true,
          },
          include: [Permission],
        });

        cachedPermissions = rolePermissions.map((rp) => rp.Permission.name);
        await redisClient.setEx(
          cacheKey,
          300,
          JSON.stringify(cachedPermissions)
        );
      } else {
        cachedPermissions = JSON.parse(cachedPermissions);
      }

      if (!cachedPermissions.includes(permissionName)) {
        return res
          .status(403)
          .json({ message: "Access denied: missing permission" });
      }

      next();
    } catch (error) {
      console.error("Permission middleware error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  };
};

module.exports = checkPermission;
