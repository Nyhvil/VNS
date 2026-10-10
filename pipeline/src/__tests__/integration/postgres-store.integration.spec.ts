import { randomUUID } from 'crypto';
import { PostgresStore } from '../../web/postgres-store';
import { createStore } from '../../web/create-store';

/**
 * Runs against a real PostgreSQL when DATABASE_TEST_URL is set, for example:
 *   DATABASE_TEST_URL=postgres://user:pass@127.0.0.1:5432/vns_test npm test
 * The tables scans, mailguard_logs and scan_images of that database are
 * emptied by this test, so point it at a database made for testing.
 */
const DATABASE_TEST_URL = process.env['DATABASE_TEST_URL'];
const describeWithDatabase = DATABASE_TEST_URL ? describe : describe.skip;

describeWithDatabase('PostgresStore (real database)', () => {
  let store: PostgresStore;

  const scan = (overrides: Record<string, unknown> = {}) => ({
    session_id: 's1',
    user_id: 'u1' as string | null,
    type: 'text' as 'text' | 'image',
    content_text: 'Xin chào' as string | null,
    image_url: null as string | null,
    risk_level: 'SAFE',
    ai_result: 'Không có dấu hiệu lừa đảo',
    dangerous_phrases: [] as string[],
    ...overrides,
  });

  beforeAll(async () => {
    store = await PostgresStore.connect(DATABASE_TEST_URL as string);
    await store.init();
  });

  beforeEach(async () => {
    await (store as any).pool.query('TRUNCATE scans, mailguard_logs, scan_images');
  });

  afterAll(async () => {
    await store.close();
  });

  it('should create its tables, and be fine with starting twice', async () => {
    await expect(store.init()).resolves.toBeUndefined();
  });

  it('should keep scans and logs and report them newest first', async () => {
    await store.insertScan(scan({ content_text: 'first', dangerous_phrases: ['mã OTP', 'chuyển khoản'] }));
    await new Promise(resolve => setTimeout(resolve, 15));
    await store.insertScan(scan({ content_text: 'second', session_id: 's2', user_id: null, type: 'image', image_url: '/uploads/x' }));
    await store.insertLog({ session_id: 's1', user_id: 'u1', text_length: 5, scam_percent: 80 });
    await store.insertLog({ session_id: 's2', user_id: null, text_length: 6, scam_percent: 21 });

    const admin = await store.getAdminData();

    expect(admin.scans.map(s => s.content_text)).toEqual(['second', 'first']);
    expect(admin.scans[1]).toMatchObject({
      session_id: 's1',
      user_id: 'u1',
      type: 'text',
      risk_level: 'SAFE',
      dangerous_phrases: ['mã OTP', 'chuyển khoản'],
    });
    expect(admin.scans[0]).toMatchObject({ user_id: null, type: 'image', image_url: '/uploads/x' });
    expect(typeof admin.scans[0]?.created_at).toBe('string');
    expect(Number.isNaN(Date.parse(admin.scans[0]?.created_at ?? ''))).toBe(false);

    expect(admin.stats).toEqual({
      uniqueSessions: 2,
      totalScans: 2,
      textScans: 1,
      imageScans: 1,
      uniqueUsers: 1,
      returnUsers: 0,
      totalAnalyses: 2,
      avgScamPercent: 51, // (80 + 21) / 2 = 50.5
      totalCharsAnalyzed: 11,
      returningSessions: 0,
      correctFeedback: 0,
      incorrectFeedback: 0,
    });
  });

  it('should attach feedback to the newest log of that session only', async () => {
    await store.insertLog({ session_id: 's1', user_id: null, text_length: 1, scam_percent: 1 });
    await new Promise(resolve => setTimeout(resolve, 15));
    await store.insertLog({ session_id: 'other', user_id: null, text_length: 1, scam_percent: 2 });
    await new Promise(resolve => setTimeout(resolve, 15));
    await store.insertLog({ session_id: 's1', user_id: null, text_length: 1, scam_percent: 3 });

    expect(await store.setFeedbackForLatestLog('s1', 'correct')).toBe(true);
    expect(await store.setFeedbackForLatestLog('nobody', 'correct')).toBe(false);

    const { logs, stats } = await store.getAdminData();
    expect(logs.map(l => [l.scam_percent, l.feedback])).toEqual([
      [3, 'correct'],
      [2, null],
      [1, null],
    ]);
    expect(stats.correctFeedback).toBe(1);
  });

  it('should store image bytes unchanged', async () => {
    const id = randomUUID();
    const data = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0x10, 0x80]);

    await store.saveImage(id, { contentType: 'image/png', data });

    const image = await store.getImage(id);
    expect(image?.contentType).toBe('image/png');
    expect(Buffer.compare(image?.data as Buffer, data)).toBe(0);
    expect(await store.getImage(randomUUID())).toBeNull();
  });

  it('should treat text as data, not as SQL', async () => {
    const nasty = "'); DROP TABLE scans; --";
    await store.insertScan(scan({ content_text: nasty, session_id: nasty }));
    await store.setFeedbackForLatestLog(nasty, nasty);

    const admin = await store.getAdminData();
    expect(admin.scans[0]?.content_text).toBe(nasty);
  });

  it('should be chosen by createStore() when a database URL is given', async () => {
    const created = await createStore({ databaseUrl: DATABASE_TEST_URL });
    expect(created.kind).toBe('postgres');
    await created.close();
  });
});

describe('createStore() with a database that cannot be reached', () => {
  it('should fail with a clear message instead of quietly using files', async () => {
    const retries: number[] = [];
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    try {
      const pending = createStore(
        { databaseUrl: 'postgres://nobody:nothing@127.0.0.1:1/none', databaseSsl: 'disable' },
        attempt => retries.push(attempt)
      );
      const outcome = pending.then(
        () => 'resolved',
        (error: Error) => error.message
      );
      for (let i = 0; i < 20; i++) {
        await jest.advanceTimersByTimeAsync(3000);
      }
      expect(await outcome).toContain('Cannot use the database in DATABASE_URL');
      expect(retries).toEqual([1, 2]);
    } finally {
      jest.useRealTimers();
    }
  }, 60_000);
});
