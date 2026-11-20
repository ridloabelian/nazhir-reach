import type { DatabaseSync } from 'node:sqlite';
import { ingestTransaction } from '../attribution/service.js';
import {
  approveCampaign,
  createCampaign,
  markCampaignPublished,
  updateVariantCopy
} from '../campaigns/service.js';

export function seedDemoData(db: DatabaseSync, referenceNow = new Date()): void {
  const countRow = db
    .prepare('SELECT COUNT(*) AS cnt FROM campaigns')
    .get() as { cnt: number };

  if (countRow.cnt > 0) {
    return;
  }

  const dayMs = 86_400_000;
  const isoOffset = (daysAgo: number, extraHours = 0): string =>
    new Date(
      referenceNow.getTime() - daysAgo * dayMs + extraHours * 3_600_000
    ).toISOString();

  // 1. Campaign CWLS Ritel (95 days ago — demonstrates mature 30d & 90d Wakif retention cohorts)
  const cwlsCampaign = createCampaign(db, {
    title: 'CWLS Ritel Seri SWR006 — Klinik Mata & Beasiswa Hafiz',
    slug: 'cwls-ritel-swr006-klinik-mata',
    episodeId: 'EP-CWLS-01',
    programTheme: 'Cash Waqf Linked Sukuk Ritel Terproteksi Negara',
    akadType: 'cwls_ritel',
    nazhirName: 'Yayasan Amal Produktif Indonesia',
    stbpnNumber: '3.3.00386',
    lksPwuName: 'Bank Syariah Indonesia (BSI)',
    officialLandingUrl: 'https://wakaf.amalproduktif.or.id/cwls-swr006',
    beneficiarySummary: '1.200 pasien katarak dhuafa dan 180 santri penghafal Al-Quran',
    impactReportSummary:
      'Kupon imbal hasil CWLS tahap I telah membiayai 420 operasi katarak gratis dan beasiswa asrama santri.',
    distributionCostIdr: 6_500_000,
    targetRaiseIdr: 500_000_000,
    honestSroiMultiple: 3.42
  });
  approveCampaign(db, cwlsCampaign.id, {
    reviewerName: 'Dr. H. Ahmad Fauzan, Lc., M.A.',
    reviewerRole: 'DPS',
    reviewerCredential: 'Ketua Dewan Pengawas Syariah / Sertifikat BWI',
    approved: true,
    laYuftiAcknowledged: true,
    notes: 'Akad CWLS & Hifz al-Ashl diverifikasi; STBPN dan LKS-PWU BSI lengkap.'
  });
  markCampaignPublished(db, cwlsCampaign.id, isoOffset(95));

  // 2. Campaign Wakaf Produktif Sumur Bor (42 days ago)
  const sumurCampaign = createCampaign(db, {
    title: 'Wakaf Produktif Sumur Bor & Irigasi Tetes Garut',
    slug: 'wakaf-sumur-bor-irigasi-garut',
    episodeId: 'EP-WKF-02',
    programTheme: 'Infrastruktur Air Bersih & Irigasi Hortikultura Produktif',
    akadType: 'wakaf_melalui_uang',
    nazhirName: 'Yayasan Amal Produktif Indonesia',
    stbpnNumber: '3.3.00386',
    lksPwuName: 'Bank Muamalat Indonesia (LKS-PWU)',
    officialLandingUrl: 'https://wakaf.amalproduktif.or.id/sumur-garut',
    beneficiarySummary: '320 kepala keluarga petani hortikultura desa kering Garut Selatan',
    impactReportSummary:
      '3 titik sumur bor dalam beroperasi mengalirkan 68.000 liter/hari dan menaikkan panen cabai & bawang.',
    distributionCostIdr: 4_800_000,
    targetRaiseIdr: 350_000_000,
    honestSroiMultiple: 3.18
  });
  approveCampaign(db, sumurCampaign.id, {
    reviewerName: 'Ridlo Abelian, S.T., M.Si., CWC',
    reviewerRole: 'PIMPINAN_NAZHIR',
    reviewerCredential: 'Certified Waqf Competence (CWC)',
    approved: true,
    laYuftiAcknowledged: true,
    notes: 'Mematuhi PSAK 412 Wakaf Melalui Uang dan SROI terdiskon telah diverifikasi.'
  });
  markCampaignPublished(db, sumurCampaign.id, isoOffset(42));

  // 3. Campaign Zakat Produktif (18 days ago — PSAK 109 Layer 1 Blended Finance)
  const zakatCampaign = createCampaign(db, {
    title: 'Beasiswa Zakat Produktif & De-Risking Modal Tani Mustahik',
    slug: 'beasiswa-zakat-produktif-mustahik',
    episodeId: 'EP-ZIS-03',
    programTheme: 'Zakat Maal Pendayagunaan Mustahik to Muzaki (Layer 1)',
    akadType: 'zakat_maal',
    nazhirName: 'LAZ Amal Produktif Nusantara',
    lazPermitNumber: 'SK Kemenag RI No. 412/2023',
    officialLandingUrl: 'https://zakat.amalproduktif.or.id/beasiswa-produktif',
    beneficiarySummary: '140 mahasiswa dhuafa & keluarga mustahik asnaf fakir-miskin',
    impactReportSummary:
      '64 penerima manfaat angkatan sebelumnya telah lulus dan bertransformasi menjadi munfik/muzaki baru.',
    distributionCostIdr: 3_200_000,
    targetRaiseIdr: 250_000_000,
    honestSroiMultiple: 2.74
  });
  approveCampaign(db, zakatCampaign.id, {
    reviewerName: 'Hj. Siti Rahmawati, S.E.I., M.Ak.',
    reviewerRole: 'PIMPINAN_LAZ',
    reviewerCredential: 'Sertifikasi Akuntansi Syariah (SAS IAI)',
    approved: true,
    laYuftiAcknowledged: true,
    notes: 'Dana Zakat terpisah penuh ke PSAK 109 dan hak Amil <= 12,5%.'
  });
  markCampaignPublished(db, zakatCampaign.id, isoOffset(18));

  // 4. Campaign Pending DPS Review (ready for human sign-off demonstration)
  createCampaign(db, {
    title: 'Wakaf Uang Abadi Cold Storage Nelayan Pantura',
    slug: 'wakaf-abadi-cold-storage-pantura',
    episodeId: 'EP-WKF-04',
    programTheme: 'Wakaf Uang Abadi Infrastruktur Rantai Dingin Perikanan Rakyat',
    akadType: 'wakaf_uang_abadi',
    nazhirName: 'Yayasan Amal Produktif Indonesia',
    stbpnNumber: '3.3.00386',
    lksPwuName: 'Bank Syariah Indonesia (BSI)',
    officialLandingUrl: 'https://wakaf.amalproduktif.or.id/cold-storage',
    beneficiarySummary: '210 nelayan kecil koperasi pesisir Indramayu',
    distributionCostIdr: 1_500_000,
    targetRaiseIdr: 400_000_000,
    honestSroiMultiple: 2.95
  });

  // 5. Campaign Blocked by Deterministic Linter (demonstrates La Yufti & UU PDP gate)
  const blockedCampaign = createCampaign(db, {
    title: 'Draf Wakaf Uang Pelatihan UMKM Pesisir (Perlu Revisi Linter)',
    slug: 'draf-wakaf-umkm-pesisir-revisi',
    episodeId: 'EP-WKF-05',
    programTheme: 'Wakaf Uang Abadi Pembiayaan Mikro Syariah',
    akadType: 'wakaf_uang_abadi',
    nazhirName: 'Yayasan Amal Produktif Indonesia',
    stbpnNumber: '3.3.00386',
    lksPwuName: 'Bank Syariah Indonesia (BSI)',
    officialLandingUrl: 'https://wakaf.amalproduktif.or.id/umkm-pesisir',
    beneficiarySummary: '85 ibu pelaku usaha mikro pesisir',
    distributionCostIdr: 500_000,
    targetRaiseIdr: 150_000_000
  });
  const igVar = blockedCampaign.variants.find(
    (v) => v.channel === 'instagram' && v.segment === 'CALON_WAKIF_BARU'
  );
  if (igVar) {
    updateVariantCopy(db, blockedCampaign.id, igVar.id, {
      copyText:
        'Ayo wakaf uang sekarang! Dijamin cuan 12% untuk wakif dan bisa dicairkan kapan saja. Hubungi langsung penerima manfaat Ibu Sari NIK 3273011205880002 di WA 081298765432.'
    });
  }

  // Seed historical transactions across D+1, D+3, D+7, 30d, and 90d cohorts
  const demoTxs: Array<Parameters<typeof ingestTransaction>[1]> = [
    // EP-CWLS-01 (Published 95 days ago)
    {
      txRef: 'TX-CWLS-9501',
      donorKey: 'WKF-HND-001',
      donorMaskedName: 'H. Hendra W.',
      episodeId: 'EP-CWLS-01',
      utmSource: 'whatsapp',
      utmMedium: 'akuisisi_wakif_baru',
      utmCampaign: cwlsCampaign.slug,
      paymentChannel: 'LKS_PWU_TRANSFER',
      akadType: 'cwls_ritel',
      grossAmountIdr: 50_000_000,
      feePct: 0,
      occurredAt: isoOffset(95, 4) // D+1
    },
    {
      txRef: 'TX-CWLS-9502',
      donorKey: 'WKF-NNK-002',
      donorMaskedName: 'dr. Nunik P.',
      episodeId: 'EP-CWLS-01',
      utmSource: 'instagram',
      utmMedium: 'akuisisi_wakif_baru',
      utmCampaign: cwlsCampaign.slug,
      paymentChannel: 'LKS_PWU_TRANSFER',
      akadType: 'cwls_ritel',
      grossAmountIdr: 25_000_000,
      feePct: 0,
      occurredAt: isoOffset(94, 6) // D+1..D+3
    },
    {
      txRef: 'TX-CWLS-9503',
      donorKey: 'WKF-FRD-003',
      donorMaskedName: 'Farid A.',
      episodeId: 'EP-CWLS-01',
      utmSource: 'youtube_shorts',
      utmMedium: 'akuisisi_wakif_baru',
      utmCampaign: cwlsCampaign.slug,
      paymentChannel: 'PAYMENT_GATEWAY',
      akadType: 'wakaf_uang_abadi',
      grossAmountIdr: 10_000_000,
      feePct: 0,
      occurredAt: isoOffset(93, 2) // D+3
    },
    {
      txRef: 'TX-CWLS-9504',
      donorKey: 'WKF-SYF-004',
      donorMaskedName: 'Syifa K.',
      episodeId: 'EP-CWLS-01',
      utmSource: 'x_threads',
      utmMedium: 'akuisisi_wakif_baru',
      utmCampaign: cwlsCampaign.slug,
      paymentChannel: 'QRIS_DINAMIS',
      akadType: 'wakaf_uang_abadi',
      grossAmountIdr: 5_000_000,
      feePct: 0,
      occurredAt: isoOffset(90, 5) // D+7
    },
    {
      txRef: 'TX-CWLS-9505',
      donorKey: 'WKF-HND-001', // Repeat within 20 days!
      donorMaskedName: 'H. Hendra W.',
      episodeId: 'EP-CWLS-01',
      utmSource: 'whatsapp',
      utmMedium: 'retensi_laporan_dampak',
      utmCampaign: cwlsCampaign.slug,
      paymentChannel: 'WAFLARE_WEBHOOK',
      akadType: 'cwls_ritel',
      grossAmountIdr: 30_000_000,
      feePct: 0,
      occurredAt: isoOffset(75, 2)
    },
    {
      txRef: 'TX-CWLS-9506',
      donorKey: 'WKF-YLD-005',
      donorMaskedName: 'Kupon CWLS SWR006 (BSI)',
      donorType: 'KORPORASI',
      episodeId: 'EP-CWLS-01',
      utmSource: 'whatsapp',
      utmMedium: 'retensi_laporan_dampak',
      utmCampaign: cwlsCampaign.slug,
      paymentChannel: 'LKS_PWU_TRANSFER',
      akadType: 'hasil_kelolaan_wakaf',
      grossAmountIdr: 18_500_000,
      feePct: 8, // 8% Nazhir operational share (compliant <= 10%)
      occurredAt: isoOffset(32, 3)
    },

    // EP-WKF-02 (Published 42 days ago)
    {
      txRef: 'TX-WKF-4201',
      donorKey: 'WKF-NNK-002', // Repeat within 52 days (<=90d)!
      donorMaskedName: 'dr. Nunik P.',
      episodeId: 'EP-WKF-02',
      utmSource: 'whatsapp',
      utmMedium: 'retensi_laporan_dampak',
      utmCampaign: sumurCampaign.slug,
      paymentChannel: 'WAFLARE_WEBHOOK',
      akadType: 'wakaf_melalui_uang',
      grossAmountIdr: 15_000_000,
      feePct: 0,
      occurredAt: isoOffset(42, 3) // D+1
    },
    {
      txRef: 'TX-WKF-4202',
      donorKey: 'WKF-RZK-006',
      donorMaskedName: 'Rizky M.',
      episodeId: 'EP-WKF-02',
      utmSource: 'instagram',
      utmMedium: 'akuisisi_wakif_baru',
      utmCampaign: sumurCampaign.slug,
      paymentChannel: 'QRIS_DINAMIS',
      akadType: 'wakaf_melalui_uang',
      grossAmountIdr: 8_500_000,
      feePct: 0,
      occurredAt: isoOffset(42, 10) // D+1
    },
    {
      txRef: 'TX-WKF-4203',
      donorKey: 'WKF-BGS-007',
      donorMaskedName: 'Bagas T.',
      episodeId: 'EP-WKF-02',
      utmSource: 'tiktok',
      utmMedium: 'akuisisi_wakif_baru',
      utmCampaign: sumurCampaign.slug,
      paymentChannel: 'QRIS_DINAMIS',
      akadType: 'wakaf_melalui_uang',
      grossAmountIdr: 3_250_000,
      feePct: 0,
      occurredAt: isoOffset(40, 2) // D+3
    },
    {
      txRef: 'TX-WKF-4204',
      donorKey: 'WKF-FRD-003', // Repeat within 54 days (<=90d)!
      donorMaskedName: 'Farid A.',
      episodeId: 'EP-WKF-02',
      utmSource: 'youtube_shorts',
      utmMedium: 'retensi_laporan_dampak',
      utmCampaign: sumurCampaign.slug,
      paymentChannel: 'LKS_PWU_TRANSFER',
      akadType: 'wakaf_uang_abadi',
      grossAmountIdr: 20_000_000,
      feePct: 0,
      occurredAt: isoOffset(39, 8) // D+3
    },
    {
      txRef: 'TX-WKF-4205',
      donorKey: 'WKF-ADN-008',
      donorMaskedName: 'Adinda R.',
      episodeId: 'EP-WKF-02',
      utmSource: 'instagram',
      utmMedium: 'akuisisi_wakif_baru',
      utmCampaign: sumurCampaign.slug,
      paymentChannel: 'PAYMENT_GATEWAY',
      akadType: 'wakaf_melalui_uang',
      grossAmountIdr: 12_000_000,
      feePct: 0,
      occurredAt: isoOffset(36, 4) // D+7
    },
    {
      txRef: 'TX-WKF-4206',
      donorKey: 'WKF-RZK-006', // Repeat within 16 days (<=30d)!
      donorMaskedName: 'Rizky M.',
      episodeId: 'EP-WKF-02',
      utmSource: 'whatsapp',
      utmMedium: 'retensi_laporan_dampak',
      utmCampaign: sumurCampaign.slug,
      paymentChannel: 'WAFLARE_WEBHOOK',
      akadType: 'wakaf_melalui_uang',
      grossAmountIdr: 10_000_000,
      feePct: 0,
      occurredAt: isoOffset(26, 2)
    },
    {
      txRef: 'TX-WKF-4207',
      donorKey: 'WKF-KPT-009',
      donorMaskedName: 'PT Barakah Agro Mandiri',
      donorType: 'KORPORASI',
      episodeId: 'EP-WKF-02',
      utmSource: 'x_threads',
      utmMedium: 'akuisisi_wakif_baru',
      utmCampaign: sumurCampaign.slug,
      paymentChannel: 'LKS_PWU_TRANSFER',
      akadType: 'dana_sosial_dampak',
      grossAmountIdr: 35_000_000,
      feePct: 5,
      occurredAt: isoOffset(15, 5)
    },

    // EP-ZIS-03 (Published 18 days ago — PSAK 109)
    {
      txRef: 'TX-ZIS-1801',
      donorKey: 'MZK-ALF-010',
      donorMaskedName: 'Alfi N.',
      episodeId: 'EP-ZIS-03',
      utmSource: 'instagram',
      utmMedium: 'akuisisi_wakif_baru',
      utmCampaign: zakatCampaign.slug,
      paymentChannel: 'PAYMENT_GATEWAY',
      akadType: 'zakat_maal',
      grossAmountIdr: 18_000_000,
      feePct: 12.5, // Max 1/8 Amil share
      occurredAt: isoOffset(18, 5) // D+1
    },
    {
      txRef: 'TX-ZIS-1802',
      donorKey: 'WKF-SYF-004', // Cross-layer donor within 80d!
      donorMaskedName: 'Syifa K.',
      episodeId: 'EP-ZIS-03',
      utmSource: 'whatsapp',
      utmMedium: 'retensi_laporan_dampak',
      utmCampaign: zakatCampaign.slug,
      paymentChannel: 'WAFLARE_WEBHOOK',
      akadType: 'zakat_maal',
      grossAmountIdr: 12_500_000,
      feePct: 10,
      occurredAt: isoOffset(17, 2) // D+1..D+3
    },
    {
      txRef: 'TX-ZIS-1803',
      donorKey: 'MZK-DWN-011',
      donorMaskedName: 'Dewi N.',
      episodeId: 'EP-ZIS-03',
      utmSource: 'tiktok',
      utmMedium: 'akuisisi_wakif_baru',
      utmCampaign: zakatCampaign.slug,
      paymentChannel: 'QRIS_DINAMIS',
      akadType: 'infak_terikat',
      grossAmountIdr: 4_750_000,
      feePct: 10,
      occurredAt: isoOffset(16, 4) // D+3
    },
    {
      txRef: 'TX-ZIS-1804',
      donorKey: 'MZK-ALF-010', // Repeat within 12 days!
      donorMaskedName: 'Alfi N.',
      episodeId: 'EP-ZIS-03',
      utmSource: 'whatsapp',
      utmMedium: 'retensi_laporan_dampak',
      utmCampaign: zakatCampaign.slug,
      paymentChannel: 'WAFLARE_WEBHOOK',
      akadType: 'infak_terikat',
      grossAmountIdr: 7_500_000,
      feePct: 10,
      occurredAt: isoOffset(6, 1)
    },
    {
      txRef: 'TX-ZIS-1805',
      donorKey: 'WKF-ADN-008', // Repeat within 32 days (<=90d)!
      donorMaskedName: 'Adinda R.',
      episodeId: 'EP-ZIS-03',
      utmSource: 'youtube_shorts',
      utmMedium: 'retensi_laporan_dampak',
      utmCampaign: zakatCampaign.slug,
      paymentChannel: 'QRIS_DINAMIS',
      akadType: 'zakat_maal',
      grossAmountIdr: 9_000_000,
      feePct: 12.5,
      occurredAt: isoOffset(4, 2)
    }
  ];

  for (const tx of demoTxs) {
    ingestTransaction(db, tx);
  }
}
