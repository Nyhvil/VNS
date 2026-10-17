import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
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

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Keeps everything in plain files under one directory. Needs no database, so
 * the server runs with zero setup, but the data lives only as long as that
 * directory: on a host without a persistent disk it is gone after a restart.
 * Use DATABASE_URL (PostgresStore) there.
 */
export class FileStore implements DataStore {
  readonly kind = 'file' as const;

  private scans: ScanRow[] = [];
  private logs: LogRow[] = [];
  /** Writes run one after another so two requests never interleave in a file. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly dir: string) {}

  private get scansFile(): string {
    return path.join(this.dir, 'scans.jsonl');
  }

  private get logsFile(): string {
    return path.join(this.dir, 'mailguard_logs.jsonl');
  }

  private get uploadsDir(): string {
    return path.join(this.dir, 'uploads');
  }

  async init(): Promise<void> {
    await fs.mkdir(this.uploadsDir, { recursive: true });
    this.scans = await readJsonLines<ScanRow>(this.scansFile);
    this.logs = await readJsonLines<LogRow>(this.logsFile);
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  async saveImage(id: string, image: StoredImage): Promise<void> {
    const extension = IMAGE_EXTENSIONS[image.contentType];
    if (!extension) throw new Error(`Unsupported image type: ${image.contentType}`);
    await fs.writeFile(path.join(this.uploadsDir, `${id}.${extension}`), image.data);
  }

  async getImage(id: string): Promise<StoredImage | null> {
    for (const [contentType, extension] of Object.entries(IMAGE_EXTENSIONS)) {
      try {
        const data = await fs.readFile(path.join(this.uploadsDir, `${id}.${extension}`));
        return { contentType, data };
      } catch {
        // Not stored with this extension; try the next one.
      }
    }
    return null;
  }

  insertScan(scan: NewScan): Promise<void> {
    return this.enqueue(async () => {
      const row: ScanRow = { id: randomUUID(), created_at: new Date().toISOString(), ...scan };
      await fs.appendFile(this.scansFile, JSON.stringify(row) + '\n');
      this.scans.push(row);
    });
  }

  insertLog(log: NewLog): Promise<void> {
    return this.enqueue(async () => {
      const row: LogRow = { id: randomUUID(), created_at: new Date().toISOString(), feedback: null, ...log };
      await fs.appendFile(this.logsFile, JSON.stringify(row) + '\n');
      this.logs.push(row);
    });
  }

  setFeedbackForLatestLog(sessionId: string, feedback: string): Promise<boolean> {
    return this.enqueue(async () => {
      for (let i = this.logs.length - 1; i >= 0; i--) {
        const log = this.logs[i];
        if (log && log.session_id === sessionId) {
          log.feedback = feedback;
          // Rewrite through a temporary file so a crash cannot leave half a file.
          const tmp = `${this.logsFile}.tmp`;
          await fs.writeFile(tmp, this.logs.map(l => JSON.stringify(l)).join('\n') + '\n');
          await fs.rename(tmp, this.logsFile);
          return true;
        }
      }
      return false;
    });
  }

  async getAdminData(): Promise<AdminData> {
    return {
      stats: computeAdminStats(this.scans, this.logs),
      scans: this.scans.slice(-ADMIN_SCAN_LIMIT).reverse(),
      logs: this.logs.slice(-ADMIN_LOG_LIMIT).reverse(),
    };
  }

  async listScansByAccount(accountId: string, limit: number): Promise<ScanRow[]> {
    return this.scans
      .filter(s => s.account_id === accountId)
      .slice(-limit)
      .reverse();
  }

  async close(): Promise<void> {
    await this.queue;
  }
}

async function readJsonLines<T>(file: string): Promise<T[]> {
  let text: string;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch {
    return [];
  }

  const rows: T[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line) as T);
    } catch {
      // A line cut short by a crash; the rest of the file is still good.
    }
  }
  return rows;
}
