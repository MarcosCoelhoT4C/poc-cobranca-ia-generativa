/**
 * Encryption Service
 * Handles PII encryption and hashing.
 * Uses Node.js built-in crypto (no Fernet dependency needed).
 */
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || 'consorciei-dev-encryption-key-2024',
      'salt',
      32
    );
  }

  encryptPII(data, fieldType) {
    const sensitiveFields = {
      cpf: (d) => this._encrypt(d),
      phone: (d) => this._encrypt(d),
      email: (d) => this._hashEmail(d),
      bank_account: (d) => this._encrypt(d),
      payment_info: (d) => this._encrypt(d),
    };

    if (sensitiveFields[fieldType]) {
      return sensitiveFields[fieldType](data);
    }
    return data;
  }

  decryptPII(encryptedData) {
    return this._decrypt(encryptedData);
  }

  _encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  _decrypt(encryptedText) {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  _hashEmail(email) {
    return crypto.createHash('sha256').update(email).digest('hex').slice(0, 16);
  }

  maskDocument(doc) {
    if (!doc || doc.length < 5) return '***';
    return `${doc.slice(0, 3)}.***.${doc.slice(-2)}`;
  }
}

module.exports = new EncryptionService();
