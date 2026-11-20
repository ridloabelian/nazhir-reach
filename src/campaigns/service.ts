import { createHash, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { toSqlValue } from '../db/database.js';
import { lintCampaignCopy } from '../linter/engine.js';
import type {
  AkadType,
  ApprovalGateInput,
  ApprovalReviewRecord,
  AudienceSegment,
  CampaignBriefInput,
  CampaignRecord,
  CampaignStatus,
  CampaignVariantRecord,
  ChannelPlatform,
  LinterFinding,
  ReviewerRole
} from '../types/domain.js';
import { AKAD_METADATA } from '../types/domain.js';
import { packageCampaignBrief, slugifyCampaign } from './packager.js';

const VALID_REVIEWER_ROLES = new Set<ReviewerRole>([
  'DPS',
  'PIMPINAN_NAZHIR',
  'CWC_OFFICER',
  'PIMPINAN_LAZ'
]);

export class GovernanceGateError extends Error {
  public readonly code:
    | 'NOT_FOUND'
    | 'LINTER_BLOCKER_ACTIVE'
    | 'HUMAN_SIGNOFF_INCOMPLETE'
    | 'INVALID_INPUT';
  public readonly statusCode: number;

  constructor(
    code:
      | 'NOT_FOUND'
      | 'LINTER_BLOCKER_ACTIVE'
      | 'HUMAN_SIGNOFF_INCOMPLETE'
      | 'INVALID_INPUT',
    message: string,
    statusCode = 422
  ) {
    super(message);
    this.name = 'GovernanceGateError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

interface CampaignRow {
  id: string;
  slug: string;
  episode_id: string;
  title: string;
  program_theme: string;
  akad_type: AkadType;
  accounting_standard: 'PSAK_412' | 'PSAK_109';
  blended_layer: 'LAYER_1_ZIS_DERISKING' | 'LAYER_2_WAQF_HIFZ_AL_ASHL';
  nazhir_name: string;
  stbpn_number: string | null;
  lks_pwu_name: string | null;
  laz_permit_number: string | null;
  official_landing_url: string;
  beneficiary_summary: string;
  impact_report_summary: string | null;
  distribution_cost_idr: number;
  target_raise_idr: number;
  honest_sroi_multiple: number | null;
  status: CampaignStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface VariantRow {
  id: string;
  campaign_id: string;
  channel: ChannelPlatform;
  segment: AudienceSegment;
  format_label: string;
  headline: string;
  copy_text: string;
  cta_label: string;
  tracking_url: string;
  utm_source: ChannelPlatform;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  lint_passed: number;
  blocker_count: number;
  warning_count: number;
  findings_json: string;
  scrubbed_copy: string;
  updated_at: string;
}

interface ReviewRow {
  id: string;
  campaign_id: string;
  reviewer_name: string;
  reviewer_role: ReviewerRole;
  reviewer_credential: string | null;
  decision: 'APPROVED' | 'REJECTED';
  notes: string;
  la_yufti_acknowledged: number;
  content_digest_sha256: string;
  reviewed_at: string;
}

function mapVariantRow(row: VariantRow): CampaignVariantRecord {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    channel: row.channel,
    segment: row.segment,
    formatLabel: row.format_label,
    headline: row.headline,
    copyText: row.copy_text,
    ctaLabel: row.cta_label,
    trackingUrl: row.tracking_url,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    lintPassed: row.lint_passed === 1,
    blockerCount: row.blocker_count,
    warningCount: row.warning_count,
    findings: JSON.parse(row.findings_json) as LinterFinding[],
    scrubbedCopy: row.scrubbed_copy,
    updatedAt: row.updated_at
  };
}

function mapReviewRow(row: ReviewRow): ApprovalReviewRecord {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    reviewerName: row.reviewer_name,
    reviewerRole: row.reviewer_role,
    reviewerCredential: row.reviewer_credential ?? undefined,
    decision: row.decision,
    notes: row.notes,
    laYuftiAcknowledged: row.la_yufti_acknowledged === 1,
    contentDigestSha256: row.content_digest_sha256,
    reviewedAt: row.reviewed_at
  };
}

function mapCampaignRow(
  row: CampaignRow,
  variants: CampaignVariantRecord[],
  reviews: ApprovalReviewRecord[]
): CampaignRecord {
  return {
    id: row.id,
    slug: row.slug,
    episodeId: row.episode_id,
    title: row.title,
    programTheme: row.program_theme,
    akadType: row.akad_type,
    accountingStandard: row.accounting_standard,
    blendedLayer: row.blended_layer,
    nazhirName: row.nazhir_name,
    stbpnNumber: row.stbpn_number,
    lksPwuName: row.lks_pwu_name,
    lazPermitNumber: row.laz_permit_number,
    officialLandingUrl: row.official_landing_url,
    beneficiarySummary: row.beneficiary_summary,
    impactReportSummary: row.impact_report_summary,
    distributionCostIdr: row.distribution_cost_idr,
    targetRaiseIdr: row.target_raise_idr,
    honestSroiMultiple: row.honest_sroi_multiple,
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    variants,
    reviews
  };
}

export function computeVariantsDigest(variants: CampaignVariantRecord[]): string {
  const canonical = [...variants]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((v) => `${v.id}:${v.channel}:${v.segment}:${v.headline}:${v.copyText}`)
    .join('\n');
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function createCampaign(
  db: DatabaseSync,
  brief: CampaignBriefInput
): CampaignRecord {
  if (!brief.title?.trim() || !brief.episodeId?.trim() || !brief.nazhirName?.trim()) {
    throw new GovernanceGateError(
      'INVALID_INPUT',
      'Judul kampanye, episodeId (ef_ep), dan nama Nazhir/LAZ wajib diisi.',
      400
    );
  }
  if (!AKAD_METADATA[brief.akadType]) {
    throw new GovernanceGateError(
      'INVALID_INPUT',
      `Akad tidak dikenali: ${brief.akadType}`,
      400
    );
  }

  const campaignId = randomUUID();
  const slug = brief.slug?.trim()
    ? slugifyCampaign(brief.slug)
    : slugifyCampaign(brief.title);
  const now = new Date().toISOString();
  const meta = AKAD_METADATA[brief.akadType];

  const variants = packageCampaignBrief(campaignId, { ...brief, slug });
  const totalBlockers = variants.reduce((sum, v) => sum + v.blockerCount, 0);
  const initialStatus: CampaignStatus =
    totalBlockers > 0 ? 'LINT_BLOCKED' : 'PENDING_DPS_REVIEW';

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `INSERT INTO campaigns (
        id, slug, episode_id, title, program_theme, akad_type,
        accounting_standard, blended_layer, nazhir_name, stbpn_number,
        lks_pwu_name, laz_permit_number, official_landing_url,
        beneficiary_summary, impact_report_summary, distribution_cost_idr,
        target_raise_idr, honest_sroi_multiple, status, published_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      toSqlValue(campaignId),
      toSqlValue(slug),
      toSqlValue(brief.episodeId.trim()),
      toSqlValue(brief.title.trim()),
      toSqlValue(brief.programTheme.trim()),
      toSqlValue(brief.akadType),
      toSqlValue(meta.accountingStandard),
      toSqlValue(meta.blendedLayer),
      toSqlValue(brief.nazhirName.trim()),
      toSqlValue(brief.stbpnNumber?.trim() || null),
      toSqlValue(brief.lksPwuName?.trim() || null),
      toSqlValue(brief.lazPermitNumber?.trim() || null),
      toSqlValue(brief.officialLandingUrl.trim()),
      toSqlValue(brief.beneficiarySummary.trim()),
      toSqlValue(brief.impactReportSummary?.trim() || null),
      toSqlValue(Math.max(0, Math.round(brief.distributionCostIdr ?? 0))),
      toSqlValue(Math.max(0, Math.round(brief.targetRaiseIdr ?? 0))),
      toSqlValue(brief.honestSroiMultiple ?? null),
      toSqlValue(initialStatus),
      toSqlValue(brief.publishedAt ?? null),
      toSqlValue(now),
      toSqlValue(now)
    );

    const insertVariant = db.prepare(
      `INSERT INTO campaign_variants (
        id, campaign_id, channel, segment, format_label, headline,
        copy_text, cta_label, tracking_url, utm_source, utm_medium,
        utm_campaign, utm_content, lint_passed, blocker_count,
        warning_count, findings_json, scrubbed_copy, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const v of variants) {
      insertVariant.run(
        toSqlValue(v.id),
        toSqlValue(v.campaignId),
        toSqlValue(v.channel),
        toSqlValue(v.segment),
        toSqlValue(v.formatLabel),
        toSqlValue(v.headline),
        toSqlValue(v.copyText),
        toSqlValue(v.ctaLabel),
        toSqlValue(v.trackingUrl),
        toSqlValue(v.utmSource),
        toSqlValue(v.utmMedium),
        toSqlValue(v.utmCampaign),
        toSqlValue(v.utmContent),
        toSqlValue(v.lintPassed),
        toSqlValue(v.blockerCount),
        toSqlValue(v.warningCount),
        toSqlValue(JSON.stringify(v.findings)),
        toSqlValue(v.scrubbedCopy),
        toSqlValue(v.updatedAt)
      );
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return getCampaign(db, campaignId)!;
}

export function getCampaign(
  db: DatabaseSync,
  campaignId: string
): CampaignRecord | null {
  const row = db
    .prepare('SELECT * FROM campaigns WHERE id = ? OR slug = ?')
    .get(campaignId, campaignId) as CampaignRow | undefined;

  if (!row) return null;

  const variantRows = db
    .prepare(
      'SELECT * FROM campaign_variants WHERE campaign_id = ? ORDER BY channel, segment'
    )
    .all(row.id) as unknown as VariantRow[];

  const reviewRows = db
    .prepare(
      'SELECT * FROM approval_reviews WHERE campaign_id = ? ORDER BY reviewed_at DESC'
    )
    .all(row.id) as unknown as ReviewRow[];

  return mapCampaignRow(
    row,
    variantRows.map(mapVariantRow),
    reviewRows.map(mapReviewRow)
  );
}

export function listCampaigns(db: DatabaseSync): CampaignRecord[] {
  const rows = db
    .prepare('SELECT * FROM campaigns ORDER BY created_at DESC')
    .all() as unknown as CampaignRow[];

  return rows.map((row) => {
    const variantRows = db
      .prepare(
        'SELECT * FROM campaign_variants WHERE campaign_id = ? ORDER BY channel, segment'
      )
      .all(row.id) as unknown as VariantRow[];
    const reviewRows = db
      .prepare(
        'SELECT * FROM approval_reviews WHERE campaign_id = ? ORDER BY reviewed_at DESC'
      )
      .all(row.id) as unknown as ReviewRow[];
    return mapCampaignRow(
      row,
      variantRows.map(mapVariantRow),
      reviewRows.map(mapReviewRow)
    );
  });
}

export function updateVariantCopy(
  db: DatabaseSync,
  campaignId: string,
  variantId: string,
  patch: { copyText?: string; headline?: string; ctaLabel?: string }
): CampaignRecord {
  const campaign = getCampaign(db, campaignId);
  if (!campaign) {
    throw new GovernanceGateError('NOT_FOUND', 'Kampanye tidak ditemukan.', 404);
  }
  const existing = campaign.variants.find((v) => v.id === variantId);
  if (!existing) {
    throw new GovernanceGateError(
      'NOT_FOUND',
      'Varian konten tidak ditemukan pada kampanye ini.',
      404
    );
  }

  const nextCopy = patch.copyText ?? existing.copyText;
  const nextHeadline = patch.headline ?? existing.headline;
  const nextCta = patch.ctaLabel ?? existing.ctaLabel;
  const now = new Date().toISOString();

  const lint = lintCampaignCopy({
    text: nextCopy,
    akadType: campaign.akadType,
    channel: existing.channel,
    segment: existing.segment
  });

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `UPDATE campaign_variants
       SET headline = ?, copy_text = ?, cta_label = ?,
           lint_passed = ?, blocker_count = ?, warning_count = ?,
           findings_json = ?, scrubbed_copy = ?, updated_at = ?
       WHERE id = ? AND campaign_id = ?`
    ).run(
      toSqlValue(nextHeadline),
      toSqlValue(nextCopy),
      toSqlValue(nextCta),
      toSqlValue(lint.passed),
      toSqlValue(lint.blockerCount),
      toSqlValue(lint.warningCount),
      toSqlValue(JSON.stringify(lint.findings)),
      toSqlValue(lint.scrubbedCopy),
      toSqlValue(now),
      toSqlValue(variantId),
      toSqlValue(campaign.id)
    );

    const summary = db
      .prepare(
        'SELECT COALESCE(SUM(blocker_count), 0) AS blockers FROM campaign_variants WHERE campaign_id = ?'
      )
      .get(campaign.id) as { blockers: number };

    // Editing copy invalidates any prior approval so human DPS must re-review.
    const nextStatus: CampaignStatus =
      summary.blockers > 0 ? 'LINT_BLOCKED' : 'PENDING_DPS_REVIEW';

    db.prepare(
      'UPDATE campaigns SET status = ?, updated_at = ? WHERE id = ?'
    ).run(toSqlValue(nextStatus), toSqlValue(now), toSqlValue(campaign.id));

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return getCampaign(db, campaign.id)!;
}

export function approveCampaign(
  db: DatabaseSync,
  campaignId: string,
  input: ApprovalGateInput
): CampaignRecord {
  const campaign = getCampaign(db, campaignId);
  if (!campaign) {
    throw new GovernanceGateError('NOT_FOUND', 'Kampanye tidak ditemukan.', 404);
  }

  if (!input.reviewerName?.trim() || !VALID_REVIEWER_ROLES.has(input.reviewerRole)) {
    throw new GovernanceGateError(
      'HUMAN_SIGNOFF_INCOMPLETE',
      'Nama reviewer dan peran resmi (DPS / PIMPINAN_NAZHIR / CWC_OFFICER / PIMPINAN_LAZ) wajib diisi.',
      422
    );
  }
  if (!input.laYuftiAcknowledged) {
    throw new GovernanceGateError(
      'HUMAN_SIGNOFF_INCOMPLETE',
      'Pengesahan wajib mencentang deklarasi La Yufti bahwa keputusan syariah dibuat oleh manusia berwenang, bukan AI.',
      422
    );
  }

  const now = new Date().toISOString();

  // Re-evaluate every variant deterministically right at the approval gate.
  let totalBlockers = 0;
  const refreshedVariants: CampaignVariantRecord[] = [];
  for (const variant of campaign.variants) {
    const lint = lintCampaignCopy({
      text: variant.copyText,
      akadType: campaign.akadType,
      channel: variant.channel,
      segment: variant.segment
    });
    totalBlockers += lint.blockerCount;
    refreshedVariants.push({
      ...variant,
      lintPassed: lint.passed,
      blockerCount: lint.blockerCount,
      warningCount: lint.warningCount,
      findings: lint.findings,
      scrubbedCopy: lint.scrubbedCopy,
      updatedAt: now
    });
  }

  if (input.approved && totalBlockers > 0) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const updateStmt = db.prepare(
        `UPDATE campaign_variants
         SET lint_passed = ?, blocker_count = ?, warning_count = ?,
             findings_json = ?, scrubbed_copy = ?, updated_at = ?
         WHERE id = ?`
      );
      for (const v of refreshedVariants) {
        updateStmt.run(
          toSqlValue(v.lintPassed),
          toSqlValue(v.blockerCount),
          toSqlValue(v.warningCount),
          toSqlValue(JSON.stringify(v.findings)),
          toSqlValue(v.scrubbedCopy),
          toSqlValue(now),
          toSqlValue(v.id)
        );
      }
      db.prepare('UPDATE campaigns SET status = ?, updated_at = ? WHERE id = ?').run(
        'LINT_BLOCKED',
        now,
        campaign.id
      );
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    throw new GovernanceGateError(
      'LINTER_BLOCKER_ACTIVE',
      `Kampanye masih memiliki ${totalBlockers} pelanggaran BLOCKER pada Linter Syariah / UU PDP dan dilarang disahkan ke APPROVED_FOR_PUBLISH.`,
      422
    );
  }

  const digest = computeVariantsDigest(refreshedVariants);
  const reviewId = randomUUID();
  const nextStatus: CampaignStatus = input.approved
    ? 'APPROVED_FOR_PUBLISH'
    : 'REJECTED';

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `INSERT INTO approval_reviews (
        id, campaign_id, reviewer_name, reviewer_role, reviewer_credential,
        decision, notes, la_yufti_acknowledged, content_digest_sha256, reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      toSqlValue(reviewId),
      toSqlValue(campaign.id),
      toSqlValue(input.reviewerName.trim()),
      toSqlValue(input.reviewerRole),
      toSqlValue(input.reviewerCredential?.trim() || null),
      toSqlValue(input.approved ? 'APPROVED' : 'REJECTED'),
      toSqlValue(
        input.notes?.trim() ||
          (input.approved
            ? 'Disahkan setelah verifikasi pra-penapisan syariah dan tata kelola Nazhir/LAZ.'
            : 'Dikembalikan untuk revisi naskah oleh tim media.')
      ),
      toSqlValue(input.laYuftiAcknowledged),
      toSqlValue(digest),
      toSqlValue(now)
    );

    db.prepare('UPDATE campaigns SET status = ?, updated_at = ? WHERE id = ?').run(
      toSqlValue(nextStatus),
      toSqlValue(now),
      toSqlValue(campaign.id)
    );

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return getCampaign(db, campaign.id)!;
}

export function markCampaignPublished(
  db: DatabaseSync,
  campaignId: string,
  publishedAt?: string
): CampaignRecord {
  const campaign = getCampaign(db, campaignId);
  if (!campaign) {
    throw new GovernanceGateError('NOT_FOUND', 'Kampanye tidak ditemukan.', 404);
  }
  if (campaign.status !== 'APPROVED_FOR_PUBLISH') {
    throw new GovernanceGateError(
      'HUMAN_SIGNOFF_INCOMPLETE',
      'Kampanye hanya boleh masuk status PUBLISHED setelah berstatus APPROVED_FOR_PUBLISH oleh reviewer manusia.',
      422
    );
  }
  const ts = publishedAt ?? new Date().toISOString();
  db.prepare(
    'UPDATE campaigns SET status = ?, published_at = ?, updated_at = ? WHERE id = ?'
  ).run('PUBLISHED', ts, ts, campaign.id);

  return getCampaign(db, campaign.id)!;
}
