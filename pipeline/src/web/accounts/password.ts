import { randomBytes, scrypt, timingSafeEqual } from 'crypto';

/**
 * Password hashing with scrypt (built into Node, no extra dependency).
 * Stored as "scrypt$N$r$p$salt$hash" so the cost can be raised later without
 * breaking existing hashes.
 */

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFC'), salt, KEY_LENGTH, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key)
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash ?? '', 'base64');
  const key = await derive(password, Buffer.from(salt ?? '', 'base64'), Number(n), Number(r), Number(p));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/**
 * A hash to check against when the email is unknown, so that a wrong email
 * takes as long to reject as a wrong password and does not reveal which
 * accounts exist.
 */
let dummyHash: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  if (!dummyHash) dummyHash = hashPassword(randomBytes(16).toString('hex'));
  return dummyHash;
}

/** A message for the user when the password is not acceptable, else null. */
export function checkPasswordPolicy(password: unknown): string | null {
  if (typeof password !== 'string') return 'Vui lòng nhập mật khẩu.';
  if (password.length < MIN_PASSWORD_LENGTH) return `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Mật khẩu dài tối đa ${MAX_PASSWORD_LENGTH} ký tự.`;
  return null;
}
