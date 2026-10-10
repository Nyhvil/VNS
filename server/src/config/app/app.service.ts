import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class AppService {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async getApiInfo() {
    try {
      // chạy song song (nhanh hơn)
      const [timeResult, dbResult, tablesResult] = await Promise.all([
        this.pool.query<{ now: Date }>('SELECT NOW() AS now'),
        this.pool.query<{ current_database: string }>(
          'SELECT current_database()',
        ),
        this.pool.query<{ table_name: string }>(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          ORDER BY table_name;
        `),
      ]);

      const tables = tablesResult.rows.map((t) => t.table_name);

      return {
        message: 'MailGuard API is running',
        status: 'ok',
        database: {
          status: 'connected',
          name: dbResult.rows[0]?.current_database,
          tables,
          tables_count: tables.length,
        },
        db_time: timeResult.rows[0]?.now,
      };
    } catch (error) {
      return {
        message: 'MailGuard API is running',
        status: 'ok',
        database: {
          status: 'disconnected',
          name: null,
          tables: [],
          tables_count: 0,
        },
        db_time: null,
        error: error instanceof Error ? error.message : 'unknown',
      };
    }
  }
}
