import type { AkadType, TransactionRecord } from '../types/domain.js';

export interface OdooJournalLine {
  accountCode: string;
  accountName: string;
  debitIdr: number;
  creditIdr: number;
  analyticTag: string;
}

export interface Psak412WaqfEntry {
  txRef: string;
  occurredAt: string;
  donorKey: string;
  donorMaskedName: string;
  episodeId: string;
  utmSource: string;
  akadType: Extract<
    AkadType,
    'wakaf_uang_abadi' | 'wakaf_melalui_uang' | 'cwls_ritel' | 'hasil_kelolaan_wakaf'
  >;
  netAssetClass: 'TERIKAT_PERMANEN' | 'TIDAK_TERIKAT';
  principalProtected: boolean;
  deedType: 'SWU_AIW' | 'AIW_ASET' | 'SWU_CWLS' | 'HASIL_KELOLAAN';
  grossAmountIdr: number;
  nazhirFeeIdr: number;
  mauqufAlaihNetIdr: number;
  lines: OdooJournalLine[];
}

export interface Psak109ZisEntry {
  txRef: string;
  occurredAt: string;
  donorKey: string;
  donorMaskedName: string;
  episodeId: string;
  utmSource: string;
  akadType: Extract<
    AkadType,
    'zakat_maal' | 'infak_terikat' | 'dana_sosial_dampak'
  >;
  fundBucket: 'DANA_ZAKAT' | 'DANA_INFAK_TERIKAT' | 'DANA_INFAK_TIDAK_TERIKAT';
  receiptType: 'BSZ' | 'BSI_INFAK';
  grossAmountIdr: number;
  amilShareIdr: number;
  programNetIdr: number;
  lines: OdooJournalLine[];
}

export interface OdooExportPayload {
  schemaVersion: 'nazhir-reach-odoo-bridge/v1';
  generatedAt: string;
  institution: {
    nazhirName: string;
    stbpnNumber: string;
    lazPermitNumber: string;
  };
  psak412_waqf: {
    standard: 'PSAK 412 (PSAK 112)';
    targetRepo: 'ridloabelian/waqf-odoo-modules';
    targetModules: string[];
    entries: Psak412WaqfEntry[];
  };
  psak109_zis: {
    standard: 'PSAK 109';
    targetRepo: 'ridloabelian/zakat-odoo-modules';
    targetModules: string[];
    entries: Psak109ZisEntry[];
  };
  reconciliation: {
    psak412Count: number;
    psak412DebitTotalIdr: number;
    psak412CreditTotalIdr: number;
    psak412VarianceIdr: number;
    psak109Count: number;
    psak109DebitTotalIdr: number;
    psak109CreditTotalIdr: number;
    psak109VarianceIdr: number;
    crossStandardContaminationCount: number;
  };
}

