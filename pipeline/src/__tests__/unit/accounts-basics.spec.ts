import { nextVnMidnight, vnDayKey, PLANS, GUEST_DAILY_LIMIT } from '../../web/accounts/plans';
import { checkPasswordPolicy, hashPassword, verifyPassword } from '../../web/accounts/password';
import { parseCookies } from '../../web/accounts/cookies';

describe('Vietnamese day', () => {
  it('should change day at 00:00 in Vietnam, which is 17:00 UTC', () => {
    expect(vnDayKey(new Date('2026-10-17T16:59:59Z'))).toBe('2026-10-17');
    expect(vnDayKey(new Date('2026-10-17T17:00:00Z'))).toBe('2026-10-18');
  });

  it('should give the next Vietnamese midnight', () => {
    expect(nextVnMidnight(new Date('2026-10-17T10:00:00Z')).toISOString()).toBe('2026-10-17T17:00:00.000Z');
    expect(nextVnMidnight(new Date('2026-10-17T17:00:00Z')).toISOString()).toBe('2026-10-18T17:00:00.000Z');
    // End of month and of year.
    expect(nextVnMidnight(new Date('2026-12-31T18:00:00Z')).toISOString()).toBe('2027-01-01T17:00:00.000Z');
  });
});

describe('plans', () => {
  it('should hold the prices of the business model', () => {
    expect(GUEST_DAILY_LIMIT).toBe(5);
    expect(PLANS.free).toMatchObject({ pricePerMonth: 0, dailyLimit: 10 });
    expect(PLANS.premium.pricePerMonth).toBe(29_000);
    expect(PLANS.family.pricePerMonth).toBe(109_000);
  });
});

describe('passwords', () => {
  it('should verify the right password and reject a wrong one', async () => {
    const hash = await hashPassword('mat-khau-dai-123');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(hash).not.toContain('mat-khau');
    expect(await verifyPassword('mat-khau-dai-123', hash)).toBe(true);
    expect(await verifyPassword('mat-khau-dai-124', hash)).toBe(false);
  });

  it('should salt every hash', async () => {
    expect(await hashPassword('giong-nhau-1')).not.toBe(await hashPassword('giong-nhau-1'));
  });

  it('should treat the same Vietnamese text typed in either Unicode form as equal', async () => {
    const composed = 'mậtkhẩu123'.normalize('NFC');
    const decomposed = composed.normalize('NFD');
    expect(await verifyPassword(decomposed, await hashPassword(composed))).toBe(true);
  });

  it('should reject a malformed stored hash', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
  });

  it('should ask for 8 to 128 characters', () => {
    expect(checkPasswordPolicy('1234567')).toContain('ít nhất 8');
    expect(checkPasswordPolicy('12345678')).toBeNull();
    expect(checkPasswordPolicy('a'.repeat(129))).toContain('tối đa');
    expect(checkPasswordPolicy(undefined)).toContain('nhập mật khẩu');
  });
});

describe('parseCookies()', () => {
  it('should read cookies and keep the first of duplicate names', () => {
    expect(parseCookies('a=1; b=hello%20world; a=2; broken; =x')).toEqual({ a: '1', b: 'hello world' });
    expect(parseCookies(undefined)).toEqual({});
  });
});
