import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/database.js';
import { seedDemoData } from '../src/db/seed.js';

describe('Hono REST API & Web Dashboard Integration', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = openDatabase(':memory:');
    seedDemoData(db, new Date('2026-11-20T10:00:00.000Z'));
  });

  afterEach(() => {
    db.close();
  });

  it('serves health endpoint and editorial web dashboard on /', async () => {
    const app = createApp(db, { port: 8793 });

    const healthRes = await app.request('/api/health');
    expect(healthRes.status).toBe(200);
    const health = (await healthRes.json()) as {
      ok: boolean;
      port: number;
      principle: string;
    };
    expect(health.ok).toBe(true);
    expect(health.port).toBe(8793);
    expect(health.principle).toBe('LA_YUFTI');

    const htmlRes = await app.request('/');
    expect(htmlRes.status).toBe(200);
    const html = await htmlRes.text();
    expect(html).toContain('nazhir-reach');
    expect(html).toContain('#08101F');
    expect(html).toContain('La Yufti');
  });

  it('runs linter check, campaign creation, DPS gate, webhook ingest, SROI, Odoo export, and digest preview', async () => {
    const app = createApp(db, { port: 8793 });

    // 1. Linter block check
    const lintRes = await app.request('/api/linter/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Wakaf uang dijamin cuan 20% masuk rekening pribadi NIK 3273011205900001.',
        akadType: 'wakaf_uang_abadi'
      })
    });
    expect(lintRes.status).toBe(200);
    const lintBody = (await lintRes.json()) as {
      passed: boolean;
      blockerCount: number;
      scrubbedCopy: string;
    };
    expect(lintBody.passed).toBe(false);
    expect(lintBody.blockerCount).toBeGreaterThanOrEqual(3);
    expect(lintBody.scrubbedCopy).toContain('[REDACTED_NIK_ATAU_KK_16]');

    // 2. Create campaign & enforce DPS approval gate
    const createRes = await app.request('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Wakaf Produktif Green House Melon',
        episodeId: 'EP-API-99',
        programTheme: 'Hortikultura Hidroponik Modern',
        akadType: 'wakaf_uang_abadi',
        nazhirName: 'Yayasan Amal Produktif Indonesia',
        stbpnNumber: '3.3.00386',
        lksPwuName: 'Bank Syariah Indonesia (BSI)',
        officialLandingUrl: 'https://wakaf.amalproduktif.or.id/melon',
        beneficiarySummary: '60 pemuda tani desa binaan'
      })
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      campaign: { id: string; status: string };
    };
    expect(created.campaign.status).toBe('PENDING_DPS_REVIEW');

    // Attempt approval without La Yufti acknowledgement -> 422
    const badApprove = await app.request(
      `/api/campaigns/${created.campaign.id}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerName: 'Ust. Ahmad',
          reviewerRole: 'DPS',
          approved: true,
          laYuftiAcknowledged: false
        })
      }
    );
    expect(badApprove.status).toBe(422);

    // Valid DPS approval -> 200
    const goodApprove = await app.request(
      `/api/campaigns/${created.campaign.id}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerName: 'Ust. Ahmad',
          reviewerRole: 'DPS',
          approved: true,
          laYuftiAcknowledged: true
        })
      }
    );
    expect(goodApprove.status).toBe(200);
    const approvedBody = (await goodApprove.json()) as {
      campaign: { status: string };
    };
    expect(approvedBody.campaign.status).toBe('APPROVED_FOR_PUBLISH');

    // 3. Ingest transaction webhook & inspect analytics + Odoo export
    const txRes = await app.request('/api/webhooks/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txRef: 'TX-API-9901',
        donorKey: 'WKF-API-1',
        donorMaskedName: 'Zaki H.',
        episodeId: 'EP-API-99',
        utmSource: 'instagram',
        paymentChannel: 'QRIS_DINAMIS',
        akadType: 'wakaf_uang_abadi',
        grossAmountIdr: 5_000_000
      })
    });
    expect(txRes.status).toBe(201);

    const analyticsRes = await app.request('/api/analytics/overview');
    expect(analyticsRes.status).toBe(200);
    const analytics = (await analyticsRes.json()) as {
      totals: { totalMobilizedIdr: number };
    };
    expect(analytics.totals.totalMobilizedIdr).toBeGreaterThan(250_000_000);

    // 4. SROI & Odoo Exports & Digest
    const sroiRes = await app.request('/api/sroi/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalInvestmentIdr: 200_000_000,
        discountRatePct: 6,
        streams: [
          {
            label: 'Pendapatan Panen',
            beneficiaryCount: 100,
            grossUnitValueIdr: 3_000_000,
            deadweightPct: 20,
            displacementPct: 10,
            attributionPct: 20,
            dropOffPct: 10,
            benefitPeriodYears: 3
          }
        ]
      })
    });
    expect(sroiRes.status).toBe(200);
    const sroi = (await sroiRes.json()) as { honestSroiRatio: number };
    expect(sroi.honestSroiRatio).toBeGreaterThan(1.5);

    const odooJson = await app.request('/api/export/odoo/json');
    expect(odooJson.status).toBe(200);
    const odooCsv = await app.request('/api/export/odoo/csv?standard=psak412');
    expect(odooCsv.status).toBe(200);
    expect(await odooCsv.text()).toContain('TX-API-9901');

    const digestRes = await app.request('/api/notifications/digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun: true, channels: ['waflare', 'telegram'] })
    });
    expect(digestRes.status).toBe(200);
    const digest = (await digestRes.json()) as {
      mode: string;
      dispatches: Array<{ channel: string; status: string }>;
    };
    expect(digest.mode).toBe('DRY_RUN');
    expect(digest.dispatches).toHaveLength(2);
  });
});