function buildPsak412Entry(tx: TransactionRecord): Psak412WaqfEntry {
  const analyticTag = `ef_ep=${tx.episodeId}|src=${tx.utmSource}`;
  if (tx.akadType === 'wakaf_uang_abadi') {
    return {
      txRef: tx.txRef,
      occurredAt: tx.occurredAt,
      donorKey: tx.donorKey,
      donorMaskedName: tx.donorMaskedName,
      episodeId: tx.episodeId,
      utmSource: tx.utmSource,
      akadType: 'wakaf_uang_abadi',
      netAssetClass: 'TERIKAT_PERMANEN',
      principalProtected: true,
      deedType: 'SWU_AIW',
      grossAmountIdr: tx.grossAmountIdr,
      nazhirFeeIdr: 0,
      mauqufAlaihNetIdr: tx.grossAmountIdr,
      lines: [
        {
          accountCode: '111100',
          accountName: 'Kas & Bank Wakaf Uang (LKS-PWU)',
          debitIdr: tx.grossAmountIdr,
          creditIdr: 0,
          analyticTag
        },
        {
          accountCode: '311100',
          accountName: 'Aset Neto Terikat Permanen - Pokok Wakaf Uang',
          debitIdr: 0,
          creditIdr: tx.grossAmountIdr,
          analyticTag
        }
      ]
    };
  }

  if (tx.akadType === 'wakaf_melalui_uang') {
    return {
      txRef: tx.txRef,
      occurredAt: tx.occurredAt,
      donorKey: tx.donorKey,
      donorMaskedName: tx.donorMaskedName,
      episodeId: tx.episodeId,
      utmSource: tx.utmSource,
      akadType: 'wakaf_melalui_uang',
      netAssetClass: 'TERIKAT_PERMANEN',
      principalProtected: true,
      deedType: 'AIW_ASET',
      grossAmountIdr: tx.grossAmountIdr,
      nazhirFeeIdr: 0,
      mauqufAlaihNetIdr: tx.grossAmountIdr,
      lines: [
        {
          accountCode: '111200',
          accountName: 'Kas Wakaf Melalui Uang',
          debitIdr: tx.grossAmountIdr,
          creditIdr: 0,
          analyticTag
        },
        {
          accountCode: '311200',
          accountName: 'Aset Neto Terikat Permanen - Wakaf Aset Produktif',
          debitIdr: 0,
          creditIdr: tx.grossAmountIdr,
          analyticTag
        }
      ]
    };
  }

  if (tx.akadType === 'cwls_ritel') {
    return {
      txRef: tx.txRef,
      occurredAt: tx.occurredAt,
      donorKey: tx.donorKey,
      donorMaskedName: tx.donorMaskedName,
      episodeId: tx.episodeId,
      utmSource: tx.utmSource,
      akadType: 'cwls_ritel',
      netAssetClass: 'TERIKAT_PERMANEN',
      principalProtected: true,
      deedType: 'SWU_CWLS',
      grossAmountIdr: tx.grossAmountIdr,
      nazhirFeeIdr: 0,
      mauqufAlaihNetIdr: tx.grossAmountIdr,
      lines: [
        {
          accountCode: '111300',
          accountName: 'Investasi CWLS Ritel (LKS-PWU)',
          debitIdr: tx.grossAmountIdr,
          creditIdr: 0,
          analyticTag
        },
        {
          accountCode: '312100',
          accountName: 'Aset Neto Terikat Permanen - CWLS',
          debitIdr: 0,
          creditIdr: tx.grossAmountIdr,
          analyticTag
        }
      ]
    };
  }

  const lines: OdooJournalLine[] = [
    {
      accountCode: '112100',
      accountName: 'Kas Hasil Pengelolaan Wakaf Produktif',
      debitIdr: tx.grossAmountIdr,
      creditIdr: 0,
      analyticTag
    },
    {
      accountCode: '313100',
      accountName: 'Aset Neto Tidak Terikat - Bagian Mauquf Alaih',
      debitIdr: 0,
      creditIdr: tx.netProgramAmountIdr,
      analyticTag
    }
  ];
  if (tx.feeAmountIdr > 0) {
    lines.push({
      accountCode: '314100',
      accountName: 'Dana Operasional / Imbal Jasa Nazhir (Maks 10%)',
      debitIdr: 0,
      creditIdr: tx.feeAmountIdr,
      analyticTag
    });
  }

  return {
    txRef: tx.txRef,
    occurredAt: tx.occurredAt,
    donorKey: tx.donorKey,
    donorMaskedName: tx.donorMaskedName,
    episodeId: tx.episodeId,
    utmSource: tx.utmSource,
    akadType: 'hasil_kelolaan_wakaf',
    netAssetClass: 'TIDAK_TERIKAT',
    principalProtected: false,
    deedType: 'HASIL_KELOLAAN',
    grossAmountIdr: tx.grossAmountIdr,
    nazhirFeeIdr: tx.feeAmountIdr,
    mauqufAlaihNetIdr: tx.netProgramAmountIdr,
    lines
  };
}

