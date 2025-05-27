const { Role } = require('../models/index');

// Role-based authorization (e.g., 'admin', 'super-admin')
exports.authorize = (...roles) => {
  return async (req, res, next) => {
    try {

      // Await the role fetch
      const roleRecord = await Role.findByPk(req.user.role_id);

      // If role not found
      if (!roleRecord) {
        return res.status(403).json({ success: false, message: "Access Denied. Role not found.",});
      }

      // Compare role name (e.g., roleRecord.name or roleRecord.role)
      if (!roles.includes(roleRecord.name)) {
        return res.status(403).json({ success: false, message: `Access Denied. User role '${roleRecord.name}' is not authorized`,});
      }

      // Add role info to request if needed
      // req.user.role = roleRecord.name;

      next();
    } catch (error) {
      console.error("Authorization error:", error);
      return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
  };
};
