const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.Authorization || req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Access Denied: No Token Provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

const isSuperAdmin = (req, res, next) => {
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

const isRestaurantAdmin = (req, res, next) => {
  if (req.user.role !== "restaurant_admin") {
    return res.status(403).json({
      message: "Access denied",
    });
  }
  next();
};

module.exports = {
  verifyToken,
  isSuperAdmin,
  isRestaurantAdmin,
};
