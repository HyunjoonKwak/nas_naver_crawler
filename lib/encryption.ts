import crypto from 'crypto';

/**
 * 환경 변수 암호화/복호화 유틸리티
 *
 * AES-256-GCM을 사용하여 안전하게 암호화합니다.
 */

// 암호화 키 (환경 변수에서 가져오기, 없으면 기본값)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-must-be-32-chars!!';
const ALGORITHM = 'aes-256-gcm';

/**
 * 키를 32바이트로 정규화
 */
function getKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

/**
 * 텍스트 암호화
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // IV + AuthTag + 암호화된 텍스트를 하나의 문자열로 합침
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * 텍스트 복호화
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * 값을 마스킹 (화면 표시용)
 */
export function maskValue(value: string, showLength: number = 4): string {
  if (!value || value.length <= showLength) {
    return '*'.repeat(value?.length || 8);
  }

  const visiblePart = value.slice(-showLength);
  const maskedPart = '*'.repeat(Math.min(value.length - showLength, 12));

  return maskedPart + visiblePart;
}
