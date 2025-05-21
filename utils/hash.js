const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10;

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(plainPassword, hash) {
  return await bcrypt.compare(plainPassword, hash);
}

module.exports = {
  hashPassword,
  comparePassword,
};
