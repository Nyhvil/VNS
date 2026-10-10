#!/usr/bin/env node
/**
 * Create the database schema on an empty database, then apply the migrations.
 *
 *   npm run db:init
 *
 * Reads DATABASE_URL (and DATABASE_SSL) from the environment or from
 * server/.env. Safe to run again: the base schema is skipped when it already
 * exists and every migration is written to be re-runnable.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ROOT = path.join(__dirname, '..');
const SCHEMA_FILE = path.join(ROOT, 'src/database/seeds/MailGuard_db.sql');
const MIGRATIONS_DIR = path.join(ROOT, 'src/database/migrations');

function loadEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function isSslDisabled() {
  const raw = (process.env.DATABASE_SSL || '').trim().toLowerCase();
  return ['false', '0', 'off', 'no', 'disable', 'disabled'].includes(raw);
}

function readSql(file) {
  // Some files start with a UTF-8 byte order mark, which Postgres rejects.
  return fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
}

async function main() {
  loadEnvFile();

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: isSslDisabled() ? false : { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const existing = await client.query(
      "SELECT to_regclass('public.users') IS NOT NULL AS present",
    );

    if (existing.rows[0].present) {
      console.log('- base schema: already there, skipped');
    } else {
      await client.query(readSql(SCHEMA_FILE));
      console.log('- base schema: created');
    }

    const migrations = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith('.sql'))
      .sort();

    for (const name of migrations) {
      await client.query(readSql(path.join(MIGRATIONS_DIR, name)));
      console.log(`- ${name}: applied`);
    }

    console.log('Database is ready.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Database setup failed: ${error.message}`);
  if (/does not support SSL/i.test(String(error.message))) {
    console.error(
      'This database has no SSL (normal for a local Postgres). Add DATABASE_SSL=false to server/.env.',
    );
  }
  process.exit(1);
});
