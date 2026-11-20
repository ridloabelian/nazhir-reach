import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import {
  AttributionValidationError,
  getAnalyticsOverview,
  ingestTransaction,
  listTransactions
} from '../src/attribution/service.js';
import {
  approveCampaign,
  createCampaign,
  markCampaignPublished
} from '../src/campaigns/service.js';
import { openDatabase } from '../src/db/database.js';
import { seedDemoData } from '../src/db/seed.js';
import { buildOdooSyncPayload, exportOdooCsv } from '../src/odoo/exporter.js';

describe('Wakif Attribution, Retention Cohorts & Odoo PSAK 412/109 Segregation', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = openDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('enforces statutory fee caps (0% principal Waqf, <=10% Nazhir net yield, <=12.5% Amil Zakat)', () => {
    expect(() =>
      ingestTransaction(db, {
        txRef: 'ERR-WKF-01',
        donorKey: 'D-1',
        donorMaskedName: 'Fulan',
        episodeId: 'EP-1',
        utmSource: 'instagram',
        paymentChannel: 'QRIS_DINAMIS',
        akadType: 'wakaf_uang_abadi',
        grossAmountIdr: 1_000_000,
        feePct: 5
      })
    ).toThrowError(AttributionValidationError);

    expect(() =>
      ingestTransaction(db, {
        txRef: 'ERR-YLD-01',
        donorKey: 'D-1',
        donorMaskedName: 'Fulan',
        episodeId: 'EP-1',
        utmSource: 'whatsapp',
        paymentChannel: 'LKS_PWU_TRANSFER',
        akadType: 'hasil_kelolaan_wakaf',
        grossAmountIdr: 10_000_000,
        feePct: 12
      })
    ).toThrowError(AttributionValidationError);

    expect(() =>
      ingestTransaction(db, {
        txRef: 'ERR-ZKT-01',
        donorKey: 'D-2',
        donorMaskedName: 'Muzaki',
        episodeId: 'EP-2',
        utmSource: 'tiktok',
        paymentChannel: 'QRIS_DINAMIS',
        akadType: 'zakat_maal',
        grossAmountIdr: 10_000_000,
        feePct: 15
      })
    ).toThrowError(AttributionValidationError);

    const validZakat = ingestTransaction(db, {
      txRef: 'OK-ZKT-01',
      donorKey: 'D-2',
      donorMaskedName: 'Muzaki',
      episodeId: 'EP-2',
      utmSource: 'tiktok',
      paymentChannel: 'QRIS_DINAMIS',
      akadType: 'zakat_maal',
      grossAmountIdr: 8_000_000,
      feePct: 12.5
    });
    expect(validZakat.feeAmountIdr).toBe(1_000_000);
    expect(validZakat.netProgramAmountIdr).toBe(7_000_000);
  });

  it('computes accurate 30d/90d repeat rates, D+1/D+3/D+7 cohorts, and cost ratio', () => {
    const camp = createCampaign(db, {
      title: 'Kampanye Uji Kohort',
      episodeId: 'EP-COHORT-1',
      programTheme: 'Sumur Wakaf',
      akadType: 'wakaf_uang_abadi',
      nazhirName: 'Yayasan Amal Produktif Indonesia',
      stbpnNumber: '3.3.00386',
      lksPwuName: 'BSI',
      officialLandingUrl: 'https://wakaf.example.or.id/cohort',
      beneficiarySummary: '100 warga desa',
      distributionCostIdr: 2_000_000
    });
    approveCampaign(db, camp.id, {
      reviewerName: 'Ust. Ahmad',
      reviewerRole: 'DPS',
      approved: true,
      laYuftiAcknowledged: true
    });
    markCampaignPublished(db, camp.id, '2026-01-01T00:00:00.000Z');

    // Donor A: D+1 and repeats on Day 15 (within 30d & 90d)
    ingestTransaction(db, {
      txRef: 'C-1',
      donorKey: 'W-A',
      donorMaskedName: 'Donor A',
      episodeId: 'EP-COHORT-1',
      utmSource: 'instagram',
      paymentChannel: 'QRIS_DINAMIS',
      akadType: 'wakaf_uang_abadi',
      grossAmountIdr: 10_000_000,
      occurredAt: '2026-01-01T12:00:00.000Z'
    });
    // Donor B: D+3 and repeats on Day 45 (outside 30d, within 90d)
    ingestTransaction(db, {
      txRef: 'C-2',
      donorKey: 'W-B',
      donorMaskedName: 'Donor B',
      episodeId: 'EP-COHORT-1',
      utmSource: 'tiktok',
      paymentChannel: 'QRIS_DINAMIS',
      akadType: 'wakaf_uang_abadi',
      grossAmountIdr: 20_000_000,
      occurredAt: '2026-01-03T12:00:00.000Z'
    });
    // Donor C: D+6 (within D+7)
    ingestTransaction(db, {
      txRef: 'C-3',
      donorKey: 'W-C',
      donorMaskedName: 'Donor C',
      episodeId: 'EP-COHORT-1',
      utmSource: 'youtube_shorts',
      paymentChannel: 'LKS_PWU_TRANSFER',
      akadType: 'wakaf_uang_abadi',
      grossAmountIdr: 10_000_000,
      occurredAt: '2026-01-07T00:00:00.000Z'
    });
    // Donor A repeat Day 15
    ingestTransaction(db, {
      txRef: 'C-4',
      donorKey: 'W-A',
      donorMaskedName: 'Donor A',
      episodeId: 'EP-COHORT-1',
      utmSource: 'whatsapp',
      paymentChannel: 'WAFLARE_WEBHOOK',
      akadType: 'wakaf_uang_abadi',
      grossAmountIdr: 30_000_000,
      occurredAt: '2026-01-16T00:00:00.000Z'
    });
    // Donor B repeat Day 45
    ingestTransaction(db, {
      txRef: 'C-5',
      donorKey: 'W-B',
      donorMaskedName: 'Donor B',
      episodeId: 'EP-COHORT-1',
      utmSource: 'whatsapp',
      paymentChannel: 'WAFLARE_WEBHOOK',
      akadType: 'wakaf_uang_abadi',
      grossAmountIdr: 30_000_000,
      occurredAt: '2026-02-17T00:00:00.000Z'
    });

    // Reference date 100 days after Jan 1 -> all 3 donors are mature 30d & 90d
    const overview = getAnalyticsOverview(db, '2026-04-15T00:00:00.000Z');
    expect(overview.totals.totalMobilizedIdr).toBe(100_000_000);
    expect(overview.totals.blendedCostRatioPct).toBe(2);

    // 1 of 3 donors repeated <= 30d (33.33%), 2 of 3 repeated <= 90d (66.67%)
    expect(overview.retention.mature30dDonorCount).toBe(3);
    expect(overview.retention.repeatWakifRate30dPct).toBe(33.33);
    expect(overview.retention.mature90dDonorCount).toBe(3);
    expect(overview.retention.repeatWakifRate90dPct).toBe(66.67);

    const ep = overview.byEpisode[0]!;
    expect(ep.cohorts.d1AmountIdr).toBe(10_000_000);
    expect(ep.cohorts.d3AmountIdr).toBe(30_000_000);
    expect(ep.cohorts.d7AmountIdr).toBe(40_000_000);
    expect(ep.cohorts.totalAmountIdr).toBe(100_000_000);
  });

  it('strictly segregates PSAK 412 (waqf-odoo-modules) vs PSAK 109 (zakat-odoo-modules) with $0 variance', () => {
    seedDemoData(db, new Date('2026-11-20T10:00:00.000Z'));
    const txs = listTransactions(db);
    const payload = buildOdooSyncPayload(txs);

    expect(payload.psak412_waqf.targetRepo).toBe('ridloabelian/waqf-odoo-modules');
    expect(payload.psak109_zis.targetRepo).toBe('ridloabelian/zakat-odoo-modules');
    expect(payload.reconciliation.psak412VarianceIdr).toBe(0);
    expect(payload.reconciliation.psak109VarianceIdr).toBe(0);
    expect(payload.reconciliation.crossStandardContaminationCount).toBe(0);

    for (const e of payload.psak412_waqf.entries) {
      expect([
        'wakaf_uang_abadi',
        'wakaf_melalui_uang',
        'cwls_ritel',
        'hasil_kelolaan_wakaf'
      ]).toContain(e.akadType);
      if (e.principalProtected) {
        expect(e.nazhirFeeIdr).toBe(0);
        expect(e.netAssetClass).toBe('TERIKAT_PERMANEN');
      }
      const dr = e.lines.reduce((s, l) => s + l.debitIdr, 0);
      const cr = e.lines.reduce((s, l) => s + l.creditIdr, 0);
      expect(dr).toBe(cr);
    }

    for (const e of payload.psak109_zis.entries) {
      expect(['zakat_maal', 'infak_terikat', 'dana_sosial_dampak']).toContain(
        e.akadType
      );
      if (e.akadType === 'zakat_maal') {
        expect(e.fundBucket).toBe('DANA_ZAKAT');
        expect(e.receiptType).toBe('BSZ');
      }
      const dr = e.lines.reduce((s, l) => s + l.debitIdr, 0);
      const cr = e.lines.reduce((s, l) => s + l.creditIdr, 0);
      expect(dr).toBe(cr);
    }

    const csv412 = exportOdooCsv(payload, 'psak412');
    const csv109 = exportOdooCsv(payload, 'psak109');
    expect(csv412).toContain('PSAK_412');
    expect(csv412).not.toContain('PSAK_109');
    expect(csv109).toContain('PSAK_109');
    expect(csv109).not.toContain('PSAK_412');
  });
});
