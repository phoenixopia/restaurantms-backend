const jwt = require("jsonwebtoken");
const {
  User,
  Role,
  Permission,
  RolePermission,
  UserPermission,
  TwoFA,
} = require("../models");

exports.protect = async (req, res, next) => {
  let token =
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
    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: Role,
          include: [
            {
              model: RolePermission,
              where: { granted: true },
              required: false,
              include: [
                {
                  model: Permission,
                },
              ],
            },
          ],
        },
        {
          model: UserPermission,
          where: { granted: true },
          required: false,
          include: [
            {
              model: Permission,
            },
          ],
        },
        {
          model: TwoFA,
          as: "twoFA",
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
    req.user.restaurant_id = decoded.restaurant_id || null;
    next();
  } catch (err) {
    console.error("Error in protect middleware:", err);
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }
};
