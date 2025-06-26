exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    const roleName = req.user?.Role?.name;
    if (!roleName || !allowedRoles.includes(roleName)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have the required permissions.",
      });
    }

    next();
  };
};
