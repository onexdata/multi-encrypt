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

## Comparison with Alternatives

| Tool | Type | Windows | Key Management | File Types | Dependencies | Setup Complexity |
|------|------|---------|----------------|------------|--------------|------------------|
| **multi-encrypt** | npm package | Native | Password (memorizable) | Any file | 3 (npm only) | `npm i` + done |
| **git-crypt** | C++ binary | [Problematic](https://github.com/AGWA/git-crypt/issues/284) | GPG keys | Any file | GPG + binary | Install GPG, generate keys, configure |
| **blackbox** | Shell scripts | No | GPG keys | Any file | GPG + bash | Install GPG, manage keyrings |
| **SOPS** | Go binary | Yes | KMS/GPG/age keys | YAML/JSON/ENV | External binary | Install binary, configure KMS or keys |
| **git-secret** | Bash tool | No | GPG keys | Any file | GPG + bash | Install GPG, add users to keyring |
| **dotenvx** | npm package | Yes | Public/private keys | .env only | 9+ npm deps | Generate keys, store private key |
| **transcrypt** | Shell + OpenSSL | Limited | Shared password | Any file | OpenSSL + bash | Configure git filters |

### Why multi-encrypt?

**Choose multi-encrypt if you want:**
- Password-based encryption (no keys to manage, rotate, or lose)
- Cross-platform support including Windows (just `npm install`)
- Zero external dependencies (no GPG, no binaries, no cloud services)
- Encrypt any file type (not just .env files)
- Simple mental model (password → encrypted file)

**Choose something else if you need:**
- Per-user access control (use git-crypt or blackbox with GPG)
- Cloud KMS integration (use SOPS)
- Transparent git encryption (use git-crypt or transcrypt)
- Enterprise audit logging (use a secrets manager)

## Transparency & Trade-offs

We believe in being upfront about limitations. Here's what you should know:

### What This Tool Is

✅ **A simple, password-based encryption tool** for teams that want to commit encrypted secrets to git without complex key management.

✅ **Cross-platform** - Works identically on Windows, Mac, and Linux with just `npm install`.

✅ **Zero external dependencies** - Uses only Node.js built-in `crypto` module. No GPG, no cloud services, no native binaries.

✅ **Backward compatible** - v2 can decrypt files encrypted with v1.

### What This Tool Is NOT

❌ **Not a secrets manager** - There's no UI, no access control, no audit logging. It's a CLI tool.

❌ **Not for per-user permissions** - Everyone with the password can decrypt everything. For granular access control, use GPG-based tools.

❌ **Not transparent encryption** - You manually run `enc`/`dec`. For automatic encrypt-on-commit, use git-crypt.

❌ **Not for huge files** - Files are loaded into memory. Fine for configs, not for gigabyte blobs.

### Cryptographic Choices Explained

| Choice | What We Use | Why | Alternative Considered |
|--------|-------------|-----|------------------------|
| Cipher | AES-256-GCM | Industry standard, authenticated encryption, native Node.js support | ChaCha20-Poly1305 (less universal support) |
| KDF | PBKDF2-SHA256 | OWASP recommended, native Node.js support, well-understood | Argon2id (requires native addon) |
| Iterations | 600,000 | OWASP 2024 recommendation for PBKDF2-SHA256 | Higher = slower UX, lower = less secure |
| Salt | 64 bytes random | Exceeds recommendations, prevents rainbow tables | 32 bytes (sufficient but we prefer overkill) |
| IV | 12 bytes random | Native GCM size, unique per file | 16 bytes (works but triggers extra computation) |

### Known Limitations

1. **Password strength is on you** - We enforce 8+ characters, but a weak password undermines everything. Use a passphrase or generated password.

2. **No password recovery** - Forget your password = lose your secrets. We can't help. Keep a backup somewhere safe.

3. **All-or-nothing access** - Can't give someone access to just one file. It's the whole encrypted.json or nothing.

4. **~1 second delay on encrypt/decrypt** - The 600,000 PBKDF2 iterations take time. This is a feature (slows down attackers), not a bug.

5. **Secrets visible in memory** - During encryption/decryption, plaintext exists in Node.js memory. This is true of all encryption tools.

### Why Not Argon2?

You might wonder why we use PBKDF2 instead of Argon2 (the "modern" choice). Reasons:

1. **Native Node.js support** - PBKDF2 is built into Node.js. Argon2 requires native addons that can fail to compile on some systems.
2. **Cross-platform reliability** - Native addons are a common source of "works on my machine" issues, especially on Windows.
3. **PBKDF2 is not broken** - With 600,000 iterations, PBKDF2-SHA256 is still OWASP-recommended and secure.
4. **Zero-dependency philosophy** - Adding `argon2` npm package adds supply chain risk and build complexity.

If you need Argon2, use a tool like SOPS that's designed around it.

### This Project Uses AI Assistance

This repository is developed with assistance from [Claude Code](https://claude.ai/code). The `.claude/` directory contains Claude's configuration for this project. We believe in transparency about AI-assisted development.

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

## Common Questions

### "Is this tested?"

Yes. 29 unit tests with 90%+ code coverage. Run `npm test` yourself or check the [test files](./src/__tests__/).

### "Why not just use a secrets manager?"

Secrets managers (HashiCorp Vault, AWS Secrets Manager, etc.) are great for large enterprises, but they:
- Add infrastructure complexity and cost
- Require network access to decrypt secrets
- Centralize access (single point of compromise)
- Need their own access management

Multi-encrypt is for teams that want simplicity: one password, one encrypted file, zero infrastructure.

For hybrid approaches, use a secrets manager to store *just the decryption password*, and multi-encrypt for the actual secrets. Best of both worlds.

### "Isn't a single encrypted file a single point of failure?"

The file is:
1. **Encrypted** with AES-256-GCM (government-grade)
2. **Authenticated** (tampering is detected)
3. **Version-controlled** (full history, easy rollback)
4. **Distributed** (every clone has a copy)

Compare to alternatives: secrets in environment variables (leaked in logs), secrets managers (network dependency), or plaintext files (accidentally committed).

### "How do I handle team member offboarding?"

1. Decrypt secrets with old password
2. Re-encrypt with new password
3. Commit and push
4. Share new password with remaining team (via secure channel)

Old password holders can see old versions (git history), but not new secrets. If you need to invalidate old secrets entirely, rotate your API keys too.

### "What if I forget the password?"

**You lose your secrets.** There is no recovery mechanism - that's the point of encryption.

Recommendations:
- Store password in a password manager (1Password, Bitwarden)
- Keep offline backup in a secure location
- For teams, ensure multiple people know the password

### "Is the -p flag safe for CI/CD?"

The `-p` flag passes the password as a command argument, which may appear in:
- Process listings (`ps aux`)
- CI/CD logs (if not masked)
- Shell history

Safer alternatives:
```bash
# Use environment variable (most CI/CD systems support secrets)
echo "$SECRETS_PASSWORD" | multi-encrypt dec

# Or configure your CI to mask the argument
multi-encrypt dec -p "${{ secrets.DECRYPT_PASSWORD }}"
```

### "Why is encryption slow (~1 second)?"

The 600,000 PBKDF2 iterations intentionally slow down key derivation. This means:
- **For you**: 1 second wait
- **For attackers**: Billions of years to brute-force

This is a security feature. Fast encryption = fast cracking.

## License
MIT - see LICENSE file for details.