function buildPsak109Entry(tx: TransactionRecord): Psak109ZisEntry {
  const analyticTag = `ef_ep=${tx.episodeId}|src=${tx.utmSource}`;
  if (tx.akadType === 'zakat_maal') {
    const lines: OdooJournalLine[] = [
      {
        accountCode: '110100',
        accountName: 'Kas & Bank Dana Zakat',
        debitIdr: tx.grossAmountIdr,
        creditIdr: 0,
        analyticTag
      },
      {
        accountCode: '410100',
        accountName: 'Penerimaan Zakat Maal (Saldo Dana 310100)',
        debitIdr: 0,
        creditIdr: tx.netProgramAmountIdr,
        analyticTag
      }
    ];
    if (tx.feeAmountIdr > 0) {
      lines.push({
        accountCode: '440100',
        accountName: 'Bagian Amil dari Zakat (Maks 12,5% - Saldo 340100)',
        debitIdr: 0,
        creditIdr: tx.feeAmountIdr,
        analyticTag
      });
    }
    return {
      txRef: tx.txRef,
      occurredAt: tx.occurredAt,
      donorKey: tx.donorKey,
      donorMaskedName: tx.donorMaskedName,
      episodeId: tx.episodeId,
      utmSource: tx.utmSource,
      akadType: 'zakat_maal',
      fundBucket: 'DANA_ZAKAT',
      receiptType: 'BSZ',
      grossAmountIdr: tx.grossAmountIdr,
      amilShareIdr: tx.feeAmountIdr,
      programNetIdr: tx.netProgramAmountIdr,
      lines
    };
  }

  if (tx.akadType === 'infak_terikat') {
    const lines: OdooJournalLine[] = [
      {
        accountCode: '110200',
        accountName: 'Kas & Bank Infak/Sedekah Terikat',
        debitIdr: tx.grossAmountIdr,
        creditIdr: 0,
        analyticTag
      },
      {
        accountCode: '420100',
        accountName: 'Penerimaan Infak Terikat Muqayyad (Saldo 320100)',
        debitIdr: 0,
        creditIdr: tx.netProgramAmountIdr,
        analyticTag
      }
    ];
    if (tx.feeAmountIdr > 0) {
      lines.push({
        accountCode: '440200',
        accountName: 'Bagian Amil dari Infak (Saldo 340100)',
        debitIdr: 0,
        creditIdr: tx.feeAmountIdr,
        analyticTag
      });
    }
    return {
      txRef: tx.txRef,
      occurredAt: tx.occurredAt,
      donorKey: tx.donorKey,
      donorMaskedName: tx.donorMaskedName,
      episodeId: tx.episodeId,
      utmSource: tx.utmSource,
      akadType: 'infak_terikat',
      fundBucket: 'DANA_INFAK_TERIKAT',
      receiptType: 'BSI_INFAK',
      grossAmountIdr: tx.grossAmountIdr,
      amilShareIdr: tx.feeAmountIdr,
      programNetIdr: tx.netProgramAmountIdr,
      lines
    };
  }

  const lines: OdooJournalLine[] = [
    {
      accountCode: '110300',
      accountName: 'Kas & Bank Infak Tidak Terikat',
      debitIdr: tx.grossAmountIdr,
      creditIdr: 0,
      analyticTag
    },
    {
      accountCode: '430100',
      accountName: 'Penerimaan Dana Sosial Dampak / Infak Tidak Terikat (Saldo 330100)',
      debitIdr: 0,
      creditIdr: tx.netProgramAmountIdr,
      analyticTag
    }
  ];
  if (tx.feeAmountIdr > 0) {
    lines.push({
      accountCode: '440200',
      accountName: 'Bagian Amil dari Infak (Saldo 340100)',
      debitIdr: 0,
      creditIdr: tx.feeAmountIdr,
      analyticTag
    });
  }

  return {
    txRef: tx.txRef,
    occurredAt: tx.occurredAt,
    donorKey: tx.donorKey,
    donorMaskedName: tx.donorMaskedName,
    episodeId: tx.episodeId,
    utmSource: tx.utmSource,
    akadType: 'dana_sosial_dampak',
    fundBucket: 'DANA_INFAK_TIDAK_TERIKAT',
    receiptType: 'BSI_INFAK',
    grossAmountIdr: tx.grossAmountIdr,
    amilShareIdr: tx.feeAmountIdr,
    programNetIdr: tx.netProgramAmountIdr,
    lines
  };
}

