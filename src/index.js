// src/index.js
const { handleEncryption, handleDecryption } = require('./lib/fileHandler');

module.exports = {
  encrypt: handleEncryption,
  decrypt: handleDecryption
};
