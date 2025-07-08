const jwt = require("jsonwebtoken");
const {
  User,
  Role,
  Permission,
  RolePermission,
  UserPermission,
  TwoFA,
  Customer,
} = require("../models");

exports.protect = (type = "user") => {
  return async (req, res, next) => {
    const token =
      req.cookies?.token ||
      req.headers?.authorization?.split(" ")[1] ||
      req.headers?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (type === "customer") {
        const user = await Customer.findByPk(decoded.id, {
          include: [{ model: TwoFA }],
        });

        if (!user) {
          return res.status(401).json({
            success: false,
            message: "User not found",
          });
        }

        req.user = user;
      } else {
        const user = await User.findByPk(decoded.id, {
          include: [
            {
              model: Role,
              attributes: ["id", "name"],
              include: [
                {
                  model: Permission,
                  through: {
                    attributes: ["granted"],
                    where: { granted: true },
                  },
                },
              ],
            },
            {
              model: UserPermission,
              where: { granted: true },
              required: false,
              include: [{ model: Permission }],
            },
          ],
        });

        if (!user) {
          return res.status(401).json({
            success: false,
            message: "User not found",
          });
        }

        req.user = user;
        req.user.role_name = user.Role?.name || null;
        req.user.restaurant_id = decoded.restaurant_id || null;
        req.user.branch_id = decoded.branch_id || null;
      }

      next();
    } catch (err) {
      console.error("Auth error:", err);
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }
  };
};
