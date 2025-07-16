const { RolePermission, Permission, UserPermission } = require("../models");

exports.permissionCheck = (permissionNames = []) => {
  if (!Array.isArray(permissionNames)) {
    permissionNames = [permissionNames];
  }

  return async (req, res, next) => {
    try {
      const user = req.user;

      if (user.role_name === "super_admin") {
        return next();
      }

      // Check role permissions
      const rolePerms = await RolePermission.findAll({
        where: {
          role_id: user.role_id,
          granted: true,
        },
        include: [
          {
            model: Permission,
            required: true,
            where: {
              name: permissionNames,
            },
          },
        ],
      });

      if (rolePerms.length > 0) {
        return next();
      }

      // Check user permissions
      const userPerms = await UserPermission.findAll({
        where: {
          user_id: user.id,
          granted: true,
        },
        include: [
          {
            model: Permission,
            required: true,
            where: {
              name: permissionNames,
            },
          },
        ],
      });

      if (userPerms.length > 0) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Access denied - requires one of [${permissionNames.join(
          ", "
        )}] permission.`,
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
