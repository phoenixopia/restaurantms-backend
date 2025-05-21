// utils/idGenerator.js
let generateId;

const initIdGenerator = async () => {
  const { customAlphabet } = await import('nanoid');
  generateId = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 21);
};

// Export an async function to initialize and return ID
exports.getGeneratedId = async () => {
  if (!generateId) {
    await initIdGenerator();
  }
  return generateId();
};
