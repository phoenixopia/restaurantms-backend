// utils/idGenerator.js

const { customAlphabet } = require('nanoid');
const generateId = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 21);

module.exports = {
  getGeneratedId: () => generateId()
};
