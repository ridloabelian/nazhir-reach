import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { toSqlValue } from '../db/database.js';
import type {
  AkadType,
  TransactionIngestInput,
  TransactionRecord
} from '../types/domain.js';
import { AKAD_METADATA } from '../types/domain.js';

export class AttributionValidationError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 422) {
    super(message);
    this.name = 'AttributionValidationError';
    this.statusCode = statusCode;
  }
}

interface TransactionRow {
  id: string;
  tx_ref: string;
  donor_key: string;
  donor_masked_name?: string;
  campaign_id: string | null;
  variant_id: string | null;
  episode_id: string;
  utm_source: string;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  payment_channel: TransactionRecord['paymentChannel'];
  akad_type: AkadType;
  accounting_standard: 'PSAK_412' | 'PSAK_109';
  blended_layer: 'LAYER_1_ZIS_DERISKING' | 'LAYER_2_WAQF_HIFZ_AL_ASHL';
  gross_amount_idr: number;
  fee_pct: number;
  fee_amount_idr: number;
  net_program_amount_idr: number;
  is_repeat_donor_tx: number;
  occurred_at: string;
}

interface DonorRow {
  donor_key: string;
  masked_name: string;
  donor_type: string;
  first_tx_at: string;
  last_tx_at: string;
}

export interface EpisodeAttributionRow {
  episodeId: string;
  campaignId: string | null;
  title: string;
  akadType: AkadType;
  accountingStandard: 'PSAK_412' | 'PSAK_109';
  txCount: number;
  uniqueDonors: number;
  newDonors: number;
  repeatDonors: number;
  totalMobilizedIdr: number;
  distributionCostIdr: number;
  costRatioPct: number;
  cohorts: {
    d1AmountIdr: number;
    d1Donors: number;
    d3AmountIdr: number;
    d3Donors: number;
    d7AmountIdr: number;
    d7Donors: number;
    totalAmountIdr: number;
    totalDonors: number;
  };
}

export interface PlatformAttributionRow {
  platform: string;
  txCount: number;
  uniqueDonors: number;
  newDonorTx: number;
  repeatDonorTx: number;
  totalMobilizedIdr: number;
  waqfMobilizedIdr: number;
  zisMobilizedIdr: number;
}

export interface FundSegregationSummary {
  psak412Waqf: {
    wakafUangAbadiIdr: number;
    wakafMelaluiUangIdr: number;
    cwlsRitelIdr: number;
    hasilPengelolaanWakafNetIdr: number;
    hakNazhirIdr: number;
    totalPsak412GrossIdr: number;
  };
  psak109Zis: {
    zakatMaalNetIdr: number;
    hakAmilZakatIdr: number;
    infakTerikatNetIdr: number;
    danaSosialDampakNetIdr: number;
    hakAmilInfakIdr: number;
    totalPsak109GrossIdr: number;
  };
}

export interface AnalyticsOverview {
  generatedAt: string;
  totals: {
    totalTransactions: number;
    totalUniqueDonors: number;
    totalWakifDonors: number;
    totalMobilizedIdr: number;
    totalPsak412Idr: number;
    totalPsak109Idr: number;
    totalDistributionCostIdr: number;
    blendedCostRatioPct: number;
    averageTicketIdr: number;
  };
  retention: {
    overallRepeatDonorRatePct: number;
    wakifRepeatRatePct: number;
    repeatWakifRate30dPct: number;
    repeatWakifRate90dPct: number;
    mature30dDonorCount: number;
    mature90dDonorCount: number;
    repeatWithin30dCount: number;
    repeatWithin90dCount: number;
  };
  fundSegregation: FundSegregationSummary;
  byPlatform: PlatformAttributionRow[];
  byEpisode: EpisodeAttributionRow[];
}

