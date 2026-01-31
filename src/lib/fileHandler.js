// src/lib/fileHandler.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const cryptoLib = require('./crypto');

function getSecretFilesFromGitignore() {
  try {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    const lines = gitignore.split('\n');
    let secretsFound = false;
    const secretFiles = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.toLowerCase().includes('# secret')) {
        secretsFound = true;
        continue;
      }

      if (secretsFound &&
          trimmedLine &&
          !trimmedLine.startsWith('#')) {
        secretFiles.push(trimmedLine);
      }
    }

    return secretFiles;
  } catch (err) {
    console.error(chalk.red('Error reading .gitignore file:', err.message));
    return [];
  }
}

async function handleEncryption(options = {}) {
  try {
    const password = await cryptoLib.getPassword(options.password);
    const salt = crypto.randomBytes(cryptoLib.ENCRYPTION_CONFIG.saltLength);
    const key = cryptoLib.deriveKey(password, salt);

    const secretFiles = getSecretFilesFromGitignore();
    if (secretFiles.length === 0) {
      console.log(chalk.yellow('No secret files found in .gitignore. Add files under a "# Secrets" comment.'));
      return;
    }

    const encrypted = {
      version: 2,
      salt: salt.toString('base64'),
      files: {}
    };

    for (const file of secretFiles) {
      if (fs.existsSync(file)) {
        console.log(chalk.green(`Encrypting ${file}...`));
        const data = fs.readFileSync(file);
        encrypted.files[file] = cryptoLib.encryptData(data, key);
      } else {
        console.log(chalk.yellow(`Skipping ${file} - file not found`));
      }
    }

    fs.writeFileSync('encrypted.json', JSON.stringify(encrypted, null, 2));
    console.log(chalk.green('\nEncryption complete! Encrypted data saved to encrypted.json'));
  } catch (err) {
    console.error(chalk.red('Encryption failed:', err.message));
    process.exit(1);
  }
}

async function handleDecryption(options = {}) {
  try {
    if (!fs.existsSync('encrypted.json')) {
      console.error(chalk.red('encrypted.json not found. Run encryption first.'));
      process.exit(1);
    }

    const password = await cryptoLib.getPassword(options.password);
    const encrypted = JSON.parse(fs.readFileSync('encrypted.json', 'utf8'));

    // Check if this is legacy v1 format
    if (cryptoLib.isLegacyFormat(encrypted)) {
      console.log(chalk.yellow('Detected legacy v1 format. Decrypting with legacy algorithm...'));
      console.log(chalk.yellow('Re-encrypt after decryption to upgrade to v2 format.\n'));
      await handleLegacyDecryption(encrypted, password);
      return;
    }

    // v2 format
    const key = cryptoLib.deriveKey(password, Buffer.from(encrypted.salt, 'base64'));

    for (const [file, encData] of Object.entries(encrypted.files)) {
      try {
        console.log(chalk.green(`Decrypting ${file}...`));
        const decrypted = cryptoLib.decryptData(encData.encrypted, key, encData.iv, encData.tag);

        const dir = path.dirname(file);
        if (dir !== '.' && !fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(file, decrypted);
      } catch (err) {
        console.log(chalk.red(`Failed to decrypt ${file}: ${err.message}`));
      }
    }

    console.log(chalk.green('\nDecryption complete!'));
  } catch (err) {
    console.error(chalk.red('Decryption failed:', err.message));
    process.exit(1);
  }
}

async function handleLegacyDecryption(encrypted, password) {
  // v1 format: files may be at root level or in a 'files' object
  // The encryption used static salt 'nodecipher', cast5-cbc, 1000 iterations, sha1
  const key = cryptoLib.deriveLegacyKey(password);

  // Determine structure - v1 might have files directly or in encrypted.files
  const files = encrypted.files || encrypted;

  for (const [file, encData] of Object.entries(files)) {
    // Skip non-file properties
    if (typeof encData !== 'string' && typeof encData !== 'object') continue;
    if (file === 'version' || file === 'salt') continue;

    try {
      console.log(chalk.green(`Decrypting ${file}...`));

      // v1 format stored encrypted data as a string directly
      const encryptedString = typeof encData === 'string' ? encData : encData.encrypted;
      const decrypted = cryptoLib.decryptLegacyData(encryptedString, key);

      const dir = path.dirname(file);
      if (dir !== '.' && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(file, decrypted);
    } catch (err) {
      console.log(chalk.red(`Failed to decrypt ${file}: ${err.message}`));
    }
  }

  console.log(chalk.green('\nDecryption complete!'));
}

module.exports = {
  handleEncryption,
  handleDecryption,
  // Export for testing
  _internal: {
    getSecretFilesFromGitignore,
    handleLegacyDecryption
  }
};
