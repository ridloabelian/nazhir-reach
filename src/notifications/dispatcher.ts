import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { AnalyticsOverview } from '../attribution/service.js';
import { toSqlValue } from '../db/database.js';

export interface DigestDispatchRequest {
  channels?: Array<'waflare' | 'telegram'>;
  dryRun?: boolean;
  recipientLabel?: string;
}

export interface DigestDispatchResult {
  generatedAt: string;
  mode: 'DRY_RUN' | 'LIVE';
  markdownCard: string;
  waflarePayload: {
    target: string;
    messageType: 'NAZHIR_EXECUTIVE_DIGEST';
    text: string;
  };
  telegramPayload: {
    chat_id: string;
    parse_mode: 'Markdown';
    text: string;
  };
  dispatches: Array<{
    channel: 'waflare' | 'telegram';
    status: 'PREVIEW_LOGGED' | 'SENT' | 'FAILED';
    detail: string;
  }>;
}

function formatIdr(value: number): string {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

export function formatExecutiveDigestCard(
  overview: AnalyticsOverview,
  nazhirName = process.env.NAZHIR_NAME ?? 'Yayasan Amal Produktif Indonesia'
): string {
  const topEp = [...overview.byEpisode].sort(
    (a, b) => b.totalMobilizedIdr - a.totalMobilizedIdr
  )[0];
  const topPlatform = overview.byPlatform[0];

  const lines = [
    `*Ringkasan Harian Nazhir & LAZ — ${nazhirName}*`,
    `Waktu: ${overview.generatedAt.slice(0, 16).replace('T', ' ')} UTC`,
    '',
    `*1. Pemisahan Dana (PSAK 412 vs PSAK 109)*`,
    `• Wakaf PSAK 412: ${formatIdr(overview.totals.totalPsak412Idr)} (Abadi: ${formatIdr(overview.fundSegregation.psak412Waqf.wakafUangAbadiIdr)} | CWLS: ${formatIdr(overview.fundSegregation.psak412Waqf.cwlsRitelIdr)})`,
    `• ZIS PSAK 109: ${formatIdr(overview.totals.totalPsak109Idr)} (Zakat Net: ${formatIdr(overview.fundSegregation.psak109Zis.zakatMaalNetIdr)})`,
    `• Total Terhimpun: ${formatIdr(overview.totals.totalMobilizedIdr)} (${overview.totals.totalTransactions} transaksi)`,
    '',
    `*2. Retensi Wakif & Efisiensi Distribusi (ZK-004)*`,
    `• Repeat Wakif Rate (30d / 90d): ${overview.retention.repeatWakifRate30dPct}% / ${overview.retention.repeatWakifRate90dPct}%`,
    `• Rasio Biaya Distribusi / Dana Terhimpun: ${overview.totals.blendedCostRatioPct}%`,
    topEp
      ? `• Konten Terbaik: ${topEp.episodeId} (${topEp.title}) — ${formatIdr(topEp.totalMobilizedIdr)}`
      : '• Konten Terbaik: Belum ada transaksi terhubung',
    topPlatform
      ? `• Kanal Terkuat: ${topPlatform.platform} (${formatIdr(topPlatform.totalMobilizedIdr)})`
      : '• Kanal Terkuat: -',
    '',
    `_Governance: La Yufti Active — Seluruh naskah wajib pengesahan manusia (DPS/Pimpinan)._`
  ];

  return lines.join('\n');
}

export async function dispatchExecutiveDigest(
  db: DatabaseSync,
  overview: AnalyticsOverview,
  req: DigestDispatchRequest = {}
): Promise<DigestDispatchResult> {
  const channels: Array<'waflare' | 'telegram'> = req.channels?.length
    ? req.channels
    : ['waflare', 'telegram'];
  const dryRun = req.dryRun ?? true;
  const card = formatExecutiveDigestCard(overview);

  const waflarePayload = {
    target:
      req.recipientLabel ??
      process.env.WAFLARE_TARGET_GROUP ??
      'grup-pengurus-nazhir',
    messageType: 'NAZHIR_EXECUTIVE_DIGEST' as const,
    text: card
  };

  const telegramPayload = {
    chat_id: process.env.TELEGRAM_CHAT_ID || 'dry-run-chat',
    parse_mode: 'Markdown' as const,
    text: card
  };

  const dispatches: DigestDispatchResult['dispatches'] = [];
  const now = new Date().toISOString();

  for (const ch of channels) {
    let status: 'PREVIEW_LOGGED' | 'SENT' | 'FAILED' = 'PREVIEW_LOGGED';
    let detail = 'Simulasi dry-run tersimpan di notification_logs.';

    if (!dryRun && ch === 'waflare') {
      const url = process.env.WAFLARE_WEBHOOK_URL;
      if (url) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.WAFLARE_API_TOKEN
                ? { Authorization: `Bearer ${process.env.WAFLARE_API_TOKEN}` }
                : {})
            },
            body: JSON.stringify(waflarePayload)
          });
          status = res.ok ? 'SENT' : 'FAILED';
          detail = `HTTP ${res.status} dari waflare webhook`;
        } catch (err) {
          status = 'FAILED';
          detail = err instanceof Error ? err.message : String(err);
        }
      } else {
        detail = 'WAFLARE_WEBHOOK_URL belum disetel; fallback ke dry-run aman.';
      }
    } else if (!dryRun && ch === 'telegram') {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (token && chatId) {
        try {
          const res = await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(telegramPayload)
            }
          );
          status = res.ok ? 'SENT' : 'FAILED';
          detail = `HTTP ${res.status} dari Telegram Bot API`;
        } catch (err) {
          status = 'FAILED';
          detail = err instanceof Error ? err.message : String(err);
        }
      } else {
        detail =
          'TELEGRAM_BOT_TOKEN/CHAT_ID belum disetel; fallback ke dry-run aman.';
      }
    }

    db.prepare(
      `INSERT INTO notification_logs (id, channel, mode, status, recipient, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      toSqlValue(randomUUID()),
      toSqlValue(ch),
      toSqlValue(dryRun ? 'DRY_RUN' : 'LIVE'),
      toSqlValue(status),
      toSqlValue(
        ch === 'waflare' ? waflarePayload.target : telegramPayload.chat_id
      ),
      toSqlValue(ch === 'waflare' ? waflarePayload : telegramPayload),
      toSqlValue(now)
    );

    dispatches.push({ channel: ch, status, detail });
  }

  return {
    generatedAt: now,
    mode: dryRun ? 'DRY_RUN' : 'LIVE',
    markdownCard: card,
    waflarePayload,
    telegramPayload,
    dispatches
  };
}
