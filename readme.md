# Multi-encrypt

## A simple, no-install, blazing fast solution to all your secret needs!

Multi-encrypt will encode and decode all of your repo secrets quickly, painlessly, and without installing any 3rd party tools or causing any developer compatibility issues.


## All you have to do for multi-encrypt to work is add a '# Secrets' comment to your .gitignore file...

```
.DS_Store
.env
.tmp
node_modules

# Secrets - Handled by multi-encrypt - DO NOT COMMIT THESE FILES!
./src/phi.json
./src/shared/gateway.env
./bin/cli.js
```

Anything after the '# Secrets ...' comment line will be *automatically* encrypted for you.

Encrypted secrets go into the root of your repo as encrypted.json.  It's base64 wrapped cast5 encrypted, meaning it's both totally secure, and plain text.

## Installation

### For your repo
```npm i multi-encrypt```

### For your machine (if you're the secret keeper, you might want this)
```npm i -g multi-encrypt```

## Getting started

1. Gather up all your secrets like a good developer and add them to the end of your .gitignore file.  Whew you're secrets are now safe on your machine!
2. Add a comment right before your secrets that starts with "# Secrets". That is literally all multi-encrypt needs to do it's magic.
3. Add an ```encrypt``` and ```decrypt``` script to your package.json file like so:

```
"scripts": {
    "enc": "multi-encrypt enc",
    "dec": "multi-encrypt dec"
}

```

...Your developers can now encrypt and decrypt your repo.  That's all there is to it!


## FAQ

### Q. Where do my encrypted files go?
A. Into 'encrypted.json' in the root of your repo. The file is standard JSON. You can read it with your eyes.

### Q. How do I know my files are safely encrypted?
A. First, Multi-encrypt uses Node's built in [crypto.pbk2df](https://nodejs.org/api/crypto.html#crypto_crypto_pbkdf2_password_salt_iterations_keylen_digest_callback) function, which is the most widely used crypto function on Earth.  If there is a flaw in cryptography, this is the first thing humanity would fix.

Second, multi-encrypt's only core dependancy is [node-cipher](https://github.com/onexdata/node-cipher) (with a command-line bug fix and a lodash security audit patch for 2019).  Node-cipher has plenty of comments, extremely detailed documentation and unit tests you can review and go over with a fine-toothed comb.

Third, multi-encrypt encodes your secrets using 128-bit Cast5 by default.  Although you can change this through CLI options, Cast5 has been proven rock-solid and unbreakable for over 20 years. It's just as secure as the most secure method that exists; Unbreakable.

Finally, multi-encrypt can only guarentee your encryption is secured by the password you provide (and optional salt).  You are ultimately responsible for your security.  Use a password strength commensurate with your security risk and keep it safe, and you'll do just fine.

### Q. Do my secret files get deleted when I encrypt them?
A. Heck no! What if you forget your password? What if you did it by mistake? You must add them to your .gitignore file for this process to work in the first place, so they won't show up in the repo. Automatically deleting all your secrets at lightspeed with a single command is a bad idea for a dozen reasons.

### Q. How can I automate this?
A. By installing multi-encrypt either globally or in your repo, and adding a npm command for encryption and decryption.  That's all there is to it.

### Q. Can I automate decryption when someone installs my repo?
A. Yep, add a script called "postinstall", i.e.:
```
"postinstall": "multi-encrypt dec"
```
Your developers will be prompted for the encryption password right after they do an 'npm install'. If they enter it right, all your secret files get decrypted and deployed where they need to be right after they install. Because multi-encrypt uses your .gitignore file for it's manifest, there is no config, and because your .gitignore already ignores your secret files, your developer can turn around and make a commit, and the secrets are still completely safe. Painless!

### Q. What if a developer quits? How do I re-encrypt / change the password?
A. Your developer was exposed to your secret contents, so that isn't secure since they've seen them. Keep in mind you may have to change all your secrets like your API keys, etc.  However, If all you want to do is keep your developer from seeing future secrets even though they might have access to your repo, just re-encrypt with multi-encrypt and commit your secrets.json file.  That's it.  Decryption will now require your new password.  Securely distribute the new password to your remaining developers and you're done!

### Q. How do I encrypt?
A. From a global install...
```
multi-encrypt enc
```

From a repo install, just place it in the scripts section like this...
```
scripts: {
    "enc": "multi-encrypt enc"
}
```
...and call it like this...
```
npm run enc
```

### Q. How do I specify a password automatically?
A. This is probably a bad idea, since this is your secret that unlocks your secrets.  Because of this, multi-encrypt will prompt you for a password and remove it from the console so it can't be logged.  If you want to circumvent all that security for some reason like you're doing CI/CD (yeah I guess that is a good reason :)) then just do this:
```
multi-encrypt dec -p yourpassword
```

### Note you can always just type 'multi-encrypt' from the command prompt to get help.

### P.P.S., if you want more details...
Multi-encrypt uses [node-cipher](https://github.com/onexdata/node-cipher) under the hood, which is extremely well-documented.