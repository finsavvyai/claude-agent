import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionUtil {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly secretKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // Use HKDF to derive a proper key from the environment variable
    this.secretKey = crypto.hkdfSync('sha256', encryptionKey, '', 'rag-encryption', this.keyLength);
  }

  /**
   * Encrypt sensitive data (like OAuth tokens)
   */
  encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipherGCM(this.algorithm, this.secretKey, iv);
      cipher.setAAD(Buffer.from('rag-oauth-token', 'utf8'));

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Combine iv + tag + encrypted data
      const combined = Buffer.concat([
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ]);

      return combined.toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    try {
      const combined = Buffer.from(encryptedData, 'base64');

      const iv = combined.slice(0, this.ivLength);
      const tag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.ivLength + this.tagLength);

      const decipher = crypto.createDecipherGCM(this.algorithm, this.secretKey, iv);
      decipher.setAAD(Buffer.from('rag-oauth-token', 'utf8'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash sensitive data for comparison (one-way)
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Verify data integrity with HMAC
   */
  sign(data: string): string {
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(data);
    return hmac.digest('hex');
  }

  /**
   * Verify data integrity
   */
  verify(data: string, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}
