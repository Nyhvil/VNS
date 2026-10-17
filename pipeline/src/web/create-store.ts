import * as path from 'path';
import { DataStore } from './store';
import { FileStore } from './file-store';
import { DatabaseSslMode, PostgresStore } from './postgres-store';
import { AccountStore } from './accounts/account-store';
import { FileAccountStore } from './accounts/file-account-store';
import { PostgresAccountStore } from './accounts/postgres-account-store';

export interface StoreSettings {
  databaseUrl?: string;
  databaseSsl?: DatabaseSslMode;
  dataDir?: string;
}

const CONNECT_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000;

/**
 * PostgreSQL when DATABASE_URL is set, files otherwise. A database that is
 * configured but cannot be reached is an error: quietly writing to files
 * instead would lose the data on the next restart of a hosted server.
 */
export async function createStore(
  settings: StoreSettings,
  onRetry: (attempt: number, error: unknown) => void = () => undefined
): Promise<DataStore> {
  if (!settings.databaseUrl) {
    const store = new FileStore(path.resolve(settings.dataDir ?? './var'));
    await store.init();
    return store;
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= CONNECT_ATTEMPTS; attempt++) {
    let store: PostgresStore | null = null;
    try {
      store = await PostgresStore.connect(settings.databaseUrl, settings.databaseSsl ?? 'auto');
      await store.init();
      return store;
    } catch (error) {
      lastError = error;
      await store?.close().catch(() => undefined);
      if (attempt < CONNECT_ATTEMPTS) {
        onRetry(attempt, error);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Cannot use the database in DATABASE_URL: ${reason}`);
}

/**
 * Accounts go where the scans go: the same PostgreSQL database, or a file
 * next to the other data files.
 */
export async function createAccountStore(dataStore: DataStore, settings: StoreSettings): Promise<AccountStore> {
  const store: AccountStore =
    dataStore instanceof PostgresStore
      ? new PostgresAccountStore(dataStore.pool)
      : new FileAccountStore(path.resolve(settings.dataDir ?? './var'));
  await store.init();
  return store;
}
