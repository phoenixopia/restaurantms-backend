const { checkUserPermission } = require("../utils/checkUserPermission");

exports.permissionCheck = (permissionName) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const userId = user.id;
      const restaurantId =
        req.params.restaurantId ||
        req.body.restaurantId ||
        user.restaurant_id ||
        null;

      const userPermission = user.UserPermissions?.some(
        (up) => up.Permission?.name === permissionName
      );

      const rolePermission = user.Role?.RolePermissions?.some(
        (rp) => rp.Permission?.name === permissionName
      );

      let dynamicPermission = false;
      if (!userPermission && !rolePermission) {
        dynamicPermission = await checkUserPermission(
          userId,
          permissionName,
          restaurantId
        );
      }

      if (userPermission || rolePermission || dynamicPermission) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Access denied - requires ${permissionName} permission`,
      });
    } catch (err) {
      console.error("Error in permissionCheck:", err);
      return res.status(500).json({
        success: false,
        message: "Error checking permissions",
      });
    }
  };
};
