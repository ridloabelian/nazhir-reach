export type AkadType =
  | 'wakaf_uang_abadi'
  | 'wakaf_melalui_uang'
  | 'cwls_ritel'
  | 'hasil_kelolaan_wakaf'
  | 'zakat_maal'
  | 'infak_terikat'
  | 'dana_sosial_dampak';

export type AccountingStandard = 'PSAK_412' | 'PSAK_109';

export type BlendedFinanceLayer =
  | 'LAYER_1_ZIS_DERISKING'
  | 'LAYER_2_WAQF_HIFZ_AL_ASHL';

export type ChannelPlatform =
  | 'instagram'
  | 'tiktok'
  | 'youtube_shorts'
  | 'x_threads'
  | 'whatsapp';

export type AudienceSegment =
  | 'CALON_WAKIF_BARU'
  | 'LAPORAN_DAMPAK_WAKIF_EKSISTING';

export type CampaignStatus =
  | 'DRAFT'
  | 'LINT_BLOCKED'
  | 'PENDING_DPS_REVIEW'
  | 'APPROVED_FOR_PUBLISH'
  | 'PUBLISHED'
  | 'REJECTED';

export type ReviewerRole =
  | 'DPS'
  | 'PIMPINAN_NAZHIR'
  | 'CWC_OFFICER'
  | 'PIMPINAN_LAZ';

export type LinterSeverity = 'BLOCKER' | 'WARNING';

export type LinterRuleCode =
  | 'SHARIA-001'
  | 'SHARIA-002'
  | 'SHARIA-003'
  | 'SHARIA-004'
  | 'PDP-001';

export interface LinterFinding {
  ruleCode: LinterRuleCode;
  severity: LinterSeverity;
  title: string;
  message: string;
  regulationRef: string;
  matchedExcerpt: string;
  remediation: string;
}

export interface LaYuftiNotice {
  principle: 'LA_YUFTI';
  aiIsMufti: false;
  requiresHumanDpsSignOff: true;
  disclaimer: string;
}

export interface LintInput {
  text: string;
  akadType?: AkadType;
  channel?: ChannelPlatform;
  segment?: AudienceSegment;
}

export interface LintResult {
  passed: boolean;
  canSubmitForDpsReview: boolean;
  blockerCount: number;
  warningCount: number;
  findings: LinterFinding[];
  scrubbedCopy: string;
  piiDetected: boolean;
  checkedAt: string;
  laYufti: LaYuftiNotice;
}

export interface CampaignBriefInput {
  title: string;
  slug?: string;
  episodeId: string;
  programTheme: string;
  akadType: AkadType;
  nazhirName: string;
  stbpnNumber?: string;
  lksPwuName?: string;
  lazPermitNumber?: string;
  officialLandingUrl: string;
  beneficiarySummary: string;
  impactReportSummary?: string;
  distributionCostIdr?: number;
  targetRaiseIdr?: number;
  honestSroiMultiple?: number;
  publishedAt?: string;
}

export interface CampaignVariantRecord {
  id: string;
  campaignId: string;
  channel: ChannelPlatform;
  segment: AudienceSegment;
  formatLabel: string;
  headline: string;
  copyText: string;
  ctaLabel: string;
  trackingUrl: string;
  utmSource: ChannelPlatform;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  lintPassed: boolean;
  blockerCount: number;
  warningCount: number;
  findings: LinterFinding[];
  scrubbedCopy: string;
  updatedAt: string;
}

export interface ApprovalReviewRecord {
  id: string;
  campaignId: string;
  reviewerName: string;
  reviewerRole: ReviewerRole;
  reviewerCredential?: string;
  decision: 'APPROVED' | 'REJECTED';
  notes: string;
  laYuftiAcknowledged: boolean;
  contentDigestSha256: string;
  reviewedAt: string;
}

export interface CampaignRecord {
  id: string;
  slug: string;
  episodeId: string;
  title: string;
  programTheme: string;
  akadType: AkadType;
  accountingStandard: AccountingStandard;
  blendedLayer: BlendedFinanceLayer;
  nazhirName: string;
  stbpnNumber: string | null;
  lksPwuName: string | null;
  lazPermitNumber: string | null;
  officialLandingUrl: string;
  beneficiarySummary: string;
  impactReportSummary: string | null;
  distributionCostIdr: number;
  targetRaiseIdr: number;
  honestSroiMultiple: number | null;
  status: CampaignStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  variants: CampaignVariantRecord[];
  reviews: ApprovalReviewRecord[];
}

export interface ApprovalGateInput {
  reviewerName: string;
  reviewerRole: ReviewerRole;
  reviewerCredential?: string;
  approved: boolean;
  laYuftiAcknowledged: boolean;
  notes?: string;
}

export interface SroiOutcomeStreamInput {
  label: string;
  beneficiaryCount: number;
  grossUnitValueIdr: number;
  deadweightPct: number;
  displacementPct: number;
  attributionPct: number;
  dropOffPct: number;
  benefitPeriodYears: number;
}

export interface SroiInput {
  programName?: string;
  totalInvestmentIdr: number;
  discountRatePct?: number;
  streams: SroiOutcomeStreamInput[];
}

export interface SroiStreamBreakdown {
  label: string;
  beneficiaryCount: number;
  grossAnnualValueIdr: number;
  grossUndiscountedTotalIdr: number;
  year1NetImpactIdr: number;
  presentValueIdr: number;
  yearlyNetPresentValues: Array<{
    year: number;
    netImpactIdr: number;
    presentValueIdr: number;
  }>;
}

