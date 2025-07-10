const { checkUserPermission } = require("../utils/checkUserPermission");

exports.permissionCheck = (permissionName) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (user.role_name === "super_admin") {
        return next();
      }

      const userId = user.id;
      const restaurantId =
        req.params.restaurantId ||
        req.body.restaurantId ||
        user.restaurant_id ||
        null;

      let userPermission = false;

      if (user.role_name === "staff") {
        userPermission = user.UserPermissions?.some(
          (up) =>
            up.Permission?.name === permissionName &&
            up.restaurant_id === restaurantId
        );
      }

      const rolePermission = user.Role?.RolePermissions?.some(
        (rp) => rp.Permission?.name === permissionName
      );

      let dynamicPermission = false;

      if (!userPermission && !rolePermission && user.role_name === "staff") {
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
        message: `Access denied - requires '${permissionName}' permission.`,
      });
    } catch (err) {
      console.error("Error in permissionCheck middleware:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error while checking permissions.",
      });
    }
  };
};
