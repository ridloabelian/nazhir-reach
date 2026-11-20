import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type SqlBindValue = string | number | bigint | Uint8Array | null;

export function toSqlValue(value: unknown): SqlBindValue {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    value instanceof Uint8Array
  ) {
    return value;
  }
  return JSON.stringify(value);
}

export function openDatabase(dbPath: string = 'data/nazhir-reach.db'): DatabaseSync {
  if (dbPath !== ':memory:') {
    const resolvedDir = path.dirname(path.resolve(dbPath));
    fs.mkdirSync(resolvedDir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      episode_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      program_theme TEXT NOT NULL,
      akad_type TEXT NOT NULL,
      accounting_standard TEXT NOT NULL,
      blended_layer TEXT NOT NULL,
      nazhir_name TEXT NOT NULL,
      stbpn_number TEXT,
      lks_pwu_name TEXT,
      laz_permit_number TEXT,
      official_landing_url TEXT NOT NULL,
      beneficiary_summary TEXT NOT NULL,
      impact_report_summary TEXT,
      distribution_cost_idr INTEGER NOT NULL DEFAULT 0,
      target_raise_idr INTEGER NOT NULL DEFAULT 0,
      honest_sroi_multiple REAL,
      status TEXT NOT NULL,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaign_variants (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      channel TEXT NOT NULL,
      segment TEXT NOT NULL,
      format_label TEXT NOT NULL,
      headline TEXT NOT NULL,
      copy_text TEXT NOT NULL,
      cta_label TEXT NOT NULL,
      tracking_url TEXT NOT NULL,
      utm_source TEXT NOT NULL,
      utm_medium TEXT NOT NULL,
      utm_campaign TEXT NOT NULL,
      utm_content TEXT NOT NULL,
      lint_passed INTEGER NOT NULL DEFAULT 0,
      blocker_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      findings_json TEXT NOT NULL DEFAULT '[]',
      scrubbed_copy TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (campaign_id, channel, segment)
    );

    CREATE TABLE IF NOT EXISTS approval_reviews (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      reviewer_name TEXT NOT NULL,
      reviewer_role TEXT NOT NULL,
      reviewer_credential TEXT,
      decision TEXT NOT NULL,
      notes TEXT NOT NULL,
      la_yufti_acknowledged INTEGER NOT NULL,
      content_digest_sha256 TEXT NOT NULL,
      reviewed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS donors (
      donor_key TEXT PRIMARY KEY,
      masked_name TEXT NOT NULL,
      donor_type TEXT NOT NULL DEFAULT 'INDIVIDU',
      first_tx_at TEXT NOT NULL,
      last_tx_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      tx_ref TEXT NOT NULL UNIQUE,
      donor_key TEXT NOT NULL REFERENCES donors(donor_key),
      campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
      variant_id TEXT REFERENCES campaign_variants(id) ON DELETE SET NULL,
      episode_id TEXT NOT NULL,
      utm_source TEXT NOT NULL,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      payment_channel TEXT NOT NULL,
      akad_type TEXT NOT NULL,
      accounting_standard TEXT NOT NULL,
      blended_layer TEXT NOT NULL,
      gross_amount_idr INTEGER NOT NULL,
      fee_pct REAL NOT NULL DEFAULT 0,
      fee_amount_idr INTEGER NOT NULL DEFAULT 0,
      net_program_amount_idr INTEGER NOT NULL,
      is_repeat_donor_tx INTEGER NOT NULL DEFAULT 0,
      occurred_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_episode ON transactions(episode_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_donor ON transactions(donor_key, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_akad ON transactions(akad_type);

    CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      recipient TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  return db;
}
