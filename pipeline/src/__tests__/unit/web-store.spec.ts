import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { computeAdminStats } from '../../web/store';
import { FileStore } from '../../web/file-store';
import { buildPoolConfig } from '../../web/postgres-store';
import { createStore } from '../../web/create-store';

const scan = (overrides: Record<string, unknown> = {}) => ({
  session_id: 's1',
  user_id: 'u1',
  type: 'text' as const,
  content_text: 'hello',
  image_url: null,
  risk_level: 'SAFE',
  ai_result: 'ok',
  dangerous_phrases: [],
  ...overrides,
});

const log = (overrides: Record<string, unknown> = {}) => ({
  session_id: 's1',
  user_id: 'u1',
  text_length: 10,
  scam_percent: 50,
  ...overrides,
});

describe('computeAdminStats()', () => {
  it('should return zeros for an empty store', () => {
    expect(computeAdminStats([], [])).toEqual({
      uniqueSessions: 0,
      totalScans: 0,
      textScans: 0,
      imageScans: 0,
      uniqueUsers: 0,
      returnUsers: 0,
      totalAnalyses: 0,
      avgScamPercent: 0,
      totalCharsAnalyzed: 0,
      returningSessions: 0,
      correctFeedback: 0,
      incorrectFeedback: 0,
    });
  });

  it('should count the same way as the admin-data edge function', () => {
    const scans = [
      { session_id: 's1', user_id: 'u1', type: 'text' as const },
      { session_id: 's1', user_id: 'u1', type: 'image' as const },
      { session_id: 's2', user_id: 'u2', type: 'text' as const },
      { session_id: 's3', user_id: null, type: 'text' as const },
    ];
    const logs = [
      { session_id: 's1', text_length: 100, scam_percent: 90, feedback: 'correct' },
      { session_id: 's1', text_length: 50, scam_percent: 10, feedback: 'incorrect' },
      { session_id: 's2', text_length: 25, scam_percent: 21, feedback: null },
    ];

    expect(computeAdminStats(scans, logs)).toEqual({
      uniqueSessions: 3,
      totalScans: 4,
      textScans: 3,
      imageScans: 1,
      uniqueUsers: 2, // scans without a user id are not counted as a user
      returnUsers: 1, // u1 scanned twice
      totalAnalyses: 3,
      avgScamPercent: 40, // (90 + 10 + 21) / 3 = 40.33
      totalCharsAnalyzed: 175,
      returningSessions: 1,
      correctFeedback: 1,
      incorrectFeedback: 1,
    });
  });
});

