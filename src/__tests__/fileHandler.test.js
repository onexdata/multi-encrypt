// src/__tests__/fileHandler.test.js

// Mock dependencies - must be before requires
jest.mock('../lib/crypto');
jest.mock('fs');
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));
jest.mock('chalk', () => {
  const mockChalk = (text) => text;
  mockChalk.green = jest.fn(text => text);
  mockChalk.red = jest.fn(text => text);
  mockChalk.yellow = jest.fn(text => text);
  mockChalk.blue = jest.fn(text => text);
  mockChalk.cyan = jest.fn(text => text);
  mockChalk.gray = jest.fn(text => text);
  mockChalk.dim = jest.fn(text => text);
  mockChalk.bold = jest.fn(text => text);
  return mockChalk;
});

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { handleEncryption, handleDecryption, _internal } = require('../lib/fileHandler');
const cryptoLib = require('../lib/crypto');

// Mock crypto.randomBytes (used in fileHandler)
jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.alloc(64, 'a'));

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

// Mock console methods
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});

describe('FileHandler Module', () => {
  const testPassword = 'test-password-123';
  const testSalt = Buffer.alloc(64, 'a');
  const testKey = Buffer.alloc(32, 'k');
  const mockEncryptedData = {
    iv: 'test-iv',
    encrypted: 'test-encrypted',
    tag: 'test-tag'
  };

  const gitignoreContent = '# Random stuff\nnode_modules\n\n# Secret\ntest-secret.txt\nconfig/secret.json';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup crypto mocks
    cryptoLib.getPassword.mockResolvedValue(testPassword);
    cryptoLib.deriveKey.mockReturnValue(testKey);
    cryptoLib.encryptData.mockReturnValue(mockEncryptedData);
    cryptoLib.decryptData.mockReturnValue(Buffer.from('decrypted-content'));
    cryptoLib.isLegacyFormat.mockReturnValue(false);
    cryptoLib.ENCRYPTION_CONFIG = { saltLength: 64 };

    // Setup fs mocks
    fs.existsSync.mockReturnValue(true);
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
    fs.readFileSync.mockImplementation((filepath, options) => {
      if (filepath === '.gitignore') {
        return gitignoreContent;
      }
      if (filepath === 'encrypted.json') {
        return JSON.stringify({
          version: 2,
          salt: testSalt.toString('base64'),
          files: {
            'test-secret.txt': mockEncryptedData,
            'config/secret.json': mockEncryptedData
          }
        });
      }
      if (filepath === 'test-secret.txt' || filepath === 'config/secret.json') {
        return Buffer.from('test-content');
      }
      return Buffer.from('');
    });
  });

  describe('getSecretFilesFromGitignore', () => {
    it('should correctly parse secret files from .gitignore', () => {
      const secretFiles = _internal.getSecretFilesFromGitignore();
      expect(secretFiles).toEqual(['test-secret.txt', 'config/secret.json']);
    });

    it('should handle missing .gitignore file', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const secretFiles = _internal.getSecretFilesFromGitignore();
      expect(secretFiles).toEqual([]);
    });

    it('should ignore comments and empty lines', () => {
      fs.readFileSync.mockReturnValue(
        'node_modules\n' +
        '\n' +
        '# Secrets\n' +
        '# Comment\n' +
        'test-secret.txt\n' +
        '  # Another comment'
      );

      const secretFiles = _internal.getSecretFilesFromGitignore();
      expect(secretFiles).toEqual(['test-secret.txt']);
    });

    it('should handle no secrets section', () => {
      fs.readFileSync.mockReturnValue(
        'node_modules\n' +
        '.DS_Store'
      );

      const secretFiles = _internal.getSecretFilesFromGitignore();
      expect(secretFiles).toEqual([]);
    });
  });

  describe('handleEncryption', () => {
    it('should successfully encrypt files', async () => {
      await handleEncryption();

      // Should get password
      expect(cryptoLib.getPassword).toHaveBeenCalled();

      // Should encrypt files
      expect(cryptoLib.encryptData).toHaveBeenCalledTimes(2);

      // Should write encrypted.json
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'encrypted.json',
        expect.any(String)
      );

      // Verify the written content includes version
      const writtenContent = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
      expect(writtenContent.version).toBe(2);
      expect(writtenContent.salt).toBeDefined();
      expect(writtenContent.files).toBeDefined();
    });

    it('should handle missing files gracefully', async () => {
      fs.existsSync.mockImplementation(filepath => {
        if (filepath === 'test-secret.txt') return false;
        return true;
      });

      await handleEncryption();

      // Should only encrypt the file that exists
      expect(cryptoLib.encryptData).toHaveBeenCalledTimes(1);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle no secret files', async () => {
      fs.readFileSync.mockImplementation((filepath) => {
        if (filepath === '.gitignore') {
          return '# Just regular ignores\nnode_modules\n.DS_Store';
        }
        return Buffer.from('');
      });

      await handleEncryption();

      expect(cryptoLib.encryptData).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should accept password option for CI/CD', async () => {
      await handleEncryption({ password: 'ci-password' });

      expect(cryptoLib.getPassword).toHaveBeenCalledWith('ci-password');
    });
  });

  describe('handleDecryption', () => {
    it('should successfully decrypt files', async () => {
      await handleDecryption();

      expect(fs.readFileSync).toHaveBeenCalledWith('encrypted.json', 'utf8');
      expect(cryptoLib.decryptData).toHaveBeenCalledWith(
        mockEncryptedData.encrypted,
        testKey,
        mockEncryptedData.iv,
        mockEncryptedData.tag
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'test-secret.txt',
        expect.any(Buffer)
      );
    });

    it('should create directories if needed', async () => {
      fs.existsSync.mockImplementation(filepath => {
        if (filepath === 'config') return false;
        return true;
      });

      await handleDecryption();

      expect(fs.mkdirSync).toHaveBeenCalledWith('config', { recursive: true });
    });

    it('should handle missing encrypted.json', async () => {
      fs.existsSync.mockReturnValue(false);

      await handleDecryption();

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle decryption errors gracefully', async () => {
      cryptoLib.decryptData
        .mockImplementationOnce(() => { throw new Error('Decryption failed'); })
        .mockReturnValue(Buffer.from('decrypted-content'));

      await handleDecryption();

      // Should continue with second file after first fails
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'config/secret.json',
        expect.any(Buffer)
      );
    });

    it('should accept password option for CI/CD', async () => {
      await handleDecryption({ password: 'ci-password' });

      expect(cryptoLib.getPassword).toHaveBeenCalledWith('ci-password');
    });

    it('should detect and handle legacy v1 format', async () => {
      cryptoLib.isLegacyFormat.mockReturnValue(true);
      cryptoLib.deriveLegacyKey.mockReturnValue(testKey);
      cryptoLib.decryptLegacyData.mockReturnValue(Buffer.from('legacy-content'));

      fs.readFileSync.mockImplementation((filepath) => {
        if (filepath === 'encrypted.json') {
          return JSON.stringify({
            files: {
              'test-secret.txt': 'legacy-encrypted-string'
            }
          });
        }
        return Buffer.from('');
      });

      await handleDecryption();

      expect(cryptoLib.isLegacyFormat).toHaveBeenCalled();
    });
  });
});
