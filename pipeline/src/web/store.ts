/**
 * Storage of the standalone web server: what people checked (`scans`), one
 * line of numbers per analysis (`mailguard_logs`) and the uploaded images.
 *
 * Table and column names are the same as in the Supabase project of the
 * Lovable version, so the admin page and its statistics work unchanged.
 */

export interface ScanRow {
  id: string;
  created_at: string;
  session_id: string;
  user_id: string | null;
  type: 'text' | 'image';
  content_text: string | null;
  image_url: string | null;
  risk_level: string;
  ai_result: string;
  dangerous_phrases: string[];
}

export interface LogRow {
  id: string;
  created_at: string;
  session_id: string;
  user_id: string | null;
  text_length: number;
  scam_percent: number;
  feedback: string | null;
}

export type NewScan = Omit<ScanRow, 'id' | 'created_at'>;
export type NewLog = Omit<LogRow, 'id' | 'created_at' | 'feedback'>;

export interface StoredImage {
  contentType: string;
  data: Buffer;
}

export interface AdminStats {
  uniqueSessions: number;
  totalScans: number;
  textScans: number;
  imageScans: number;
  uniqueUsers: number;
  returnUsers: number;
  totalAnalyses: number;
  avgScamPercent: number;
  totalCharsAnalyzed: number;
  returningSessions: number;
  correctFeedback: number;
  incorrectFeedback: number;
}

export interface AdminData {
  stats: AdminStats;
  scans: ScanRow[];
  logs: LogRow[];
}

export interface DataStore {
  /** "postgres" keeps data across restarts; "file" only as long as the disk does. */
  readonly kind: 'postgres' | 'file';
  init(): Promise<void>;
  saveImage(id: string, image: StoredImage): Promise<void>;
  getImage(id: string): Promise<StoredImage | null>;
  insertScan(scan: NewScan): Promise<void>;
  insertLog(log: NewLog): Promise<void>;
  /** Attach feedback to the newest log of the session. False when there is none. */
  setFeedbackForLatestLog(sessionId: string, feedback: string): Promise<boolean>;
  getAdminData(): Promise<AdminData>;
  close(): Promise<void>;
}

/** Rows shown in the admin table; the statistics always cover every row. */
export const ADMIN_SCAN_LIMIT = 500;
export const ADMIN_LOG_LIMIT = 1000;

type ScanStatFields = Pick<ScanRow, 'session_id' | 'user_id' | 'type'>;
type LogStatFields = Pick<LogRow, 'session_id' | 'text_length' | 'scam_percent' | 'feedback'>;

/**
 * The numbers on the admin page, computed the same way as the `admin-data`
 * edge function of the Lovable version.
 */
export function computeAdminStats(scans: ScanStatFields[], logs: LogStatFields[]): AdminStats {
  const userIds = scans.map(s => s.user_id).filter((id): id is string => !!id);
  const scansPerUser = new Map<string, number>();
  for (const id of userIds) scansPerUser.set(id, (scansPerUser.get(id) ?? 0) + 1);

  const logsPerSession = new Map<string, number>();
  for (const log of logs) logsPerSession.set(log.session_id, (logsPerSession.get(log.session_id) ?? 0) + 1);

  const totalAnalyses = logs.length;

  return {
    uniqueSessions: new Set(scans.map(s => s.session_id).filter(Boolean)).size,
    totalScans: scans.length,
    textScans: scans.filter(s => s.type === 'text').length,
    imageScans: scans.filter(s => s.type === 'image').length,
    uniqueUsers: scansPerUser.size,
    returnUsers: [...scansPerUser.values()].filter(count => count > 1).length,
    totalAnalyses,
    avgScamPercent:
      totalAnalyses > 0
        ? Math.round(logs.reduce((sum, l) => sum + (l.scam_percent || 0), 0) / totalAnalyses)
        : 0,
    totalCharsAnalyzed: logs.reduce((sum, l) => sum + (l.text_length || 0), 0),
    returningSessions: [...logsPerSession.values()].filter(count => count > 1).length,
    correctFeedback: logs.filter(l => l.feedback === 'correct').length,
    incorrectFeedback: logs.filter(l => l.feedback === 'incorrect').length,
  };
}