describe('FileStore', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vns-store-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('should keep scans and logs and report them to the admin page, newest first', async () => {
    const store = new FileStore(dir);
    await store.init();

    await store.insertScan(scan({ content_text: 'first' }));
    await store.insertScan(scan({ content_text: 'second', session_id: 's2', user_id: 'u2', type: 'image' }));
    await store.insertLog(log({ scam_percent: 80 }));
    await store.insertLog(log({ session_id: 's2', user_id: 'u2', scam_percent: 20 }));

    const admin = await store.getAdminData();
    expect(admin.scans.map(s => s.content_text)).toEqual(['second', 'first']);
    expect(admin.scans[0]).toMatchObject({ type: 'image', session_id: 's2' });
    expect(admin.scans[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Number.isNaN(Date.parse(admin.scans[0]?.created_at ?? ''))).toBe(false);
    expect(admin.logs).toHaveLength(2);
    expect(admin.stats).toMatchObject({ totalScans: 2, imageScans: 1, uniqueUsers: 2, totalAnalyses: 2, avgScamPercent: 50 });
  });

  it('should still have the data after a restart', async () => {
    const first = new FileStore(dir);
    await first.init();
    await first.insertScan(scan());
    await first.insertLog(log());
    await first.setFeedbackForLatestLog('s1', 'correct');
    await first.close();

    const second = new FileStore(dir);
    await second.init();
    const admin = await second.getAdminData();

    expect(admin.stats.totalScans).toBe(1);
    expect(admin.stats.correctFeedback).toBe(1);
    expect(admin.logs[0]?.feedback).toBe('correct');
  });

  it('should attach feedback to the newest log of that session only', async () => {
    const store = new FileStore(dir);
    await store.init();
    await store.insertLog(log({ scam_percent: 1 }));
    await store.insertLog(log({ session_id: 'other', scam_percent: 2 }));
    await store.insertLog(log({ scam_percent: 3 }));

    expect(await store.setFeedbackForLatestLog('s1', 'incorrect')).toBe(true);

    const { logs } = await store.getAdminData();
    expect(logs.map(l => [l.scam_percent, l.feedback])).toEqual([
      [3, 'incorrect'],
      [2, null],
      [1, null],
    ]);
  });

  it('should report that a session has nothing to attach feedback to', async () => {
    const store = new FileStore(dir);
    await store.init();
    expect(await store.setFeedbackForLatestLog('nobody', 'correct')).toBe(false);
  });

  it('should not lose rows when many requests write at once', async () => {
    const store = new FileStore(dir);
    await store.init();

    await Promise.all(Array.from({ length: 50 }, (_, i) => store.insertLog(log({ scam_percent: i }))));
    await Promise.all([
      store.setFeedbackForLatestLog('s1', 'correct'),
      ...Array.from({ length: 10 }, (_, i) => store.insertLog(log({ session_id: `x${i}` }))),
    ]);
    await store.close();

    const reloaded = new FileStore(dir);
    await reloaded.init();
    expect((await reloaded.getAdminData()).stats.totalAnalyses).toBe(60);
  });

  it('should skip a line that was cut short by a crash', async () => {
    fs.writeFileSync(
      path.join(dir, 'mailguard_logs.jsonl'),
      JSON.stringify({ id: 'a', created_at: '2026-01-01T00:00:00Z', feedback: null, ...log() }) + '\n{"id":"b","sess'
    );
    const store = new FileStore(dir);
    await store.init();
    expect((await store.getAdminData()).stats.totalAnalyses).toBe(1);
  });

  it('should store an image and give it back with its type', async () => {
    const store = new FileStore(dir);
    await store.init();
    const data = Buffer.from([1, 2, 3, 4]);

    await store.saveImage('11111111-1111-4111-8111-111111111111', { contentType: 'image/png', data });

    expect(await store.getImage('11111111-1111-4111-8111-111111111111')).toEqual({ contentType: 'image/png', data });
    expect(await store.getImage('22222222-2222-4222-8222-222222222222')).toBeNull();
  });

  it('should refuse to store a file type it does not know', async () => {
    const store = new FileStore(dir);
    await store.init();
    await expect(
      store.saveImage('11111111-1111-4111-8111-111111111111', { contentType: 'text/html', data: Buffer.from('x') })
    ).rejects.toThrow('Unsupported image type');
  });
});

describe('buildPoolConfig()', () => {
  it('should not use TLS for a database on this machine', () => {
    expect(buildPoolConfig('postgres://u:p@localhost:5432/vns').ssl).toBe(false);
    expect(buildPoolConfig('postgres://u:p@127.0.0.1/vns').ssl).toBe(false);
  });

  it('should use TLS for a hosted database', () => {
    expect(buildPoolConfig('postgres://u:p@ep-cool.aws.neon.tech/vns').ssl).toEqual({ rejectUnauthorized: false });
  });

  it('should follow DATABASE_SSL when it is set', () => {
    const url = 'postgres://u:p@db.example.com/vns';
    expect(buildPoolConfig(url, 'verify').ssl).toEqual({ rejectUnauthorized: true });
    expect(buildPoolConfig(url, 'disable').ssl).toBe(false);
    expect(buildPoolConfig('postgres://u:p@localhost/vns', 'require').ssl).toEqual({ rejectUnauthorized: false });
  });

  it('should drop ssl parameters from the URL so they cannot override the setting', () => {
    const config = buildPoolConfig('postgres://u:p@db.example.com/vns?sslmode=require&application_name=vns', 'disable');
    expect(config.connectionString).not.toContain('sslmode');
    expect(config.connectionString).toContain('application_name=vns');
    expect(config.ssl).toBe(false);
  });
});

describe('createStore()', () => {
  it('should use files when no database is configured', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vns-store-'));
    try {
      const store = await createStore({ dataDir: dir });
      expect(store.kind).toBe('file');
      await store.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
