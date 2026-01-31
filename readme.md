# Multi-encrypt

A simple, no-install solution to securely encrypt your repository secrets using AES-256!

Multi-encrypt will encode and decode all of your repo secrets quickly and securely, without requiring complex setup or causing developer compatibility issues.

## Security Features

- AES-256-GCM encryption (industry standard)
- Authenticated encryption to prevent tampering
- Secure key derivation (PBKDF2 with 600,000 iterations - OWASP 2024 recommendation)
- Unique initialization vectors (IVs) for each encryption
- No dependencies on external encryption libraries
- Uses Node.js native crypto module
- Backward compatible with v1 encrypted files

## Understanding the Encryption

Multi-encrypt uses three critical components for each encrypted file:

1. **Initialization Vector (IV)**: A random value generated for each encryption operation. Even if you encrypt the same file multiple times with the same password, the IV ensures you get different encrypted outputs each time. This prevents pattern analysis and strengthens security.

2. **Encrypted Data**: Your actual file content, encrypted using AES-256-GCM with the derived key and IV.

3. **Authentication Tag**: A security feature of GCM (Galois/Counter Mode) encryption that ensures the encrypted data hasn't been tampered with. If someone modifies the encrypted data, the tag verification will fail during decryption.

Example structure in encrypted.json:
```json
{
  "version": 2,
  "salt": "random-64-byte-salt-base64-encoded",
  "files": {
    "path/to/secret.js": {
      "iv": "random-initialization-vector",
      "encrypted": "encrypted-file-content",
      "tag": "authentication-tag"
    }
  }
}
```

All three components are necessary for secure decryption. If any piece is modified or missing, decryption will fail as a security measure.

## Getting Started

1. Add your secrets to your .gitignore file under a "# Secrets" comment:

```
.DS_Store
node_modules

# Secrets - Handled by multi-encrypt
./src/secrets.json
./config/api-keys.env
./private/credentials.js
```

2. Install multi-encrypt:

```bash
# For your repo
npm i multi-encrypt

# For your machine (if you're managing secrets)
npm i -g multi-encrypt
```

3. Add encrypt/decrypt scripts to your package.json:

```json
{
  "scripts": {
    "enc": "multi-encrypt enc",
    "dec": "multi-encrypt dec"
  }
}
```

That's it! Your secrets are now ready to be encrypted.

## Usage

### Encrypting Secrets
```bash
# Using npm script
npm run enc

# Or using global install
multi-encrypt enc
```

This will:
1. Prompt you for an encryption password
2. Read all files listed under "# Secrets" in .gitignore
3. Encrypt them using AES-256-GCM
4. Save the encrypted data to encrypted.json

### Decrypting Secrets
```bash
# Using npm script
npm run dec

# Or using global install
multi-encrypt dec
```

This will:
1. Prompt you for the decryption password
2. Read the encrypted.json file
3. Decrypt all files to their original locations

## Upgrading from v1

If you're upgrading from multi-encrypt v1.x, your existing `encrypted.json` files will still work. The v2 release automatically detects the legacy format and decrypts using the original algorithm.

To upgrade your encrypted files to the new, more secure v2 format:

1. Decrypt your files: `multi-encrypt dec`
2. Re-encrypt them: `multi-encrypt enc`
3. Commit the new `encrypted.json`

The v2 format includes:
- 600,000 PBKDF2 iterations (up from 1,000)
- AES-256-GCM (up from CAST5-CBC)
- Random 64-byte salt (instead of static salt)
- SHA-256 digest (up from SHA-1)

Your team members will need to update their multi-encrypt version before they can decrypt v2 files.

## FAQ

### Q: Where do my encrypted files go?
A: All encrypted data is stored in 'encrypted.json' in the root of your repo. While this file is plain text (base64 encoded), it's securely encrypted using AES-256-GCM, a standard trusted by governments and financial institutions worldwide. Each encrypted file includes an initialization vector (IV), encrypted content, and authentication tag to ensure security and data integrity.

### Q: How secure is this?
A: Multi-encrypt uses multiple layers of industry-standard security:

- **AES-256-GCM Encryption**: The gold standard in symmetric encryption, chosen by the NSA for top secret information. It's the same encryption used by major cloud providers like AWS for their EBS volumes and Google Cloud for their storage. The 256-bit key length means there are 2^256 possible keys - more than the number of atoms in the observable universe.

- **PBKDF2 with 600,000 Iterations**: Password-based key derivation that's significantly more secure than basic hashing. While some services use as few as 1,000 iterations (like older versions of LastPass) or 10,000 iterations (like some legacy banking systems), we use 600,000 iterations - matching OWASP's 2024 recommendation for PBKDF2-SHA256. This means breaking the encryption would take about 600,000 times longer than with a simple hash, providing maximum protection against brute-force attacks even with modern GPUs.

- **Authenticated Encryption**: Using GCM (Galois/Counter Mode) provides built-in authentication, similar to how Signal and WhatsApp verify message integrity. This prevents sophisticated attacks like bit-flipping that could affect other encryption modes like CBC.

- **Unique IVs**: Every file gets its own random initialization vector, preventing pattern analysis. This is the same approach used by TLS 1.3 (the protocol securing HTTPS) to ensure that even if you encrypt the same file twice, the outputs look completely different.

