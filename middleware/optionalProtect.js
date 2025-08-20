const jwt = require("jsonwebtoken");
const { Customer, TwoFA } = require("../models");

const optionalProtect = async (req, res, next) => {
  const token =
    req.cookies?.token ||
    req.headers?.authorization?.split(" ")[1] ||
    req.headers?.token;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const customer = await Customer.findByPk(decoded.id, {
      include: [{ model: TwoFA, as: "twoFA" }],
    });

    req.user = customer || null;
  } catch (err) {
    req.user = null;
  }

  return next();
};

module.exports = optionalProtect;
