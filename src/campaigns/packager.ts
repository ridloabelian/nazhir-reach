import { randomUUID } from 'node:crypto';
import type {
  AkadType,
  AudienceSegment,
  CampaignBriefInput,
  CampaignVariantRecord,
  ChannelPlatform
} from '../types/domain.js';
import { AKAD_METADATA } from '../types/domain.js';
import { lintCampaignCopy } from '../linter/engine.js';

export const SUPPORTED_CHANNELS: readonly ChannelPlatform[] = [
  'instagram',
  'tiktok',
  'youtube_shorts',
  'x_threads',
  'whatsapp'
] as const;

export const SUPPORTED_SEGMENTS: readonly AudienceSegment[] = [
  'CALON_WAKIF_BARU',
  'LAPORAN_DAMPAK_WAKIF_EKSISTING'
] as const;

const CHANNEL_FORMAT_LABELS: Record<ChannelPlatform, string> = {
  instagram: 'Instagram Reels & Carousel 4:5',
  tiktok: 'TikTok Vertical Video 9:16',
  youtube_shorts: 'YouTube Shorts Edukasi',
  x_threads: 'X / Threads Utas Data & Transparansi',
  whatsapp: 'WhatsApp Broadcast (waflare)'
};

export function slugifyCampaign(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function buildTrackingUrl(params: {
  officialLandingUrl: string;
  episodeId: string;
  channel: ChannelPlatform;
  segment: AudienceSegment;
  slug: string;
  akadType: AkadType;
}): {
  trackingUrl: string;
  utmSource: ChannelPlatform;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
} {
  const url = new URL(params.officialLandingUrl);
  const utmMedium =
    params.segment === 'CALON_WAKIF_BARU'
      ? 'akuisisi_wakif_baru'
      : 'retensi_laporan_dampak';
  const segmentShort =
    params.segment === 'CALON_WAKIF_BARU' ? 'baru' : 'eksisting';
  const utmContent = `${params.channel}_${segmentShort}`;

  url.searchParams.set('ef_ep', params.episodeId);
  url.searchParams.set('utm_source', params.channel);
  url.searchParams.set('utm_medium', utmMedium);
  url.searchParams.set('utm_campaign', params.slug);
  url.searchParams.set('utm_content', utmContent);
  url.searchParams.set('akad', params.akadType);

  return {
    trackingUrl: url.toString(),
    utmSource: params.channel,
    utmMedium,
    utmCampaign: params.slug,
    utmContent
  };
}

function formatLegalDisclosure(brief: CampaignBriefInput): string {
  const meta = AKAD_METADATA[brief.akadType];
  if (meta.accountingStandard === 'PSAK_412') {
    const parts: string[] = [`Nazhir: ${brief.nazhirName}`];
    if (brief.stbpnNumber?.trim()) {
      parts.push(`Terdaftar BWI (STBPN No. ${brief.stbpnNumber.trim()})`);
    }
    if (brief.lksPwuName?.trim()) {
      parts.push(`LKS-PWU Mitra: ${brief.lksPwuName.trim()}`);
    }
    return parts.join(' | ');
  }

  const parts: string[] = [`Pengelola: ${brief.nazhirName}`];
  if (brief.lazPermitNumber?.trim()) {
    parts.push(`Izin Resmi: ${brief.lazPermitNumber.trim()}`);
  }
  return parts.join(' | ');
}

function buildCopyBody(
  brief: CampaignBriefInput,
  channel: ChannelPlatform,
  segment: AudienceSegment,
  trackingUrl: string
): { headline: string; copyText: string; ctaLabel: string } {
  const meta = AKAD_METADATA[brief.akadType];
  const disclosure = formatLegalDisclosure(brief);
  const sroiLine =
    typeof brief.honestSroiMultiple === 'number'
      ? `SROI terdiskon (Deadweight-Adjusted): ${brief.honestSroiMultiple.toFixed(2)}x.`
      : 'Dampak diaudit berkala dengan metode Deadweight-Discounted SROI.';

  const akadExplanation =
    meta.accountingStandard === 'PSAK_412'
      ? `Akad ${meta.label} (${meta.accountingStandard}): pokok wakaf dijaga utuh (Hifz al-Ashl) dan imbal hasil bersih disalurkan untuk ${brief.beneficiarySummary} (hak imbal jasa Nazhir maksimal 10% dari hasil bersih sesuai UU 41/2004).`
      : `Akad ${meta.label} (${meta.accountingStandard}): penyaluran terpisah dan teraudit untuk ${brief.beneficiarySummary} sesuai batas hak amil syariah.`;

  const impactBody =
    brief.impactReportSummary?.trim() ||
    `Realisasi penyaluran manfaat program ${brief.programTheme} bagi ${brief.beneficiarySummary} terus berjalan produktif dan terukur.`;

  if (segment === 'CALON_WAKIF_BARU') {
    const ctaLabel =
      meta.accountingStandard === 'PSAK_412'
        ? 'Tunaikan Wakaf Produktif via LKS-PWU'
        : 'Salurkan Dana ZIS Terverifikasi';

    const headlines: Record<ChannelPlatform, string> = {
      instagram: `${brief.title}: Bangun Aset Jariyah Terukur`,
      tiktok: `Mengapa ${brief.programTheme} Mengalirkan Manfaat Berkelanjutan`,
      youtube_shorts: `Transparansi ${meta.label}: Dari Akad Hingga Dampak Nyata`,
      x_threads: `[Utas Transparansi] Arsitektur ${brief.title} (${meta.accountingStandard})`,
      whatsapp: `Undangan Kebaikan Produktif — ${brief.title}`
    };

    const hooks: Record<ChannelPlatform, string> = {
      instagram: `Tahukah Anda? ${brief.programTheme} memberdayakan ${brief.beneficiarySummary} secara bermartabat tanpa mengurangi pokok aset abadi.`,
      tiktok: `Bukan sekadar bantuan sesaat—${brief.programTheme} dirancang agar ${brief.beneficiarySummary} tumbuh mandiri dengan tata kelola syariah.`,
      youtube_shorts: `Begini alur akuntansi ${meta.accountingStandard} pada program ${brief.title} agar amanah donatur terjaga penuh.`,
      x_threads: `1/ Transparansi filantropi dimulai dari pemisahan akad yang ketat. ${brief.title} memakai skema ${meta.label} (${meta.blendedLayer}).`,
      whatsapp: `Assalamu'alaikum Bapak/Ibu, kami mengundang Anda mengambil bagian dalam ${brief.title} untuk pemberdayaan ${brief.beneficiarySummary}.`
    };

    const copyText = [
      hooks[channel],
      akadExplanation,
      `Legalitas & Kanal Resmi: ${disclosure}.`,
      `Salurkan melalui tautan terverifikasi: ${trackingUrl}`
    ].join('\n\n');

    return { headline: headlines[channel], copyText, ctaLabel };
  }

  const ctaLabel = 'Lihat Laporan Dampak & Lanjutkan Kebaikan';
  const impactHeadlines: Record<ChannelPlatform, string> = {
    instagram: `Laporan Dampak Wakif: Perkembangan ${brief.title}`,
    tiktok: `Update Lapangan: Progres ${brief.programTheme} dari Amanah Anda`,
    youtube_shorts: `Laporan Berkala ${meta.accountingStandard}: ${brief.title}`,
    x_threads: `[Laporan Dampak] Hasil Pengelolaan & SROI ${brief.title}`,
    whatsapp: `Laporan Dampak Amanah Anda — ${brief.title}`
  };

  const copyText = [
    `Jazakumullahu khairan atas amanah Bapak/Ibu pada program ${brief.title}.`,
    `${impactBody} ${sroiLine}`,
    akadExplanation,
    `Tata Kelola Resmi: ${disclosure}.`,
    `Baca rincian laporan & teruskan dukungan dampak di: ${trackingUrl}`
  ].join('\n\n');

  return { headline: impactHeadlines[channel], copyText, ctaLabel };
}

export function packageCampaignBrief(
  campaignId: string,
  brief: CampaignBriefInput
): CampaignVariantRecord[] {
  const slug = brief.slug?.trim()
    ? slugifyCampaign(brief.slug)
    : slugifyCampaign(brief.title);
  const now = new Date().toISOString();
  const variants: CampaignVariantRecord[] = [];

  for (const channel of SUPPORTED_CHANNELS) {
    for (const segment of SUPPORTED_SEGMENTS) {
      const tracking = buildTrackingUrl({
        officialLandingUrl: brief.officialLandingUrl,
        episodeId: brief.episodeId,
        channel,
        segment,
        slug,
        akadType: brief.akadType
      });

      const content = buildCopyBody(brief, channel, segment, tracking.trackingUrl);
      const lint = lintCampaignCopy({
        text: content.copyText,
        akadType: brief.akadType,
        channel,
        segment
      });

      variants.push({
        id: randomUUID(),
        campaignId,
        channel,
        segment,
        formatLabel: CHANNEL_FORMAT_LABELS[channel],
        headline: content.headline,
        copyText: content.copyText,
        ctaLabel: content.ctaLabel,
        trackingUrl: tracking.trackingUrl,
        utmSource: tracking.utmSource,
        utmMedium: tracking.utmMedium,
        utmCampaign: tracking.utmCampaign,
        utmContent: tracking.utmContent,
        lintPassed: lint.passed,
        blockerCount: lint.blockerCount,
        warningCount: lint.warningCount,
        findings: lint.findings,
        scrubbedCopy: lint.scrubbedCopy,
        updatedAt: now
      });
    }
  }

  return variants;
}
