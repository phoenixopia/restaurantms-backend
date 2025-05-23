module.exports = (roleName) => {
  return (req, res, next) => {
    req.roleName = roleName;
    next();
  };
};
