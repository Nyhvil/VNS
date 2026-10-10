import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';

// Hosted Postgres (Supabase, Neon, Render...) needs SSL, so SSL stays on by
// default. A local Postgres (for example the one in docker-compose.yml) has no
// SSL: set DATABASE_SSL=false in server/.env to connect to it.
function isSslDisabled(): boolean {
  const raw = (process.env.DATABASE_SSL ?? '').trim().toLowerCase();
  return ['false', '0', 'off', 'no', 'disable', 'disabled'].includes(raw);
}

@Global()
@Module({
  providers: [
    {
      provide: 'PG_POOL',
      useFactory: () => {
        return new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: isSslDisabled()
            ? false
            : {
                rejectUnauthorized: false,
              },
        });
      },
    },
  ],
  exports: ['PG_POOL'],
})
export class DatabaseModule {}