export function ingestTransaction(
  db: DatabaseSync,
  input: TransactionIngestInput
): TransactionRecord {
  const meta = AKAD_METADATA[input.akadType];
  if (!meta) {
    throw new AttributionValidationError(`Akad tidak valid: ${input.akadType}`, 400);
  }
  if (!Number.isFinite(input.grossAmountIdr) || input.grossAmountIdr <= 0) {
    throw new AttributionValidationError('Nominal grossAmountIdr harus > 0.', 400);
  }
  const grossAmountIdr = Math.round(input.grossAmountIdr);
  const feePct = input.feePct ?? 0;

  if (!Number.isFinite(feePct) || feePct < 0) {
    throw new AttributionValidationError('Persentase feePct tidak boleh negatif.', 400);
  }

  if (feePct > meta.maxOperationalFeePct) {
    if (meta.principalProtected) {
      throw new AttributionValidationError(
        `Pelanggaran Hifz al-Ashl (UU 41/2004 Ps. 40): pokok ${meta.label} wajib 100% utuh (feePct maks. 0%, diterima ${feePct}%).`,
        422
      );
    }
    throw new AttributionValidationError(
      `Potongan operasional ${feePct}% melampaui batas maksimal syariah (${meta.maxOperationalFeePct}%) untuk akad ${meta.label}.`,
      422
    );
  }

  const feeAmountIdr = Math.round(grossAmountIdr * (feePct / 100));
  const netProgramAmountIdr = grossAmountIdr - feeAmountIdr;
  const occurredAt = input.occurredAt ?? new Date().toISOString();

  let campaignId: string | null = input.campaignId ?? null;
  if (!campaignId) {
    const camp = db
      .prepare('SELECT id FROM campaigns WHERE episode_id = ?')
      .get(input.episodeId) as { id: string } | undefined;
    campaignId = camp?.id ?? null;
  }

  const txId = randomUUID();
  let isRepeat = false;

  db.exec('BEGIN IMMEDIATE');
  try {
    const existingDonor = db
      .prepare('SELECT * FROM donors WHERE donor_key = ?')
      .get(input.donorKey) as DonorRow | undefined;

    if (existingDonor) {
      isRepeat = true;
      const earliest =
        occurredAt < existingDonor.first_tx_at
          ? occurredAt
          : existingDonor.first_tx_at;
      const latest =
        occurredAt > existingDonor.last_tx_at
          ? occurredAt
          : existingDonor.last_tx_at;
      db.prepare(
        'UPDATE donors SET first_tx_at = ?, last_tx_at = ?, masked_name = ? WHERE donor_key = ?'
      ).run(earliest, latest, input.donorMaskedName, input.donorKey);
    } else {
      db.prepare(
        'INSERT INTO donors (donor_key, masked_name, donor_type, first_tx_at, last_tx_at) VALUES (?, ?, ?, ?, ?)'
      ).run(
        input.donorKey,
        input.donorMaskedName,
        input.donorType ?? 'INDIVIDU',
        occurredAt,
        occurredAt
      );
    }

    db.prepare(
      `INSERT INTO transactions (
        id, tx_ref, donor_key, campaign_id, variant_id, episode_id,
        utm_source, utm_medium, utm_campaign, utm_content, payment_channel,
        akad_type, accounting_standard, blended_layer, gross_amount_idr,
        fee_pct, fee_amount_idr, net_program_amount_idr, is_repeat_donor_tx, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      toSqlValue(txId),
      toSqlValue(input.txRef),
      toSqlValue(input.donorKey),
      toSqlValue(campaignId),
      toSqlValue(input.variantId ?? null),
      toSqlValue(input.episodeId),
      toSqlValue(input.utmSource),
      toSqlValue(input.utmMedium ?? null),
      toSqlValue(input.utmCampaign ?? null),
      toSqlValue(input.utmContent ?? null),
      toSqlValue(input.paymentChannel),
      toSqlValue(input.akadType),
      toSqlValue(meta.accountingStandard),
      toSqlValue(meta.blendedLayer),
      toSqlValue(grossAmountIdr),
      toSqlValue(feePct),
      toSqlValue(feeAmountIdr),
      toSqlValue(netProgramAmountIdr),
      toSqlValue(isRepeat),
      toSqlValue(occurredAt)
    );

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return {
    id: txId,
    txRef: input.txRef,
    donorKey: input.donorKey,
    donorMaskedName: input.donorMaskedName,
    campaignId,
    variantId: input.variantId ?? null,
    episodeId: input.episodeId,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium ?? null,
    utmCampaign: input.utmCampaign ?? null,
    utmContent: input.utmContent ?? null,
    paymentChannel: input.paymentChannel,
    akadType: input.akadType,
    accountingStandard: meta.accountingStandard,
    blendedLayer: meta.blendedLayer,
    grossAmountIdr,
    feePct,
    feeAmountIdr,
    netProgramAmountIdr,
    isRepeatDonorTx: isRepeat,
    occurredAt
  };
}

export function listTransactions(db: DatabaseSync): TransactionRecord[] {
  const rows = db
    .prepare(
      `SELECT t.*, d.masked_name AS donor_masked_name
       FROM transactions t
       JOIN donors d ON d.donor_key = t.donor_key
       ORDER BY t.occurred_at ASC`
    )
    .all() as unknown as TransactionRow[];

  return rows.map((row) => ({
    id: row.id,
    txRef: row.tx_ref,
    donorKey: row.donor_key,
    donorMaskedName: row.donor_masked_name ?? 'Donatur Terlindung',
    campaignId: row.campaign_id,
    variantId: row.variant_id,
    episodeId: row.episode_id,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    paymentChannel: row.payment_channel,
    akadType: row.akad_type,
    accountingStandard: row.accounting_standard,
    blendedLayer: row.blended_layer,
    grossAmountIdr: row.gross_amount_idr,
    feePct: row.fee_pct,
    feeAmountIdr: row.fee_amount_idr,
    netProgramAmountIdr: row.net_program_amount_idr,
    isRepeatDonorTx: row.is_repeat_donor_tx === 1,
    occurredAt: row.occurred_at
  }));
}

export function getAnalyticsOverview(
  db: DatabaseSync,
  referenceDateIso?: string
): AnalyticsOverview {
  const txs = listTransactions(db);
  const campaigns = db
    .prepare(
      'SELECT id, episode_id, title, akad_type, accounting_standard, distribution_cost_idr, published_at, created_at FROM campaigns'
    )
    .all() as Array<{
    id: string;
    episode_id: string;
    title: string;
    akad_type: AkadType;
    accounting_standard: 'PSAK_412' | 'PSAK_109';
    distribution_cost_idr: number;
    published_at: string | null;
    created_at: string;
  }>;

  const refMs = referenceDateIso
    ? Date.parse(referenceDateIso)
    : txs.length > 0
      ? Math.max(...txs.map((t) => Date.parse(t.occurredAt)))
      : Date.now();

  const donorTxMap = new Map<string, TransactionRecord[]>();
  const wakifDonors = new Set<string>();
  for (const tx of txs) {
    const list = donorTxMap.get(tx.donorKey) ?? [];
    list.push(tx);
    donorTxMap.set(tx.donorKey, list);
    if (tx.accountingStandard === 'PSAK_412') {
      wakifDonors.add(tx.donorKey);
    }
  }

  let totalPsak412Idr = 0;
  let totalPsak109Idr = 0;

  const fundSegregation: FundSegregationSummary = {
    psak412Waqf: {
      wakafUangAbadiIdr: 0,
      wakafMelaluiUangIdr: 0,
      cwlsRitelIdr: 0,
      hasilPengelolaanWakafNetIdr: 0,
      hakNazhirIdr: 0,
      totalPsak412GrossIdr: 0
    },
    psak109Zis: {
      zakatMaalNetIdr: 0,
      hakAmilZakatIdr: 0,
      infakTerikatNetIdr: 0,
      danaSosialDampakNetIdr: 0,
      hakAmilInfakIdr: 0,
      totalPsak109GrossIdr: 0
    }
  };

  const platformBuckets = new Map<
    string,
    {
      txCount: number;
      donors: Set<string>;
      newDonorTx: number;
      repeatDonorTx: number;
      totalMobilizedIdr: number;
      waqfMobilizedIdr: number;
      zisMobilizedIdr: number;
    }
  >();

  for (const tx of txs) {
    if (tx.accountingStandard === 'PSAK_412') {
      totalPsak412Idr += tx.grossAmountIdr;
      fundSegregation.psak412Waqf.totalPsak412GrossIdr += tx.grossAmountIdr;
    } else {
      totalPsak109Idr += tx.grossAmountIdr;
      fundSegregation.psak109Zis.totalPsak109GrossIdr += tx.grossAmountIdr;
    }

    switch (tx.akadType) {
      case 'wakaf_uang_abadi':
        fundSegregation.psak412Waqf.wakafUangAbadiIdr += tx.grossAmountIdr;
        break;
      case 'wakaf_melalui_uang':
        fundSegregation.psak412Waqf.wakafMelaluiUangIdr += tx.grossAmountIdr;
        break;
      case 'cwls_ritel':
        fundSegregation.psak412Waqf.cwlsRitelIdr += tx.grossAmountIdr;
        break;
      case 'hasil_kelolaan_wakaf':
        fundSegregation.psak412Waqf.hasilPengelolaanWakafNetIdr +=
          tx.netProgramAmountIdr;
        fundSegregation.psak412Waqf.hakNazhirIdr += tx.feeAmountIdr;
        break;
      case 'zakat_maal':
        fundSegregation.psak109Zis.zakatMaalNetIdr += tx.netProgramAmountIdr;
        fundSegregation.psak109Zis.hakAmilZakatIdr += tx.feeAmountIdr;
        break;
      case 'infak_terikat':
        fundSegregation.psak109Zis.infakTerikatNetIdr += tx.netProgramAmountIdr;
        fundSegregation.psak109Zis.hakAmilInfakIdr += tx.feeAmountIdr;
        break;
      case 'dana_sosial_dampak':
        fundSegregation.psak109Zis.danaSosialDampakNetIdr +=
          tx.netProgramAmountIdr;
        fundSegregation.psak109Zis.hakAmilInfakIdr += tx.feeAmountIdr;
        break;
    }

    const bucket = platformBuckets.get(tx.utmSource) ?? {
      txCount: 0,
      donors: new Set<string>(),
      newDonorTx: 0,
      repeatDonorTx: 0,
      totalMobilizedIdr: 0,
      waqfMobilizedIdr: 0,
      zisMobilizedIdr: 0
    };
    bucket.txCount += 1;
    bucket.donors.add(tx.donorKey);
    if (tx.isRepeatDonorTx) bucket.repeatDonorTx += 1;
    else bucket.newDonorTx += 1;
    bucket.totalMobilizedIdr += tx.grossAmountIdr;
    if (tx.accountingStandard === 'PSAK_412') {
      bucket.waqfMobilizedIdr += tx.grossAmountIdr;
    } else {
      bucket.zisMobilizedIdr += tx.grossAmountIdr;
    }
    platformBuckets.set(tx.utmSource, bucket);
  }

  // Retention metrics (overall, Wakif-specific, 30d & 90d cohorts)
  const dayMs = 86_400_000;
  let totalRepeatDonors = 0;
  let wakifRepeatDonors = 0;
  let mature30dDonorCount = 0;
  let repeatWithin30dCount = 0;
  let mature90dDonorCount = 0;
  let repeatWithin90dCount = 0;
  let allDonorsRepeat30d = 0;
  let allDonorsRepeat90d = 0;

  for (const [donorKey, donorTxs] of donorTxMap.entries()) {
    const sorted = [...donorTxs].sort(
      (a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt)
    );
    const firstMs = Date.parse(sorted[0]!.occurredAt);
    const hasRepeat = sorted.length >= 2;
    if (hasRepeat) {
      totalRepeatDonors += 1;
      if (wakifDonors.has(donorKey)) wakifRepeatDonors += 1;
    }

    const secondMs = sorted[1] ? Date.parse(sorted[1].occurredAt) : Infinity;
    const repeatedIn30d = hasRepeat && secondMs - firstMs <= 30 * dayMs;
    const repeatedIn90d = hasRepeat && secondMs - firstMs <= 90 * dayMs;

    if (repeatedIn30d) allDonorsRepeat30d += 1;
    if (repeatedIn90d) allDonorsRepeat90d += 1;

    if (refMs - firstMs >= 30 * dayMs) {
      mature30dDonorCount += 1;
      if (repeatedIn30d) repeatWithin30dCount += 1;
    }
    if (refMs - firstMs >= 90 * dayMs) {
      mature90dDonorCount += 1;
      if (repeatedIn90d) repeatWithin90dCount += 1;
    }
  }

  const totalUniqueDonors = donorTxMap.size;
  const totalWakifDonors = wakifDonors.size;

  const overallRepeatDonorRatePct =
    totalUniqueDonors > 0
      ? Number(((totalRepeatDonors / totalUniqueDonors) * 100).toFixed(2))
      : 0;
  const wakifRepeatRatePct =
    totalWakifDonors > 0
      ? Number(((wakifRepeatDonors / totalWakifDonors) * 100).toFixed(2))
      : 0;

  const repeatWakifRate30dPct =
    mature30dDonorCount > 0
      ? Number(((repeatWithin30dCount / mature30dDonorCount) * 100).toFixed(2))
      : totalUniqueDonors > 0
        ? Number(((allDonorsRepeat30d / totalUniqueDonors) * 100).toFixed(2))
        : 0;

  const repeatWakifRate90dPct =
    mature90dDonorCount > 0
      ? Number(((repeatWithin90dCount / mature90dDonorCount) * 100).toFixed(2))
      : totalUniqueDonors > 0
        ? Number(((allDonorsRepeat90d / totalUniqueDonors) * 100).toFixed(2))
        : 0;

  const byPlatform: PlatformAttributionRow[] = [...platformBuckets.entries()]
    .map(([platform, b]) => ({
      platform,
      txCount: b.txCount,
      uniqueDonors: b.donors.size,
      newDonorTx: b.newDonorTx,
      repeatDonorTx: b.repeatDonorTx,
      totalMobilizedIdr: b.totalMobilizedIdr,
      waqfMobilizedIdr: b.waqfMobilizedIdr,
      zisMobilizedIdr: b.zisMobilizedIdr
    }))
    .sort((a, b) => b.totalMobilizedIdr - a.totalMobilizedIdr);

  const byEpisode: EpisodeAttributionRow[] = campaigns.map((c) => {
    const epTxs = txs.filter(
      (t) => t.campaignId === c.id || t.episodeId === c.episode_id
    );
    const epTimes = epTxs.map((t) => Date.parse(t.occurredAt));
    const anchorIso = c.published_at ?? c.created_at;
    const anchorMs = Math.min(
      Date.parse(anchorIso),
      ...(epTimes.length > 0 ? epTimes : [Date.parse(anchorIso)])
    );

    const uniqueDonors = new Set<string>();
    const newDonors = new Set<string>();
    const repeatDonors = new Set<string>();
    const d1Donors = new Set<string>();
    const d3Donors = new Set<string>();
    const d7Donors = new Set<string>();

    let totalMobilizedIdr = 0;
    let d1AmountIdr = 0;
    let d3AmountIdr = 0;
    let d7AmountIdr = 0;

    for (const tx of epTxs) {
      totalMobilizedIdr += tx.grossAmountIdr;
      uniqueDonors.add(tx.donorKey);
      if (tx.isRepeatDonorTx) repeatDonors.add(tx.donorKey);
      else newDonors.add(tx.donorKey);

      const deltaMs = Date.parse(tx.occurredAt) - anchorMs;
      if (deltaMs <= 1 * dayMs) {
        d1AmountIdr += tx.grossAmountIdr;
        d1Donors.add(tx.donorKey);
      }
      if (deltaMs <= 3 * dayMs) {
        d3AmountIdr += tx.grossAmountIdr;
        d3Donors.add(tx.donorKey);
      }
      if (deltaMs <= 7 * dayMs) {
        d7AmountIdr += tx.grossAmountIdr;
        d7Donors.add(tx.donorKey);
      }
    }

    const costRatioPct =
      totalMobilizedIdr > 0
        ? Number(((c.distribution_cost_idr / totalMobilizedIdr) * 100).toFixed(2))
        : 0;

    return {
      episodeId: c.episode_id,
      campaignId: c.id,
      title: c.title,
      akadType: c.akad_type,
      accountingStandard: c.accounting_standard,
      txCount: epTxs.length,
      uniqueDonors: uniqueDonors.size,
      newDonors: newDonors.size,
      repeatDonors: repeatDonors.size,
      totalMobilizedIdr,
      distributionCostIdr: c.distribution_cost_idr,
      costRatioPct,
      cohorts: {
        d1AmountIdr,
        d1Donors: d1Donors.size,
        d3AmountIdr,
        d3Donors: d3Donors.size,
        d7AmountIdr,
        d7Donors: d7Donors.size,
        totalAmountIdr: totalMobilizedIdr,
        totalDonors: uniqueDonors.size
      }
    };
  });

  const totalMobilizedIdr = totalPsak412Idr + totalPsak109Idr;
  const totalDistributionCostIdr = campaigns.reduce(
    (sum, c) => sum + c.distribution_cost_idr,
    0
  );
  const blendedCostRatioPct =
    totalMobilizedIdr > 0
      ? Number(((totalDistributionCostIdr / totalMobilizedIdr) * 100).toFixed(2))
      : 0;
  const averageTicketIdr =
    txs.length > 0 ? Math.round(totalMobilizedIdr / txs.length) : 0;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      totalTransactions: txs.length,
      totalUniqueDonors,
      totalWakifDonors,
      totalMobilizedIdr,
      totalPsak412Idr,
      totalPsak109Idr,
      totalDistributionCostIdr,
      blendedCostRatioPct,
      averageTicketIdr
    },
    retention: {
      overallRepeatDonorRatePct,
      wakifRepeatRatePct,
      repeatWakifRate30dPct,
      repeatWakifRate90dPct,
      mature30dDonorCount,
      mature90dDonorCount,
      repeatWithin30dCount:
        mature30dDonorCount > 0 ? repeatWithin30dCount : allDonorsRepeat30d,
      repeatWithin90dCount:
        mature90dDonorCount > 0 ? repeatWithin90dCount : allDonorsRepeat90d
    },
    fundSegregation,
    byPlatform,
    byEpisode
  };
}
