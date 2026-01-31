// src/__tests__/crypto.test.js
const fs = require('fs');
const path = require('path');
const crypto = require('../lib/crypto');

// Mock the inquirer module
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));

// Mock console.log to keep test output clean
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Crypto Module', () => {
  const testPassword = 'test-password-123';
  
  beforeEach(() => {
    // Mock password prompt
    require('inquirer').prompt.mockResolvedValue({ password: testPassword });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('encryption and decryption', () => {
    it('should successfully encrypt and decrypt data', () => {
      const testData = Buffer.from('test-secret-content');
      const password = 'test-password';
      const salt = Buffer.from('test-salt');
      
      const key = crypto.deriveKey(password, salt);
      const encrypted = crypto.encryptData(testData, key);
      
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      
      const decrypted = crypto.decryptData(
        encrypted.encrypted,
        key,
        encrypted.iv,
        encrypted.tag
      );
      
      expect(decrypted.toString()).toBe('test-secret-content');
    });
    
    it('should fail with wrong password', () => {
      const testData = Buffer.from('test-secret-content');
      const correctKey = crypto.deriveKey('correct-password', Buffer.from('salt'));
      const wrongKey = crypto.deriveKey('wrong-password', Buffer.from('salt'));
      
      const encrypted = crypto.encryptData(testData, correctKey);
      
      expect(() => {
        crypto.decryptData(
          encrypted.encrypted,
          wrongKey,
          encrypted.iv,
          encrypted.tag
        );
      }).toThrow();
    });

    it('should handle empty data', () => {
      const testData = Buffer.from('');
      const password = 'test-password';
      const salt = Buffer.from('test-salt');
      
      const key = crypto.deriveKey(password, salt);
      const encrypted = crypto.encryptData(testData, key);
      
      const decrypted = crypto.decryptData(
        encrypted.encrypted,
        key,
        encrypted.iv,
        encrypted.tag
      );
      
      expect(decrypted.toString()).toBe('');
    });

    it('should handle large data', () => {
      const testData = Buffer.from('a'.repeat(1000000)); // 1MB of data
      const password = 'test-password';
      const salt = Buffer.from('test-salt');
      
      const key = crypto.deriveKey(password, salt);
      const encrypted = crypto.encryptData(testData, key);
      
      const decrypted = crypto.decryptData(
        encrypted.encrypted,
        key,
        encrypted.iv,
        encrypted.tag
      );
      
      expect(decrypted.toString()).toBe('a'.repeat(1000000));
    });
  });
  
  describe('password handling', () => {
    it('should validate password length', async () => {
      // Spy on the prompt to capture the validation function
      const promptSpy = jest.spyOn(require('inquirer'), 'prompt');
      
      // Trigger getPassword to capture the prompt configuration
      crypto.getPassword();
      
      // Get the validation function from the first call to prompt
      expect(promptSpy).toHaveBeenCalled();
      const validateFn = promptSpy.mock.calls[0][0][0].validate;
      
      // Test validation with short password
      const shortPasswordResult = validateFn('123');
      expect(shortPasswordResult).toBe('Password must be at least 8 characters');
      
      // Test validation with valid password
      const validPasswordResult = validateFn('12345678');
      expect(validPasswordResult).toBe(true);
    });

    it('should accept valid password', async () => {
      const validPassword = '12345678';
      require('inquirer').prompt.mockResolvedValueOnce({ password: validPassword });
      
      const password = await crypto.getPassword();
      expect(password).toBe(validPassword);
    });
  });
  
  describe('encryption configuration', () => {
    it('should use secure settings', () => {
      expect(crypto.ENCRYPTION_CONFIG.algorithm).toBe('aes-256-gcm');
      expect(crypto.ENCRYPTION_CONFIG.keyLength).toBe(32); // 256 bits
      expect(crypto.ENCRYPTION_CONFIG.iterations).toBeGreaterThanOrEqual(100000);
      expect(crypto.ENCRYPTION_CONFIG.saltLength).toBeGreaterThanOrEqual(64);
    });

    it('should use appropriate IV length', () => {
      expect(crypto.ENCRYPTION_CONFIG.ivLength).toBe(12); // 96 bits - native GCM IV size
    });

    it('should use appropriate tag length', () => {
      expect(crypto.ENCRYPTION_CONFIG.tagLength).toBe(16); // 128 bits
    });
  });

  describe('key derivation', () => {
    it('should derive different keys for different passwords', () => {
      const salt = Buffer.from('test-salt');
      const key1 = crypto.deriveKey('password1', salt);
      const key2 = crypto.deriveKey('password2', salt);

      expect(Buffer.compare(key1, key2)).not.toBe(0);
    });

    it('should derive different keys for different salts', () => {
      const password = 'test-password';
      const key1 = crypto.deriveKey(password, Buffer.from('salt1'));
      const key2 = crypto.deriveKey(password, Buffer.from('salt2'));

      expect(Buffer.compare(key1, key2)).not.toBe(0);
    });
  });

  describe('legacy support', () => {
    it('should derive legacy key with static salt', () => {
      const key = crypto.deriveLegacyKey('test-password');
      expect(key).toBeDefined();
      expect(key.length).toBe(crypto.LEGACY_CONFIG.keyLength);
    });

    it('should detect legacy format (no version, no salt)', () => {
      expect(crypto.isLegacyFormat({ files: {} })).toBe(true);
      expect(crypto.isLegacyFormat({ version: 2, salt: 'abc', files: {} })).toBe(false);
      expect(crypto.isLegacyFormat({ salt: 'abc', files: {} })).toBe(false);
    });

    it('should have correct legacy config', () => {
      expect(crypto.LEGACY_CONFIG.algorithm).toBe('cast5-cbc');
      expect(crypto.LEGACY_CONFIG.saltString).toBe('nodecipher');
      expect(crypto.LEGACY_CONFIG.iterations).toBe(1000);
      expect(crypto.LEGACY_CONFIG.digest).toBe('sha1');
    });
  });

  describe('password with provided value', () => {
    it('should return provided password without prompting', async () => {
      const providedPassword = 'my-ci-password';
      const password = await crypto.getPassword(providedPassword);

      expect(password).toBe(providedPassword);
      expect(require('inquirer').prompt).not.toHaveBeenCalled();
    });
  });
});