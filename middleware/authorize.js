exports.authorize = (...allowedRoleTags) => {
  return (req, res, next) => {
    const roleTagName = req.user?.role_tag_name;
    if (!roleTagName || !allowedRoleTags.includes(roleTagName)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have the required role tag.",
      });
    }
    next();
  };
};
