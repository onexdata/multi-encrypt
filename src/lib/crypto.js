// src/lib/crypto.js
const crypto = require('crypto');
const inquirer = require('inquirer');

// Modern encryption configuration (v2)
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 12,  // 96 bits - native GCM IV size
  saltLength: 64,
  tagLength: 16,
  iterations: 600000  // OWASP 2024 recommendation for PBKDF2-SHA256
};

// Legacy v1 configuration (for backward compatibility)
const LEGACY_CONFIG = {
  algorithm: 'cast5-cbc',
  keyLength: 512,
  saltString: 'nodecipher',
  iterations: 1000,
  digest: 'sha1'
};

async function getPassword(providedPassword) {
  if (providedPassword) {
    return providedPassword;
  }

  const { password } = await inquirer.prompt([{
    type: 'password',
    name: 'password',
    message: 'Enter encryption password:',
    validate: input => input.length >= 8 || 'Password must be at least 8 characters'
  }]);
  return password;
}

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(
    password,
    salt,
    ENCRYPTION_CONFIG.iterations,
    ENCRYPTION_CONFIG.keyLength,
    'sha256'
  );
}

function deriveLegacyKey(password) {
  return crypto.pbkdf2Sync(
    password,
    LEGACY_CONFIG.saltString,
    LEGACY_CONFIG.iterations,
    LEGACY_CONFIG.keyLength,
    LEGACY_CONFIG.digest
  );
}

function encryptData(data, key) {
  const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
  const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(data),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    encrypted: encrypted.toString('base64'),
    tag: tag.toString('base64')
  };
}

function decryptData(encData, key, iv, tag) {
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_CONFIG.algorithm,
    key,
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encData, 'base64')),
    decipher.final()
  ]);
}

function decryptLegacyData(encryptedBase64, key) {
  // v1 format used createDecipher (deprecated) which internally derives IV from key
  // We need to replicate that behavior using createDecipheriv
  const decipher = crypto.createDecipher(LEGACY_CONFIG.algorithm, key);

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final()
  ]);
}

function isLegacyFormat(encrypted) {
  // v2 format has 'version' field or 'salt' at root level
  // v1 format has neither - files are directly at root or nested without salt
  return !encrypted.version && !encrypted.salt;
}

module.exports = {
  encryptData,
  decryptData,
  decryptLegacyData,
  deriveKey,
  deriveLegacyKey,
  getPassword,
  isLegacyFormat,
  ENCRYPTION_CONFIG,
  LEGACY_CONFIG
};
