const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10;

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
  // return await bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(plainPassword, hash) {
  return await bcrypt.compare(plainPassword, hash);
}

module.exports = {
  hashPassword,
  comparePassword,
};
