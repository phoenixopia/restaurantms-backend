
// Role-based authorization (e.g., 'admin', 'super-admin')
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new ErrorResponse(`Access Denied. User role '${req.user.role}' is not authorized`, 403));
      // return res.status(403).json({success: false, message: `User role '${req.user.role}' is not authorized` });
    }
    next();
  };
};

