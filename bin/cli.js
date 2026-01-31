#!/usr/bin/env node
const { program } = require('commander');
const { encrypt, decrypt } = require('../src');
const pkg = require('../package.json');

program
  .version(pkg.version)
  .description('Securely encrypt and decrypt files marked as secrets in .gitignore');

program
  .command('encrypt')
  .alias('enc')
  .description('Encrypt files marked as secrets')
  .option('-p, --password <password>', 'Password for encryption (for CI/CD use)')
  .action((options) => encrypt({ password: options.password }));

program
  .command('decrypt')
  .alias('dec')
  .description('Decrypt files from encrypted.json')
  .option('-p, --password <password>', 'Password for decryption (for CI/CD use)')
  .action((options) => decrypt({ password: options.password }));

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);
