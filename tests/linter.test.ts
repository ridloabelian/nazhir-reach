import { describe, expect, it } from 'vitest';
import { lintCampaignCopy } from '../src/linter/engine.js';

describe('Deterministic Sharia, Regulatory & UU PDP Copy Linter', () => {
  it('attaches La Yufti governance metadata on every lint response', () => {
    const res = lintCampaignCopy({
      text: 'Wakaf uang abadi dikelola LKS-PWU Bank Syariah Indonesia (BSI) oleh Nazhir terdaftar BWI STBPN No. 3.3.00386.',
      akadType: 'wakaf_uang_abadi'
    });

    expect(res.laYufti.principle).toBe('LA_YUFTI');
    expect(res.laYufti.aiIsMufti).toBe(false);
    expect(res.laYufti.requiresHumanDpsSignOff).toBe(true);
    expect(res.passed).toBe(true);
  });

  it('SHARIA-001: allows pahala jariyah & Mauquf Alaih yield, blocks personal return & speculative placement', () => {
    const clean = lintCampaignCopy({
      text: 'Tunaikan CWLS Ritel melalui LKS-PWU BSI bersama Nazhir terdaftar BWI (STBPN No. 3.3.00386). Pahala jariyah mengalir abadi dan imbal hasil kupon CWLS disalurkan sepenuhnya untuk operasi katarak Mauquf Alaih.',
      akadType: 'cwls_ritel'
    });
    expect(clean.passed).toBe(true);
    expect(clean.findings).toHaveLength(0);

    const personalReturn = lintCampaignCopy({
      text: 'Berwakaf uang sekarang, dijamin cuan 15% masuk rekening pribadi wakif dan bisa dicairkan kapan saja. STBPN 3.3.00386 LKS-PWU BSI.',
      akadType: 'wakaf_uang_abadi'
    });
    expect(personalReturn.passed).toBe(false);
    expect(personalReturn.findings.some((f) => f.ruleCode === 'SHARIA-001')).toBe(
      true
    );

    const hifzAlAshlViolation = lintCampaignCopy({
      text: 'Dana wakaf uang akan kami putar pada trading kripto dan modal ventura tanpa proteksi pokok. STBPN 3.3.00386 LKS-PWU BSI.',
      akadType: 'wakaf_uang_abadi'
    });
    expect(hifzAlAshlViolation.passed).toBe(false);
    expect(
      hifzAlAshlViolation.findings.some((f) => f.ruleCode === 'SHARIA-001')
    ).toBe(true);
  });

  it('SHARIA-002: detects akad mixing, Nazhir fee > 10%, fee from principal, and Amil > 12.5%', () => {
    const mixed = lintCampaignCopy({
      text: 'Salurkan zakat dan wakaf dalam satu rekening gabungan agar praktis! STBPN 3.3.00386 LKS-PWU BSI.',
      akadType: 'wakaf_uang_abadi'
    });
    expect(mixed.passed).toBe(false);
    expect(mixed.findings.some((f) => f.ruleCode === 'SHARIA-002')).toBe(true);

    const excessiveNazhirFee = lintCampaignCopy({
      text: 'Program hasil pengelolaan wakaf produktif dengan ujrah nazhir 15% serta potongan dari pokok wakaf. STBPN 3.3.00386 LKS-PWU BSI.',
      akadType: 'hasil_kelolaan_wakaf'
    });
    expect(excessiveNazhirFee.passed).toBe(false);
    expect(
      excessiveNazhirFee.findings.some((f) => f.ruleCode === 'SHARIA-002')
    ).toBe(true);

    const excessiveAmil = lintCampaignCopy({
      text: 'Tunaikan zakat maal bersama LAZ resmi SK Kemenag RI No. 412/2023. Hak amil zakat sebesar 20%.',
      akadType: 'zakat_maal'
    });
    expect(excessiveAmil.passed).toBe(false);
    expect(
      excessiveAmil.findings.some((f) => f.ruleCode === 'SHARIA-002')
    ).toBe(true);

    const compliantAmil = lintCampaignCopy({
      text: 'Tunaikan zakat maal melalui LAZ berizin resmi SK Kemenag RI No. 412/2023. Bagian amil zakat sesuai syariat maksimal 12,5% untuk 8 Asnaf.',
      akadType: 'zakat_maal'
    });
    expect(compliantAmil.passed).toBe(true);
  });

  it('SHARIA-003: enforces STBPN + LKS-PWU for Cash Waqf and SK LAZ for Zakat, while allowing pure impact updates', () => {
    const missingDisclosures = lintCampaignCopy({
      text: 'Mari berwakaf uang abadi mulai Rp 100.000 untuk ketahanan pangan desa.',
      akadType: 'wakaf_uang_abadi',
      segment: 'CALON_WAKIF_BARU'
    });
    expect(missingDisclosures.passed).toBe(false);
    const sharia003Count = missingDisclosures.findings.filter(
      (f) => f.ruleCode === 'SHARIA-003' && f.severity === 'BLOCKER'
    ).length;
    expect(sharia003Count).toBe(2);

    const missingLazPermit = lintCampaignCopy({
      text: 'Salurkan zakat profesi bulan ini untuk beasiswa mahasiswa dhuafa.',
      akadType: 'zakat_maal',
      segment: 'CALON_WAKIF_BARU'
    });
    expect(missingLazPermit.passed).toBe(false);
    expect(
      missingLazPermit.findings.some((f) => f.ruleCode === 'SHARIA-003')
    ).toBe(true);

    const pureImpactUpdate = lintCampaignCopy({
      text: 'Alhamdulillah laporan dampak triwulan I: sumur bor Garut kini mengairi 42 hektare kebun petani.',
      akadType: 'wakaf_uang_abadi',
      segment: 'LAPORAN_DAMPAK_WAKIF_EKSISTING'
    });
    expect(pureImpactUpdate.passed).toBe(true);
  });

  it('SHARIA-004: blocks degrading poverty framing and spiritual coercion, warns on clickbait', () => {
    const coercive = lintCampaignCopy({
      text: 'Tonton penderitaan mereka yang wajah kumuh melas tak berdaya. Jika anda skip pesan ini rezeki seret dan masuk neraka! STBPN 3.3.00386 LKS-PWU BSI.',
      akadType: 'wakaf_uang_abadi'
    });
    expect(coercive.passed).toBe(false);
    expect(
      coercive.findings.some(
        (f) => f.ruleCode === 'SHARIA-004' && f.severity === 'BLOCKER'
      )
    ).toBe(true);

    const dignified = lintCampaignCopy({
      text: 'Dukung kemandirian 120 keluarga petani kopi Garut melalui Wakaf Produktif bersama Nazhir terdaftar BWI STBPN 3.3.00386 dan LKS-PWU BSI.',
      akadType: 'wakaf_uang_abadi'
    });
    expect(dignified.passed).toBe(true);
  });

  it('PDP-001: scrubs NIK/KK 16 digit, personal bank accounts, and raw beneficiary phones without blocking official hotlines/accounts', () => {
    const piiLeak = lintCampaignCopy({
      text: 'Bantu Pak Ahmad NIK 3273011205900001 transfer ke rekening pribadi Bapak Ahmad 1234567890 atau WA pribadi 081234567890. STBPN 3.3.00386 LKS-PWU BSI.',
      akadType: 'wakaf_melalui_uang'
    });
    expect(piiLeak.passed).toBe(false);
    expect(piiLeak.piiDetected).toBe(true);
    expect(piiLeak.findings.filter((f) => f.ruleCode === 'PDP-001')).toHaveLength(
      3
    );
    expect(piiLeak.scrubbedCopy).toContain('[REDACTED_NIK_ATAU_KK_16]');
    expect(piiLeak.scrubbedCopy).toContain('[REDACTED_REKENING_PRIBADI]');
    expect(piiLeak.scrubbedCopy).toContain('[REDACTED_NO_HP_PRIBADI]');
    expect(piiLeak.scrubbedCopy).not.toContain('3273011205900001');
    expect(piiLeak.scrubbedCopy).not.toContain('081234567890');

    const officialChannel = lintCampaignCopy({
      text: 'Salurkan Wakaf Uang melalui Rekening LKS-PWU BSI 7188990011 a.n. Yayasan Amal Produktif Indonesia (STBPN No. 3.3.00386). Layanan Wakif Resmi: 081122334455.',
      akadType: 'wakaf_uang_abadi'
    });
    expect(officialChannel.passed).toBe(true);
    expect(officialChannel.piiDetected).toBe(false);
  });
});
