const jwt = require("jsonwebtoken");
const { User, UserRole } = require("../models");

exports.protect = async (req, res, next) => {
  let token = null;

  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "You must log in." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found." });
    }

    req.user = {
      id: user.id,
      role: decoded.role,
      role_id: decoded.role_id,
      restaurant_id: decoded.restaurant_id,
    };

    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token." });
  }
};
