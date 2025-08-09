const { Role, Permission } = require("../models");

exports.permissionCheck = (permissionNames = []) => {
  if (!Array.isArray(permissionNames)) {
    permissionNames = [permissionNames];
  }

  return async (req, res, next) => {
    try {
      const user = req.user;

      if (user.role_tag_name === "super_admin") {
        return next();
      }

      if (!user.role_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Your account does not have a role assigned.",
        });
      }

      const role = await Role.findByPk(user.role_id, {
        include: [
          {
            model: Permission,
            attributes: ["name"],
          },
        ],
      });

      if (!role) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Your role was not found in the system.",
        });
      }

      const rolePermissionNames = role.Permissions.map((p) => p.name);

      const hasPermission = permissionNames.some((perm) =>
        rolePermissionNames.includes(perm)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You need one of the following permissions to perform this action: ${permissionNames.join(
            ", "
          )}.`,
        });
      }

      next();
    } catch (err) {
      console.error("Error in permissionCheck middleware:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error while checking permissions.",
      });
    }
  };
};
