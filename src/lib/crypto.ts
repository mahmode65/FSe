/**
 * Cryptographic helper functions for hashing sensitive credentials
 * such as National ID and Student Code.
 * Plaintext values are NEVER stored in Firestore.
 */

const SALT_PEPPER = 'field_training_salt_v1_secure_2026';

export async function hashCredential(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const data = new TextEncoder().encode(`${normalized}::${SALT_PEPPER}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function maskNationalId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length <= 4) return '****';
  return '*'.repeat(trimmed.length - 4) + trimmed.slice(-4);
}

export function maskStudentCode(code: string): string {
  const trimmed = code.trim();
  if (trimmed.length <= 3) return trimmed;
  return `${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`;
}
