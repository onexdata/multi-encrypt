/**
 * @fileoverview Handles the encrypt and decrypt commands.
 * @author Nathan Buchar
 */

'use strict';

let _ = require('lodash');
let chalk = require('chalk');
let inquirer = require('inquirer');
var fs = require('fs');

let nodecipher = require('../../');

/**
 * Prompts the user to supply a password via Inquirer.
 *
 * @param {Function} done
 */
function prompForPassword(done) {
  inquirer.prompt([
    {
      type: 'password',
      message: 'Enter the password',
      name: 'password',
      validate(input) {
        return input.length > 0;
      }
    }
  ]).then(answers => {
      console.log('password provided')
    done(answers.password);
  });
}

/**
 * Parses the command line options into a more consise Object that will be
 * accepted by NodeCipher.
 *
 * @param {Object} options
 * @returns {Object} opts
 */
function parseOptions(options) {
  let opts = {};

  _.each(nodecipher.defaults, (defaultVal, name) => {
    if (!_.isUndefined(options[name])) {
      opts[name] = options[name];
    }
  });

  return opts;
}

/**
 * First checks if the password has been supplied. If not, the user is prompted
 * to provide one. Once the password is received, parse the options and then
 * call the appropriate NodeCipher method with the given options.
 *
 * @see prompForPassword
 * @see handleCipher
 * @param {string} command
 * @param {string} input
 * @param {string} output
 * @param {Object} Options
 */
function cipher(command, options) {

  if (_.isUndefined(options.password)) {
    prompForPassword(password => {
      cipher(command, options, _.assign(options, { password }));
    });
  } else {
    // This is called each time we have a file to encode / decode...
    const codec = (input, output) => {
        fs.closeSync(fs.openSync(output, 'w'));
        let opts = _.assign(parseOptions(options), { input, output });
        let err = null
        nodecipher[command + 'Sync'](opts, err)
        handleCipher(opts, err);
        // Delete the source file if we are encrypting...
        // if (command === 'encrypt') fs.closeSync(fs.openSync(output, 'w'));
    }

    // Main encode/decode loop...
    let tempFile = 'multi-encrypt-tempfile';
    let totalFiles = 0;
    try {
        // Get a list of files to encode from .gitignore, then drop base64 encoded/encrypted copies...
        if (command === 'encrypt') {
            let secretsLineFound = false;
            let encrypted = {};
            fs.readFileSync('.gitignore')
                .toString()
                .split("\n")
                .filter(line => {
                    if (line.toLowerCase().indexOf("# secret") !== -1) {
                        secretsLineFound = true;
                        return false;
                    }
                    return secretsLineFound;
                })
                .forEach(file => {
                  // When we get here
                  if (file && fs.existsSync(file)) {
                    console.log(chalk.green(`Encrypting ${file}...`));
                    codec(file, tempFile);
                    encrypted[file] = fs.readFileSync(tempFile).toString('base64');
                    totalFiles++;
                  } else {
                    if (file) console.log(chalk.red(`File not found: ${file}`));
                  }
                });
                // All done...
                fs.writeFileSync('./encrypted.json', JSON.stringify(encrypted, null, 4));
                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                handleCipherSuccess(totalFiles, command + 'ed');
            } else {
            // Try to read the .encrypted file...
            let encrypted = JSON.parse(fs.readFileSync('./encrypted.json').toString());
            Object.keys(encrypted).forEach(file => {
                fs.writeFileSync(tempFile, Buffer.from(encrypted[file], 'base64'), 'utf8');
                codec(tempFile, file);
                totalFiles++;
            })
            // All done...
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            handleCipherSuccess(totalFiles, command + 'ed');
        }
    } catch (err) {
        handleCipher({}, err)
    }
  }
}

/**
 * Called when the cipher has completed. Handles errors if there are any.
 *
 * @param {Object} opts
 * @param {Error|null} err
 */
function handleCipher(opts, err) {
  if (err) {
    switch (err.name) {
      case nodecipher.errors.BAD_ALGORITHM:
        handleInvalidAlgorithm(opts, err);
        break;
      case nodecipher.errors.BAD_DIGEST:
        handleInvalidHash(opts, err);
        break;
      case nodecipher.errors.BAD_FILE:
        handleEnoentError(opts, err);
        break;
      case nodecipher.errors.BAD_DECRYPT:
        handleBadDecrypt(opts, err);
        break;
      default:
        handleUnknownErrors(opts, err);
    }
    process.exit(1);
  } else {
    // handleCipherSuccess(opts, err);
  }
}

/**
 * Handles NodeCipher ENOENT errors.
 *
 * @param {Object} opts
 * @param {Error} err
 */
function handleEnoentError(opts, err) {
  console.log(chalk.red(
    '\nError: ' + err.name + '. "' + err.path + '" does not exist.\n'
  ));
}

/**
 * Handles bad encryption key derivation
 *
 * @param {Object} opts
 * @param {Error} err
 */
function handleBadDecrypt(opts, err) {
  console.log(chalk.red(
    '\nError: ' + err.name + '. One or more of the following is likely ' +
    'incorrect:\n\n' +
      '  - password\n' +
      '  - salt\n' +
      '  - algorithm\n' +
      '  - iterations\n' +
      '  - keylen\n' +
      '  - digest\n'
  ));
}

/**
 * Handles invalid cipher algorithm.
 *
 * @param {Object} opts
 * @param {Error} err
 */
function handleInvalidAlgorithm(opts, err) {
  console.log(chalk.red(
    '\nError: ' + err.name + '. Use `nodecipher --algorithms` to see a list ' +
    'of valid algorithms.\n'
  ));
}

/**
 * Handles invalid HMAC hash digest.
 *
 * @param {Object} opts
 * @param {Error} err
 */
function handleInvalidHash(opts, err) {
  console.log(chalk.red(
    '\nError: ' + err.name + '. Use `nodecipher --hashes` to see a list of ' +
    'valid digest hashes.\n'
  ));
}

/**
 * Handles all unknown NodeCipher errors.
 *
 * @param {Object} opts
 * @param {Error} err
 */
function handleUnknownErrors(opts, err) {
  console.log(chalk.red('\n' + err + '\n'));
}

/**
 * Handle encrypt/decrypt success.
 *
 * @param {Object} opts
 * @param {Error} err
 */
function handleCipherSuccess(files, command) {
  const extra = command === 'encrypted' ?
    '\nEncrypted files are located in encrypted.json in this folder.' : '';
  console.log(chalk.green(
    `\nSuccess!\n${files} file(s) ${command}.${extra}`
  ));
}

module.exports = cipher;