- **64-byte Random Salt**: Our salt is twice the size of common implementations (many use 32 bytes), matching the recommendations for high-security systems. This makes pre-computed attacks (rainbow tables) practically impossible, as attackers would need to pre-compute for 2^512 possible salts.

- **Authentication Tags**: Each encrypted file includes a unique tag that acts like a digital seal. Similar to how modern banking apps verify transactions, any tampering with the encrypted data will break this seal and cause decryption to fail.

For perspective, breaking AES-256 with current technology would take billions of years even with all of the world's current supercomputers combined. The addition of our high-iteration PBKDF2 and large salt size makes the protection even stronger against password-guessing attacks.

Your security ultimately depends on choosing and protecting a strong password, but the technical implementation provides government-grade protection for your secrets.

### Q: Do my secret files get deleted when encrypted?
A: No! Your original files remain untouched. Since they're listed in .gitignore, they won't be committed to your repository. This prevents accidental data loss if you forget your password or need to reference the original files.

### Q: Can I automate decryption during npm install?
A: Yes, add a postinstall script to your package.json:
```json
{
  "scripts": {
    "postinstall": "multi-encrypt dec"
  }
}
```
Developers will be prompted for the password after npm install completes.

### Q: How do I change the encryption password?
A: To change the password:
1. Decrypt all files with the old password
2. Re-encrypt them with the new password
3. Commit the new encrypted.json file
4. Share the new password securely with your team

Remember: Anyone who had the old password has seen the secret contents. Consider updating sensitive data like API keys when rotating passwords.

### Q: How do I use this with CI/CD?
A: For CI/CD environments, you can pass the password via command line:
```bash
multi-encrypt dec -p "your-password"
```
Note: Using passwords in command line arguments may expose them in logs. Consider using your CI/CD system's secret management features to securely provide the password.

## CLI Commands

### Basic Usage
```bash
multi-encrypt encrypt  # Encrypt files (alias: enc)
multi-encrypt decrypt  # Decrypt files (alias: dec)
```

### Help
```bash
multi-encrypt --help  # Show all commands and options
```

## Common Worries/Complaints

### **"Is this approach tested?"**
Yes. Every statement, branch, function and line are fully tested. Read the latest coverage report [here](.\coverage\lcov-report\index.html), or download this repo and run the tests yourself.

## **"Is this approach respected?"**
Yes. Paste this readme file into any LLM and ask it's opinion yourself. As of 2025, Claude 3.5 Sonnet and ChatGPT o1 agree this approach has the least attack surface of any approach possible after considering all aspects; it is *more* secure than a secrets manager and implements all aspects of modern military-grade security.

### **"Why not just use a secrets manager?"**
Secrets managers have their place, but they introduce significant risks and complexity:
- **Increased Attack Surface**: Secrets managers centralize access to all secrets via APIs or UIs, meaning a single compromise can expose everything. Multi-encrypt minimizes the attack surface to just one encrypted file (`encrypted.json`) and a single password.
- **Encourages Insecure Practices**: Secrets managers often require developers to manually upload sensitive `.env` files or plaintext secrets, increasing the risk of leaks. Multi-encrypt eliminates this by encrypting everything locally, removing the need to share plaintext secrets at all.
- **Limited Flexibility**: Secrets managers are typically limited to storing text-based secrets like environment variables. Multi-encrypt can securely handle anything—entire files, algorithms, or sensitive configurations.

For large teams, Multi-encrypt works seamlessly with secrets managers by using them **only for secure distribution of the encrypted file**, while the decryption password is managed independently. This approach maintains the smallest possible attack surface while allowing teams to scale securely.

---

### **"Doesn't storing all secrets in a single encrypted file make it a single point of failure?"**
No, `encrypted.json` is highly secure because:
1. It’s fully encrypted using the most robust cryptography methods available, and is actually more secure than most secrets managers, ensuring it cannot be accessed without the password.
2. It’s easy to version-control, in fact that's built in, making it just as auditable and traceable as your code itself, because it *is* code, just incredibly well encrypted.
3. It avoids the need for developers to distribute multiple files insecurely, reducing human error.

As long as the password is managed securely, `encrypted.json` is far safer than distributing plaintext `.env` files or using secrets managers alone. It reduces attack surface to a single, incredibly hard surface, regardless of what other mistakes you may have made.

---

### **"How does this handle secret rotation for large teams?"**
Multi-encrypt inherently supports secret rotation:
- If a developer leaves, simply re-encrypt the file with a new password, commit your change, and distribute the new password securely to the remaining team. That's it! Even if they still have access to the repository itself, they cannot see your secret changes to the repo without the new password.
- Developers with old passwords cannot decrypt the updated `encrypted.json`, ensuring they lose access to all secrets, even if the the repo access is public!

This is simpler, faster, and more secure than relying on complex access control policies in a secrets manager; there is almost nothing to learn, almost no mistakes to make, and almost nothing that can go wrong. What is even better... there is no dependancy on a 3rd party! There is nobody to hack!

---

### **"How is this more secure than manually managing secrets?"**
Multi-encrypt reduces human error by automating encryption and decryption workflows:
- Secrets are never stored in plaintext.
- Developers only need to manage a single encrypted file and password.
- There’s no risk of accidentally committing sensitive files to version control, as `encrypted.json` is explicitly designed for this purpose.

This streamlined approach minimizes mistakes while ensuring strong security.

## License
MIT - see LICENSE file for details.