// const bcrypt = require("bcryptjs");
const bcryptjs = require('bcryptjs');

const SALT_ROUNDS = 10;

async function hashPassword(password) {
  const salt = await bcryptjs.genSalt(10);
  return await bcryptjs.hash(password, salt);
  // return await bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(plainPassword, hash) {
  return await bcryptjs.compare(plainPassword, hash);
}

module.exports = {
  hashPassword,
  comparePassword,
};
