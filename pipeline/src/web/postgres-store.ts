import { randomUUID } from 'crypto';
import type { Pool, PoolConfig } from 'pg';
import {
  ADMIN_LOG_LIMIT,
  ADMIN_SCAN_LIMIT,
  AdminData,
  computeAdminStats,
  DataStore,
  LogRow,
  NewLog,
  NewScan,
  ScanRow,
  StoredImage,
} from './store';

export type DatabaseSslMode = 'auto' | 'require' | 'verify' | 'disable';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Connection settings for `pg`.
 *
 * - auto (default): no TLS for a database on this machine, TLS without
 *   certificate verification for any other host. Hosted databases require TLS,
 *   and several of them (Supabase, Render) use certificates that are not signed
 *   by a public authority.
 * - require: TLS without certificate verification.
 * - verify:  TLS, and the certificate must be valid.
 * - disable: no TLS.
 */
export function buildPoolConfig(databaseUrl: string, sslMode: DatabaseSslMode = 'auto'): PoolConfig {
  const url = new URL(databaseUrl);

  // `pg` lets ssl settings in the URL override the ones passed in code, so the
  // decision is made here and the URL parameters are dropped.
  for (const name of ['sslmode', 'ssl', 'sslcert', 'sslkey', 'sslrootcert']) {
    url.searchParams.delete(name);
  }

  let ssl: PoolConfig['ssl'];
  if (sslMode === 'disable') ssl = false;
  else if (sslMode === 'verify') ssl = { rejectUnauthorized: true };
  else if (sslMode === 'require') ssl = { rejectUnauthorized: false };
  else ssl = LOCAL_HOSTS.has(url.hostname) ? false : { rejectUnauthorized: false };

  return { connectionString: url.toString(), ssl, max: 5, connectionTimeoutMillis: 10_000 };
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  user_id text,
  type text NOT NULL,
  content_text text,
  image_url text,
  risk_level text NOT NULL,
  ai_result text NOT NULL,
  dangerous_phrases text[] DEFAULT '{}'::text[]
);
CREATE TABLE IF NOT EXISTS mailguard_logs (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  user_id text,
  text_length integer NOT NULL DEFAULT 0,
  scam_percent integer NOT NULL DEFAULT 0,
  feedback text
);
CREATE TABLE IF NOT EXISTS scan_images (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  content_type text NOT NULL,
  data bytea NOT NULL
);
CREATE INDEX IF NOT EXISTS scans_created_at_idx ON scans (created_at DESC);
CREATE INDEX IF NOT EXISTS mailguard_logs_created_at_idx ON mailguard_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS mailguard_logs_session_idx ON mailguard_logs (session_id, created_at DESC);
`;

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

/** Keeps the data in PostgreSQL (any provider: Neon, Supabase, Render, your own). */
export class PostgresStore implements DataStore {
  readonly kind = 'postgres' as const;

  constructor(private readonly pool: Pool) {}

  static async connect(databaseUrl: string, sslMode: DatabaseSslMode = 'auto'): Promise<PostgresStore> {
    const { Pool: PgPool } = await import('pg');
    const pool = new PgPool(buildPoolConfig(databaseUrl, sslMode));
    // An idle connection dropped by the server must not crash the process.
    pool.on('error', () => undefined);
    return new PostgresStore(pool);
  }

  async init(): Promise<void> {
    await this.pool.query(SCHEMA);
  }

  async saveImage(id: string, image: StoredImage): Promise<void> {
    await this.pool.query('INSERT INTO scan_images (id, content_type, data) VALUES ($1, $2, $3)', [
      id,
      image.contentType,
      image.data,
    ]);
  }

  async getImage(id: string): Promise<StoredImage | null> {
    const result = await this.pool.query('SELECT content_type, data FROM scan_images WHERE id = $1', [id]);
    const row = result.rows[0];
    return row ? { contentType: row.content_type, data: row.data } : null;
  }

  async insertScan(scan: NewScan): Promise<void> {
    await this.pool.query(
      `INSERT INTO scans (id, session_id, user_id, type, content_text, image_url, risk_level, ai_result, dangerous_phrases)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        scan.session_id,
        scan.user_id,
        scan.type,
        scan.content_text,
        scan.image_url,
        scan.risk_level,
        scan.ai_result,
        scan.dangerous_phrases,
      ]
    );
  }

  async insertLog(log: NewLog): Promise<void> {
    await this.pool.query(
      `INSERT INTO mailguard_logs (id, session_id, user_id, text_length, scam_percent)
       VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), log.session_id, log.user_id, log.text_length, log.scam_percent]
    );
  }

  async setFeedbackForLatestLog(sessionId: string, feedback: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE mailguard_logs SET feedback = $2
       WHERE id = (
         SELECT id FROM mailguard_logs WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1
       )`,
      [sessionId, feedback]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getAdminData(): Promise<AdminData> {
    const [scans, logs, scanStats, logStats] = await Promise.all([
      this.pool.query('SELECT * FROM scans ORDER BY created_at DESC LIMIT $1', [ADMIN_SCAN_LIMIT]),
      this.pool.query('SELECT * FROM mailguard_logs ORDER BY created_at DESC LIMIT $1', [ADMIN_LOG_LIMIT]),
      this.pool.query('SELECT session_id, user_id, type FROM scans'),
      this.pool.query('SELECT session_id, text_length, scam_percent, feedback FROM mailguard_logs'),
    ]);

    return {
      stats: computeAdminStats(scanStats.rows, logStats.rows),
      scans: scans.rows.map(
        (row): ScanRow => ({
          ...row,
          created_at: toIso(row.created_at),
          dangerous_phrases: row.dangerous_phrases ?? [],
        })
      ),
      logs: logs.rows.map((row): LogRow => ({ ...row, created_at: toIso(row.created_at) })),
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
