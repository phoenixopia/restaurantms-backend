exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: role '${req.user?.role}' is not authorized`,
      });
    }
    next();
  };
};
