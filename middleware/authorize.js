const { Role } = require('../models/index');

exports.authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.role_id) {
        return res.status(401).json({ success: false, message: 'Unauthorized. User not logged in or role missing.' });
      }

      // Fetch role name using role_id
      const role = await Role.findByPk(req.user.role_id);
      if (!role) {
        return res.status(403).json({ success: false, message: 'Unauthorized. User not logged in or role missing.' });
      }

      // Check if user's role name is allowed
      if (!allowedRoles.includes(role.name)) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to perform this action.' });
      }

      // All good — continue
      next();
    } catch (error) {
      console.error('Authorization Error:', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
  };
};

