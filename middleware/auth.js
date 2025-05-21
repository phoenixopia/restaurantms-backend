const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');

// check the user authenticated
exports.isAuthenticated = async (req, res, next) => {
  let token;
  if (req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: "You must log in." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Server error!', error: error.message });
  }
};

// Role-based authorization (e.g., 'admin', 'super-admin')
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(
        new ErrorResponse(`Access Denied. User role '${req.user.role}' is not authorized`, 403)
      );
      // return res.status(403).json({success: false, message: `User role '${req.user.role}' is not authorized` });
    }
    next();
  };
};