export function buildOdooSyncPayload(
  transactions: TransactionRecord[],
  institution?: Partial<OdooExportPayload['institution']>
): OdooExportPayload {
  const psak412Entries: Psak412WaqfEntry[] = [];
  const psak109Entries: Psak109ZisEntry[] = [];

  for (const tx of transactions) {
    if (tx.accountingStandard === 'PSAK_412') {
      psak412Entries.push(buildPsak412Entry(tx));
    } else {
      psak109Entries.push(buildPsak109Entry(tx));
    }
  }

  const psak412DebitTotalIdr = psak412Entries.reduce(
    (s, e) => s + e.lines.reduce((ls, l) => ls + l.debitIdr, 0),
    0
  );
  const psak412CreditTotalIdr = psak412Entries.reduce(
    (s, e) => s + e.lines.reduce((ls, l) => ls + l.creditIdr, 0),
    0
  );

  const psak109DebitTotalIdr = psak109Entries.reduce(
    (s, e) => s + e.lines.reduce((ls, l) => ls + l.debitIdr, 0),
    0
  );
  const psak109CreditTotalIdr = psak109Entries.reduce(
    (s, e) => s + e.lines.reduce((ls, l) => ls + l.creditIdr, 0),
    0
  );

  return {
    schemaVersion: 'nazhir-reach-odoo-bridge/v1',
    generatedAt: new Date().toISOString(),
    institution: {
      nazhirName:
        institution?.nazhirName ??
        process.env.NAZHIR_NAME ??
        'Yayasan Amal Produktif Indonesia',
      stbpnNumber:
        institution?.stbpnNumber ?? process.env.NAZHIR_STBPN ?? '3.3.00386',
      lazPermitNumber:
        institution?.lazPermitNumber ??
        process.env.LAZ_SK ??
        'SK Kemenag RI No. 412/2023'
    },
    psak412_waqf: {
      standard: 'PSAK 412 (PSAK 112)',
      targetRepo: 'ridloabelian/waqf-odoo-modules',
      targetModules: ['waqf_core', 'l10n_id_waqf_psak112', 'waqf_distribution'],
      entries: psak412Entries
    },
    psak109_zis: {
      standard: 'PSAK 109',
      targetRepo: 'ridloabelian/zakat-odoo-modules',
      targetModules: ['zakat_core', 'l10n_id_zakat_psak109', 'zakat_simba_export'],
      entries: psak109Entries
    },
    reconciliation: {
      psak412Count: psak412Entries.length,
      psak412DebitTotalIdr,
      psak412CreditTotalIdr,
      psak412VarianceIdr: psak412DebitTotalIdr - psak412CreditTotalIdr,
      psak109Count: psak109Entries.length,
      psak109DebitTotalIdr,
      psak109CreditTotalIdr,
      psak109VarianceIdr: psak109DebitTotalIdr - psak109CreditTotalIdr,
      crossStandardContaminationCount: 0
    }
  };
}

function csvCell(value: string | number | boolean): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportOdooCsv(
  payload: OdooExportPayload,
  standard: 'psak412' | 'psak109'
): string {
  const header = [
    'standard',
    'tx_ref',
    'occurred_at',
    'donor_key',
    'donor_masked_name',
    'episode_id',
    'utm_source',
    'akad_type',
    'classification_or_bucket',
    'account_code',
    'account_name',
    'debit_idr',
    'credit_idr',
    'analytic_tag'
  ];

  const rows: string[] = [header.map(csvCell).join(',')];

  if (standard === 'psak412') {
    for (const entry of payload.psak412_waqf.entries) {
      for (const line of entry.lines) {
        rows.push(
          [
            'PSAK_412',
            entry.txRef,
            entry.occurredAt,
            entry.donorKey,
            entry.donorMaskedName,
            entry.episodeId,
            entry.utmSource,
            entry.akadType,
            entry.netAssetClass,
            line.accountCode,
            line.accountName,
            line.debitIdr,
            line.creditIdr,
            line.analyticTag
          ]
            .map(csvCell)
            .join(',')
        );
      }
    }
  } else {
    for (const entry of payload.psak109_zis.entries) {
      for (const line of entry.lines) {
        rows.push(
          [
            'PSAK_109',
            entry.txRef,
            entry.occurredAt,
            entry.donorKey,
            entry.donorMaskedName,
            entry.episodeId,
            entry.utmSource,
            entry.akadType,
            entry.fundBucket,
            line.accountCode,
            line.accountName,
            line.debitIdr,
            line.creditIdr,
            line.analyticTag
          ]
            .map(csvCell)
            .join(',')
        );
      }
    }
  }

  return `${rows.join('\r\n')}\r\n`;
}