export interface SroiResult {
  programName: string;
  totalInvestmentIdr: number;
  discountRatePct: number;
  grossUndiscountedTotalIdr: number;
  naiveVanityRatio: number;
  presentValueBenefitsIdr: number;
  netPresentSocialValueIdr: number;
  honestSroiRatio: number;
  haircutPct: number;
  credibilityBand: 'CONSERVATIVE_CREDIBLE' | 'SUB_BREAKEVEN' | 'REQUIRES_CWC_AUDIT';
  methodologyNote: string;
  streams: SroiStreamBreakdown[];
}

export type PaymentChannel =
  | 'QRIS_DINAMIS'
  | 'LKS_PWU_TRANSFER'
  | 'PAYMENT_GATEWAY'
  | 'WAFLARE_WEBHOOK';

export interface TransactionIngestInput {
  txRef: string;
  donorKey: string;
  donorMaskedName: string;
  donorType?: 'INDIVIDU' | 'KORPORASI' | 'KOMUNITAS';
  campaignId?: string;
  variantId?: string;
  episodeId: string;
  utmSource: ChannelPlatform | 'direct';
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  paymentChannel: PaymentChannel;
  akadType: AkadType;
  grossAmountIdr: number;
  feePct?: number;
  occurredAt?: string;
}

export interface TransactionRecord {
  id: string;
  txRef: string;
  donorKey: string;
  donorMaskedName: string;
  campaignId: string | null;
  variantId: string | null;
  episodeId: string;
  utmSource: string;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  paymentChannel: PaymentChannel;
  akadType: AkadType;
  accountingStandard: AccountingStandard;
  blendedLayer: BlendedFinanceLayer;
  grossAmountIdr: number;
  feePct: number;
  feeAmountIdr: number;
  netProgramAmountIdr: number;
  isRepeatDonorTx: boolean;
  occurredAt: string;
}

export interface AkadMetadata {
  akadType: AkadType;
  label: string;
  accountingStandard: AccountingStandard;
  blendedLayer: BlendedFinanceLayer;
  principalProtected: boolean;
  maxOperationalFeePct: number;
  odooTargetRepo: 'ridloabelian/waqf-odoo-modules' | 'ridloabelian/zakat-odoo-modules';
}

export const AKAD_METADATA: Record<AkadType, AkadMetadata> = {
  wakaf_uang_abadi: {
    akadType: 'wakaf_uang_abadi',
    label: 'Wakaf Uang Abadi (Hifz al-Ashl)',
    accountingStandard: 'PSAK_412',
    blendedLayer: 'LAYER_2_WAQF_HIFZ_AL_ASHL',
    principalProtected: true,
    maxOperationalFeePct: 0,
    odooTargetRepo: 'ridloabelian/waqf-odoo-modules'
  },
  wakaf_melalui_uang: {
    akadType: 'wakaf_melalui_uang',
    label: 'Wakaf Melalui Uang (Aset Produktif)',
    accountingStandard: 'PSAK_412',
    blendedLayer: 'LAYER_2_WAQF_HIFZ_AL_ASHL',
    principalProtected: true,
    maxOperationalFeePct: 0,
    odooTargetRepo: 'ridloabelian/waqf-odoo-modules'
  },
  cwls_ritel: {
    akadType: 'cwls_ritel',
    label: 'CWLS Ritel (Cash Waqf Linked Sukuk)',
    accountingStandard: 'PSAK_412',
    blendedLayer: 'LAYER_2_WAQF_HIFZ_AL_ASHL',
    principalProtected: true,
    maxOperationalFeePct: 0,
    odooTargetRepo: 'ridloabelian/waqf-odoo-modules'
  },
  hasil_kelolaan_wakaf: {
    akadType: 'hasil_kelolaan_wakaf',
    label: 'Hasil Pengelolaan Wakaf (Ujrah Nazhir <= 10%)',
    accountingStandard: 'PSAK_412',
    blendedLayer: 'LAYER_2_WAQF_HIFZ_AL_ASHL',
    principalProtected: false,
    maxOperationalFeePct: 10,
    odooTargetRepo: 'ridloabelian/waqf-odoo-modules'
  },
  zakat_maal: {
    akadType: 'zakat_maal',
    label: 'Zakat Maal / Profesi (8 Asnaf, Amil <= 12,5%)',
    accountingStandard: 'PSAK_109',
    blendedLayer: 'LAYER_1_ZIS_DERISKING',
    principalProtected: false,
    maxOperationalFeePct: 12.5,
    odooTargetRepo: 'ridloabelian/zakat-odoo-modules'
  },
  infak_terikat: {
    akadType: 'infak_terikat',
    label: 'Infak / Sedekah Terikat (Muqayyad)',
    accountingStandard: 'PSAK_109',
    blendedLayer: 'LAYER_1_ZIS_DERISKING',
    principalProtected: false,
    maxOperationalFeePct: 20,
    odooTargetRepo: 'ridloabelian/zakat-odoo-modules'
  },
  dana_sosial_dampak: {
    akadType: 'dana_sosial_dampak',
    label: 'Dana Sosial Dampak (Blended Finance De-Risking)',
    accountingStandard: 'PSAK_109',
    blendedLayer: 'LAYER_1_ZIS_DERISKING',
    principalProtected: false,
    maxOperationalFeePct: 20,
    odooTargetRepo: 'ridloabelian/zakat-odoo-modules'
  }
};
