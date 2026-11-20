import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import {
  approveCampaign,
  createCampaign,
  GovernanceGateError,
  markCampaignPublished,
  updateVariantCopy
} from '../src/campaigns/service.js';
import { openDatabase } from '../src/db/database.js';

describe('Multi-Channel Campaign Packager & Physical Governance Gate', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = openDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('packages 1 brief into 10 compliant variants (5 platforms x 2 segments) with ef_ep and utm_* params', () => {
    const campaign = createCampaign(db, {
      title: 'Wakaf Produktif Sumur Bor Pesantren Tasikmalaya',
      episodeId: 'EP-TEST-01',
      programTheme: 'Air Bersih & Pertanian Hortikultura Pesantren',
      akadType: 'wakaf_melalui_uang',
      nazhirName: 'Yayasan Amal Produktif Indonesia',
      stbpnNumber: '3.3.00386',
      lksPwuName: 'Bank Syariah Indonesia (BSI)',
      officialLandingUrl: 'https://wakaf.amalproduktif.or.id/sumur-tasik',
      beneficiarySummary: '450 santri & petani sekitar pesantren',
      honestSroiMultiple: 3.15
    });

    expect(campaign.variants).toHaveLength(10);
    expect(campaign.status).toBe('PENDING_DPS_REVIEW');
    expect(campaign.accountingStandard).toBe('PSAK_412');
    expect(campaign.blendedLayer).toBe('LAYER_2_WAQF_HIFZ_AL_ASHL');

    const channels = new Set(campaign.variants.map((v) => v.channel));
    const segments = new Set(campaign.variants.map((v) => v.segment));
    expect(channels.size).toBe(5);
    expect(segments.size).toBe(2);

    for (const v of campaign.variants) {
      expect(v.lintPassed).toBe(true);
      expect(v.blockerCount).toBe(0);
      const url = new URL(v.trackingUrl);
      expect(url.searchParams.get('ef_ep')).toBe('EP-TEST-01');
      expect(url.searchParams.get('utm_source')).toBe(v.channel);
      expect(url.searchParams.get('akad')).toBe('wakaf_melalui_uang');
    }
  });

  it('blocks publication & DPS approval when a variant has a BLOCKER or human sign-off is incomplete', () => {
    const campaign = createCampaign(db, {
      title: 'Wakaf Uang Abadi Tanpa STBPN',
      episodeId: 'EP-TEST-BLOCK',
      programTheme: 'Uji Linter STBPN Hilang',
      akadType: 'wakaf_uang_abadi',
      nazhirName: 'Yayasan Uji',
      officialLandingUrl: 'https://wakaf.example.or.id/uji',
      beneficiarySummary: '100 petani binaan'
    });

    // Missing STBPN + LKS-PWU must block at creation time
    expect(campaign.status).toBe('LINT_BLOCKED');

    expect(() =>
      approveCampaign(db, campaign.id, {
        reviewerName: 'Ust. Ahmad',
        reviewerRole: 'DPS',
        approved: true,
        laYuftiAcknowledged: true
      })
    ).toThrowError(GovernanceGateError);

    expect(() => markCampaignPublished(db, campaign.id)).toThrowError(
      GovernanceGateError
    );
  });

  it('requires La Yufti acknowledgement, persists SHA-256 digest on approval, and invalidates approval on post-approval copy edit', () => {
    const campaign = createCampaign(db, {
      title: 'CWLS Ritel Klinik Mata Dhuafa',
      episodeId: 'EP-TEST-CWLS',
      programTheme: 'Cash Waqf Linked Sukuk Kesehatan',
      akadType: 'cwls_ritel',
      nazhirName: 'Yayasan Amal Produktif Indonesia',
      stbpnNumber: '3.3.00386',
      lksPwuName: 'Bank Syariah Indonesia (BSI)',
      officialLandingUrl: 'https://wakaf.amalproduktif.or.id/cwls',
      beneficiarySummary: '200 pasien lansia dhuafa'
    });

    expect(() =>
      approveCampaign(db, campaign.id, {
        reviewerName: 'Ust. Dr. Fauzan',
        reviewerRole: 'DPS',
        approved: true,
        laYuftiAcknowledged: false
      })
    ).toThrowError(/La Yufti/);

    const approved = approveCampaign(db, campaign.id, {
      reviewerName: 'Ust. Dr. Fauzan',
      reviewerRole: 'DPS',
      reviewerCredential: 'DPS BWI',
      approved: true,
      laYuftiAcknowledged: true,
      notes: 'Lolos verifikasi syariah.'
    });

    expect(approved.status).toBe('APPROVED_FOR_PUBLISH');
    expect(approved.reviews).toHaveLength(1);
    expect(approved.reviews[0]?.contentDigestSha256).toMatch(/^[a-f0-9]{64}$/);

    // Any copy edit after approval must force re-review
    const variant = approved.variants[0]!;
    const edited = updateVariantCopy(db, approved.id, variant.id, {
      copyText:
        'Salurkan CWLS Ritel bersama Nazhir resmi STBPN No. 3.3.00386 dan LKS-PWU BSI. Dijamin cuan 20% untuk wakif!'
    });
    expect(edited.status).toBe('LINT_BLOCKED');

    // Fix the copy back to compliant text -> moves to PENDING_DPS_REVIEW, then approve & publish
    const fixed = updateVariantCopy(db, approved.id, variant.id, {
      copyText:
        'Salurkan CWLS Ritel melalui LKS-PWU BSI bersama Nazhir terdaftar BWI (STBPN No. 3.3.00386) untuk manfaat pasien dhuafa.'
    });
    expect(fixed.status).toBe('PENDING_DPS_REVIEW');

    const reApproved = approveCampaign(db, fixed.id, {
      reviewerName: 'Ust. Dr. Fauzan',
      reviewerRole: 'DPS',
      approved: true,
      laYuftiAcknowledged: true
    });
    const published = markCampaignPublished(db, reApproved.id);
    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).toBeTruthy();
  });
});
