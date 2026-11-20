import type {
  AkadType,
  LinterFinding,
  LintInput,
  LintResult
} from '../types/domain.js';
import { LA_YUFTI_NOTICE, RULE_CITATIONS } from './rules.js';

const WAKAF_AKADS = new Set<AkadType>([
  'wakaf_uang_abadi',
  'wakaf_melalui_uang',
  'cwls_ritel',
  'hasil_kelolaan_wakaf'
]);

const ZIS_AKADS = new Set<AkadType>([
  'zakat_maal',
  'infak_terikat',
  'dana_sosial_dampak'
]);

function trimExcerpt(text: string, maxLen = 96): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 3)}...`;
}

function maskDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 6) return '***';
  return `${digits.slice(0, 4)}${'*'.repeat(Math.max(4, digits.length - 8))}${digits.slice(-4)}`;
}

function checkSharia001(text: string, findings: LinterFinding[]): void {
  const personalReturnPatterns: RegExp[] = [
    /(?:jaminan|dijamin|pasti|garansi|raih|nikmati|dapat)?\s*(?:cuan|untung|profit|dividen|bagi\s+hasil|imbal\s+hasil|return|bunga|cashback|passive\s+income)\s+(?:tetap|pasti|dijamin\s+)?(?:\d+(?:[.,]\d+)?\s*%[^.\n]{0,45})?(?:untuk|bagi|ke|kembali\s+ke|masuk(?:\s+ke)?\s+rekening)\s+(?:wakif|pewakaf|donatur|anda|kamu|nasabah|pribadi)/gi,
    /(?:wakaf|berwakaf|wakif)[^.\n]{0,65}(?:dijamin|pasti)\s+(?:cuan|untung|balik\s+modal|profit|dividen|bunga|cashback|return)/gi,
    /(?:wakaf\s+uang|cwls)[^.\n]{0,65}(?:bunga|return|profit|dividen|cuan)\s+(?:pribadi|untuk\s+anda|untuk\s+wakif|\d+(?:[.,]\d+)?\s*%\s+per\s+(?:bulan|tahun)\s+(?:untuk|bagi)\s+(?:wakif|anda))/gi,
    /(?:pokok\s+wakaf|dana\s+wakaf)\s+(?:bisa|dapat)\s+(?:ditarik|dicairkan|dikembalikan)\s+kapan\s+saja/gi
  ];

  for (const regex of personalReturnPatterns) {
    const match = regex.exec(text);
    if (match) {
      findings.push({
        ruleCode: 'SHARIA-001',
        severity: 'BLOCKER',
        ...RULE_CITATIONS['SHARIA-001'],
        message:
          'Draf menjanjikan keuntungan finansial pribadi, cashback, bunga, atau penarikan pokok kepada Wakif.',
        matchedExcerpt: trimExcerpt(match[0]),
        remediation:
          'Tegaskan bahwa Wakaf bersifat abadi (Tahbisul Ashl) dan imbal hasil/surplus hanya disalurkan kepada Mauquf Alaih serta pahala jariyah bagi Wakif.'
      });
      return;
    }
  }

  const hifzAlAshlPatterns: RegExp[] = [
    /(?:pokok\s+wakaf|dana\s+wakaf(?:\s+uang)?|modal\s+wakaf)\s+[^.\n]{0,85}(?:trading\s+(?:kripto|crypto|forex|margin|futures|derivatif)|spekulasi|saham\s+gorengan|habis\s+pakai|modal\s+ventura\s+tanpa\s+proteksi|berisiko\s+(?:hilang|hangus))/gi,
    /(?:trading\s+(?:kripto|crypto|forex|futures)|spekulasi\s+tinggi|judi|pinjol\s+berbunga)\s+[^.\n]{0,60}(?:pokok\s+wakaf|dana\s+wakaf)/gi
  ];

  for (const regex of hifzAlAshlPatterns) {
    const match = regex.exec(text);
    if (match) {
      findings.push({
        ruleCode: 'SHARIA-001',
        severity: 'BLOCKER',
        ...RULE_CITATIONS['SHARIA-001'],
        message:
          'Pelanggaran Hifz al-Ashl: pokok Wakaf diklaim ditempatkan pada instrumen spekulatif berisiko kehilangan pokok.',
        matchedExcerpt: trimExcerpt(match[0]),
        remediation:
          'Pisahkan risiko operasional ke Layer 1 (ZIS) atau Layer 3 (ekuitas komersial syariah), dan jaga pokok Wakaf pada instrumen terproteksi seperti CWLS/Sukuk atau aset produktif bersertifikat.'
      });
      return;
    }
  }
}

function checkSharia002(
  text: string,
  akadType: AkadType | undefined,
  findings: LinterFinding[]
): void {
  const mixingPatterns: RegExp[] = [
    /(?:satu\s+rekening|rekening\s+gabungan|digabung(?:kan)?|campur(?:kan)?|jadikan\s+satu)\s+[^.\n]{0,55}(?:zakat[^.\n]{0,30}wakaf|wakaf[^.\n]{0,30}zakat)/gi,
    /(?:zakat[^.\n]{0,30}wakaf|wakaf[^.\n]{0,30}zakat)[^.\n]{0,55}(?:satu\s+rekening|rekening\s+gabungan|digabung(?:kan)?|campur(?:kan)?|jadikan\s+satu)/gi,
    /(?:zakat\s+(?:sekaligus|merangkap|diakui\s+sebagai)\s+wakaf|wakaf\s+(?:sekaligus|merangkap|diakui\s+sebagai)\s+zakat)/gi,
    /(?:pokok\s+wakaf|dana\s+pokok\s+wakaf)\s+[^.\n]{0,55}(?:dibagikan\s+habis|disalurkan\s+habis|habis\s+terbagi\s+ke\s+(?:8\s+asnaf|mustahik|fakir))/gi,
    /\bwakaf\s+(?:untuk|disalurkan\s+sebagai\s+zakat\s+ke)\s+8\s+asnaf\b/gi
  ];

  for (const regex of mixingPatterns) {
    const match = regex.exec(text);
    if (match) {
      findings.push({
        ruleCode: 'SHARIA-002',
        severity: 'BLOCKER',
        ...RULE_CITATIONS['SHARIA-002'],
        message:
          'Terdeteksi pencampuran akad Wakaf (pokok kekal PSAK 412) dan Zakat/ZIS (dana habis tersalurkan PSAK 109) dalam satu rekening/peruntukan.',
        matchedExcerpt: trimExcerpt(match[0]),
        remediation:
          'Pisahkan kampanye, akad, rekening penampung, dan pembukuan antara Wakaf (PSAK 412) dan Zakat/Infak (PSAK 109).'
      });
      break;
    }
  }

  if (akadType && WAKAF_AKADS.has(akadType)) {
    const zakatSolicitation =
      /\b(?:salurkan\s+zakat|tunaikan\s+zakat|bayar\s+zakat|zakat\s+maal|zakat\s+profesi|zakat\s+penghasilan|bukti\s+setor\s+zakat|\bBSZ\b|wajib\s+zakat)\b/i.exec(
        text
      );
    if (zakatSolicitation) {
      findings.push({
        ruleCode: 'SHARIA-002',
        severity: 'BLOCKER',
        ...RULE_CITATIONS['SHARIA-002'],
        message: `Kampanye berakad ${akadType} (PSAK 412) tidak boleh menghimpun atau menjanjikan terminologi Zakat / BSZ (PSAK 109).`,
        matchedExcerpt: trimExcerpt(zakatSolicitation[0]),
        remediation:
          'Gunakan akad zakat_maal secara terpisah dengan SK LAZ resmi atau hapus terminologi penghimpunan Zakat dari naskah Wakaf.'
      });
    }
  } else if (akadType && ZIS_AKADS.has(akadType)) {
    const waqfClaim =
      /\b(?:wakaf\s+uang\s+abadi|pokok\s+wakaf\s+abadi|tahbisul\s+ashl|akta\s+ikrar\s+wakaf|\bAIW\b|\bAPAIW\b|sertifikat\s+wakaf\s+uang)\b/i.exec(
        text
      );
    if (waqfClaim) {
      findings.push({
        ruleCode: 'SHARIA-002',
        severity: 'BLOCKER',
        ...RULE_CITATIONS['SHARIA-002'],
        message: `Kampanye berakad ${akadType} (PSAK 109) tidak boleh mengklaim status Wakaf Abadi / AIW (PSAK 412).`,
        matchedExcerpt: trimExcerpt(waqfClaim[0]),
        remediation:
          'Pindahkan kampanye ke akad wakaf_uang_abadi / wakaf_melalui_uang dengan STBPN BWI & LKS-PWU, atau gunakan istilah dana ZIS/infak.'
      });
    }
  }

  const principalFee =
    /(?:potong(?:an)?|biaya\s+operasional|ujrah|imbal\s+jasa|fee\s+nazhir|administrasi)[^.\n]{0,45}dari\s+pokok\s+wakaf/i.exec(
      text
    );
  if (principalFee) {
    findings.push({
      ruleCode: 'SHARIA-002',
      severity: 'BLOCKER',
      ...RULE_CITATIONS['SHARIA-002'],
      message:
        'Pelanggaran UU 41/2004 Pasal 12: imbal jasa atau biaya operasional Nazhir haram dipotong dari pokok Wakaf.',
      matchedExcerpt: trimExcerpt(principalFee[0]),
      remediation:
        'Tegaskan bahwa hak imbal jasa Nazhir maksimal 10% hanya diambil dari hasil bersih pengelolaan wakaf, bukan dari pokok wakaf.'
    });
  }

  const nazhirPctPatterns: RegExp[] = [
    /(?:imbal\s+jasa|ujrah|hak|bagian|operasional|fee)\s+nazhir[^.\n]{0,35}?(\d+(?:[.,]\d+)?)\s*%/gi,
    /(\d+(?:[.,]\d+)?)\s*%\s*[^.\n]{0,25}(?:imbal\s+jasa|ujrah|hak|bagian|operasional)\s+nazhir/gi
  ];
  for (const regex of nazhirPctPatterns) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const pct = Number((m[1] ?? '0').replace(',', '.'));
      if (Number.isFinite(pct) && pct > 10) {
        findings.push({
          ruleCode: 'SHARIA-002',
          severity: 'BLOCKER',
          ...RULE_CITATIONS['SHARIA-002'],
          message: `Imbal jasa Nazhir (${pct}%) melampaui batas maksimal 10% dari hasil bersih pengelolaan wakaf (UU 41/2004 Pasal 12).`,
          matchedExcerpt: trimExcerpt(m[0]),
          remediation:
            'Turunkan alokasi imbal jasa Nazhir hingga maksimal 10% dari hasil bersih pengelolaan wakaf.'
        });
        break;
      }
    }
  }

  const amilPctPatterns: RegExp[] = [
    /(?:hak|bagian|potongan|operasional|fee)\s+amil(?:\s+zakat)?[^.\n]{0,35}?(\d+(?:[.,]\d+)?)\s*%/gi,
    /(\d+(?:[.,]\d+)?)\s*%\s*[^.\n]{0,25}(?:hak|bagian|potongan|operasional)\s+amil/gi
  ];
  for (const regex of amilPctPatterns) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const pct = Number((m[1] ?? '0').replace(',', '.'));
      if (Number.isFinite(pct) && pct > 12.5) {
        findings.push({
          ruleCode: 'SHARIA-002',
          severity: 'BLOCKER',
          ...RULE_CITATIONS['SHARIA-002'],
          message: `Bagian Amil Zakat (${pct}%) melampaui batas syariat 1/8 atau 12,5% dari penerimaan Zakat (PSAK 109).`,
          matchedExcerpt: trimExcerpt(m[0]),
          remediation:
            'Pastikan alokasi hak Amil atas dana Zakat tidak melebihi 12,5% (seperdelapan).'
        });
        break;
      }
    }
  }
}

function checkSharia003(
  text: string,
  input: LintInput,
  findings: LinterFinding[]
): void {
  const hasSolicitationCta =
    /\b(?:salurkan|tunaikan|berwakaf|wakaf\s+sekarang|bayar\s+zakat|transfer|qris|rekening|link\s+wakaf|klik\s+tautan|mulai\s+dari\s+rp)\b/i.test(
      text
    );

  // Impact updates for existing donors without solicitation CTA do not require fundraising disclosures.
  if (input.segment === 'LAPORAN_DAMPAK_WAKIF_EKSISTING' && !hasSolicitationCta) {
    return;
  }

  const hasStbpn =
    /\b(?:stbpn|tanda\s+bukti\s+pendaftaran\s+nazhir)\b/i.test(text) ||
    /\bbwi\b[^.\n]{0,30}(?:no\.?|nomor)?\s*\d+\.\d+\.\d+/i.test(text);

  const hasLksPwu =
    /\blks[\s-]*pwu\b/i.test(text) ||
    /\b(?:bsi|bank\s+syariah\s+indonesia|bank\s+muamalat|cimb\s+niaga\s+syariah|btn\s+syariah|bank\s+mega\s+syariah|bca\s+syariah|bjb\s+syariah|bank\s+danamon\s+syariah|bpd\s+[\w\s]{1,20}\s+syariah)\b/i.test(
      text
    );

  const hasLazPermit =
    /\b(?:sk\s+(?:kemenag|menag|baznas)|izin\s+(?:resmi\s+)?laz|keputusan\s+menteri\s+agama|upz\s+resmi)\b/i.test(
      text
    );

  const isCashWaqfOrCwls =
    input.akadType === 'wakaf_uang_abadi' ||
    input.akadType === 'cwls_ritel' ||
    (!input.akadType && /\b(?:wakaf\s+uang|cash\s+waqf|cwls)\b/i.test(text));

  const isWaqfThroughMoney = input.akadType === 'wakaf_melalui_uang';

  const isZakat =
    input.akadType === 'zakat_maal' ||
    (!input.akadType &&
      /\b(?:bayar\s+zakat|tunaikan\s+zakat|zakat\s+maal|zakat\s+profesi|zakat\s+penghasilan)\b/i.test(
        text
      ));

  if (isCashWaqfOrCwls) {
    if (!hasStbpn) {
      findings.push({
        ruleCode: 'SHARIA-003',
        severity: 'BLOCKER',
        ...RULE_CITATIONS['SHARIA-003'],
        message:
          'Kampanye Wakaf Uang / CWLS wajib mencantumkan nomor Tanda Bukti Pendaftaran Nazhir BWI (STBPN).',
        matchedExcerpt: 'STBPN BWI tidak ditemukan dalam naskah',
        remediation:
          'Tambahkan keterangan nomor registrasi Nazhir resmi, misal: "Nazhir Terdaftar BWI (STBPN No. 3.3.00386)".'
      });
    }
    if (!hasLksPwu) {
      findings.push({
        ruleCode: 'SHARIA-003',
        severity: 'BLOCKER',
        ...RULE_CITATIONS['SHARIA-003'],
        message:
          'Kampanye penghimpunan Wakaf Uang / CWLS wajib menyebutkan nama LKS-PWU mitra (UU No. 41/2004 Pasal 28).',
        matchedExcerpt: 'Nama LKS-PWU mitra tidak ditemukan dalam naskah',
        remediation:
          'Cantumkan nama LKS-PWU mitra resmi, misal: "Penghimpunan melalui LKS-PWU Bank Syariah Indonesia (BSI)".'
      });
    }
  } else if (isWaqfThroughMoney) {
    if (!hasStbpn) {
      findings.push({
        ruleCode: 'SHARIA-003',
        severity: 'BLOCKER',
        ...RULE_CITATIONS['SHARIA-003'],
        message:
          'Kampanye Wakaf Melalui Uang wajib mencantumkan nomor pendaftaran Nazhir BWI (STBPN).',
        matchedExcerpt: 'STBPN BWI tidak ditemukan dalam naskah',
        remediation:
          'Cantumkan identitas Nazhir resmi beserta nomor STBPN BWI di materi kampanye.'
      });
    }
    if (!hasLksPwu) {
      findings.push({
        ruleCode: 'SHARIA-003',
        severity: 'WARNING',
        ...RULE_CITATIONS['SHARIA-003'],
        message:
          'Disarankan mencantumkan bank syariah mitra / LKS-PWU penampung dana Wakaf Melalui Uang agar audit PSAK 412 transparan.',
        matchedExcerpt: 'Nama Bank Syariah / LKS-PWU belum disebut',
        remediation: 'Sebutkan rekening bank syariah resmi lembaga Nazhir atau LKS-PWU mitra.'
      });
    }
  }

  if (isZakat && !hasLazPermit) {
    findings.push({
      ruleCode: 'SHARIA-003',
      severity: 'BLOCKER',
      ...RULE_CITATIONS['SHARIA-003'],
      message:
        'Kampanye penghimpunan Zakat wajib mencantumkan dasar legalitas SK Izin LAZ (Kemenag/BAZNAS) atau status UPZ resmi.',
      matchedExcerpt: 'SK Izin LAZ / BAZNAS tidak ditemukan dalam naskah',
      remediation:
        'Tambahkan rujukan legalitas lembaga, misal: "LAZ Berizin Resmi SK Kemenag RI No. 412/2023".'
    });
  }
}

function checkSharia004(text: string, findings: LinterFinding[]): void {
  const blockerPatterns: RegExp[] = [
    /(?:mengemis\s+memelas|hidup\s+(?:mengenaskan\s+)?seperti\s+sampah|wajah\s+(?:kumuh|dekil|melas)\s+tak\s+berdaya|tonton\s+penderitaan\s+mereka|menunggu\s+mati\s+kelaparan)/gi,
    /(?:jika|kalau)\s+(?:anda|kamu)\s+(?:skip|lewati|abaikan)[^.\n]{0,45}(?:neraka|laknat|azab|rezeki\s+seret|miskin|kikir|sial)/gi,
    /(?:kalau|jika)\s+tidak\s+(?:transfer|berwakaf|sedekah)[^.\n]{0,40}(?:azab|neraka|doa\s+buruk|sial|hidup\s+susah)/gi,
    /hanya\s+orang\s+(?:pelit|kikir|tak\s+punya\s+hati)\s+yang\s+(?:scroll|abaikan|melewati)/gi
  ];

  for (const regex of blockerPatterns) {
    const match = regex.exec(text);
    if (match) {
      findings.push({
        ruleCode: 'SHARIA-004',
        severity: 'BLOCKER',
        ...RULE_CITATIONS['SHARIA-004'],
        message:
          'Narasi mengeksploitasi kemiskinan secara merendahkan martabat penerima manfaat atau memakai ancaman spiritual manipulatif.',
        matchedExcerpt: trimExcerpt(match[0]),
        remediation:
          'Gunakan framing bermartabat berbasis pemberdayaan (empowerment), kemandirian Mauquf Alaih/Mustahik, serta ajakan tulus tanpa paksaan.'
      });
      return;
    }
  }

  const warningPatterns: RegExp[] = [
    /(?:dijamin\s+bikin\s+nangis\s+darah|tega\s+banget\s+(?:kalau|jika)\s+(?:anda|kamu)\s+diam\s+saja|wajib\s+viralkan\s+sekarang\s+juga)/gi
  ];

  for (const regex of warningPatterns) {
    const match = regex.exec(text);
    if (match) {
      findings.push({
        ruleCode: 'SHARIA-004',
        severity: 'WARNING',
        ...RULE_CITATIONS['SHARIA-004'],
        message:
          'Gaya ajakan cenderung clickbait emosional berlebihan; pertimbangkan narasi edukatif yang lebih bermartabat.',
        matchedExcerpt: trimExcerpt(match[0]),
        remediation:
          'Fokuskan pesan pada data kebutuhan program, akuntabilitas penyaluran, dan potensi kemandirian penerima manfaat.'
      });
      return;
    }
  }
}

function scrubAndCheckPdp001(
  text: string,
  findings: LinterFinding[]
): { scrubbedCopy: string; piiDetected: boolean } {
  let scrubbedCopy = text;
  let piiDetected = false;

  // 1. 16-digit NIK or Nomor KK
  const nikRegex = /(?<!\d)\d{16}(?!\d)/g;
  const nikMatches = [...text.matchAll(nikRegex)];
  if (nikMatches.length > 0) {
    piiDetected = true;
    const firstMatch = nikMatches[0]?.[0] ?? '';
    findings.push({
      ruleCode: 'PDP-001',
      severity: 'BLOCKER',
      ...RULE_CITATIONS['PDP-001'],
      message: `Terdeteksi ${nikMatches.length} nomor identitas 16 digit (NIK / No. KK) yang dilarang dipublikasikan terbuka menurut UU PDP.`,
      matchedExcerpt: maskDigits(firstMatch),
      remediation:
        'Hapus seluruh NIK/No. KK dari materi publik; gunakan ID anonim atau agregasi wilayah di laporan dampak.'
    });
    scrubbedCopy = scrubbedCopy.replace(nikRegex, '[REDACTED_NIK_ATAU_KK_16]');
  }

  // 2. Beneficiary personal bank account (explicitly excludes Yayasan / LAZ / Nazhir / UPZ / Badan Wakaf / Masjid / Pesantren)
  const personalBankPatterns: RegExp[] = [
    /(?:rekening|rek\.?|no\.?\s*rek(?:ening)?)\s+pribadi(?:\s+(?:mustahik|penerima|bapak|ibu|pak|bu|sdr|sdri|anak|keluarga|warga))?(?:\s+(?:a\.?n\.?\s+)?[A-Za-z.' ]{2,40})?[\s:=-]*(?:\d[\d\s-]{6,20}\d)/gi,
    /(?:rekening|rek\.?|no\.?\s*rek(?:ening)?|transfer\s+ke)\s*(?:bri|bca|mandiri|bni|bsi|btpn|seabank|dana|ovo|gopay)?[\s:=-]*\d{8,18}\s+a\.?n\.?\s+(?!yayasan|laz|nazhir|badan\s+wakaf|upz|masjid|pesantren|amal\s+produktif|dompet|baznas|rumah\s+wakaf)(?:bapak|ibu|sdr|sdri|pak|bu|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/gi
  ];

  let bankLeakMatched = false;
  for (const regex of personalBankPatterns) {
    const matches = [...scrubbedCopy.matchAll(regex)];
    if (matches.length > 0) {
      piiDetected = true;
      bankLeakMatched = true;
      scrubbedCopy = scrubbedCopy.replace(regex, '[REDACTED_REKENING_PRIBADI]');
    }
  }
  if (bankLeakMatched) {
    findings.push({
      ruleCode: 'PDP-001',
      severity: 'BLOCKER',
      ...RULE_CITATIONS['PDP-001'],
      message:
        'Terdeteksi nomor rekening pribadi penerima manfaat/individu dalam materi publik.',
      matchedExcerpt: '[REDACTED_REKENING_PRIBADI]',
      remediation:
        'Gunakan hanya rekening resmi LKS-PWU / rekening lembaga berbadan hukum dan lindungi data rekening pribadi Mustahik/Mauquf Alaih.'
    });
  }

  // 3. Raw mobile/WhatsApp numbers unless explicitly labeled as official institutional hotline
  const phoneRegex = /(?<!\d)(?:\+62|62|0)8\d(?:[\s-]?\d){7,11}(?!\d)/g;
  const officialHotlinePrefix =
    /(?:layanan\s+(?:wakif|donatur|muzaki)|hotline\s+(?:resmi|nazhir|laz|wakaf|zakat)|call\s+center|konfirmasi\s+(?:wakaf|zakat|donasi|transfer)|admin\s+(?:resmi|nazhir|laz)|cs\s+(?:nazhir|laz)|pusat\s+bantuan)[^.\n]{0,30}$/i;

  let leakedPhoneCount = 0;
  let firstMaskedPhone = '';

  scrubbedCopy = scrubbedCopy.replace(phoneRegex, (match, offset: number, full: string) => {
    const lookbackStart = Math.max(0, offset - 75);
    const contextBefore = full.slice(lookbackStart, offset);
    if (officialHotlinePrefix.test(contextBefore)) {
      return match;
    }
    piiDetected = true;
    leakedPhoneCount += 1;
    if (!firstMaskedPhone) {
      firstMaskedPhone = maskDigits(match);
    }
    return '[REDACTED_NO_HP_PRIBADI]';
  });

  if (leakedPhoneCount > 0) {
    findings.push({
      ruleCode: 'PDP-001',
      severity: 'BLOCKER',
      ...RULE_CITATIONS['PDP-001'],
      message: `Terdeteksi ${leakedPhoneCount} nomor telepon/WhatsApp pribadi tanpa label hotline resmi lembaga.`,
      matchedExcerpt: firstMaskedPhone,
      remediation:
        'Hapus nomor pribadi penerima manfaat atau beri label eksplisit jika mencantumkan Layanan Wakif / Hotline Resmi lembaga.'
    });
  }

  return { scrubbedCopy, piiDetected };
}

export function lintCampaignCopy(input: LintInput): LintResult {
  const text = (input.text ?? '').trim();
  const findings: LinterFinding[] = [];

  if (!text) {
    findings.push({
      ruleCode: 'SHARIA-003',
      severity: 'BLOCKER',
      ...RULE_CITATIONS['SHARIA-003'],
      message: 'Teks kampanye tidak boleh kosong.',
      matchedExcerpt: '(kosong)',
      remediation: 'Masukkan naskah kampanye lengkap untuk diperiksa.'
    });
    return {
      passed: false,
      canSubmitForDpsReview: false,
      blockerCount: 1,
      warningCount: 0,
      findings,
      scrubbedCopy: '',
      piiDetected: false,
      checkedAt: new Date().toISOString(),
      laYufti: LA_YUFTI_NOTICE
    };
  }

  checkSharia001(text, findings);
  checkSharia002(text, input.akadType, findings);
  checkSharia003(text, input, findings);
  checkSharia004(text, findings);
  const { scrubbedCopy, piiDetected } = scrubAndCheckPdp001(text, findings);

  const blockerCount = findings.filter((f) => f.severity === 'BLOCKER').length;
  const warningCount = findings.filter((f) => f.severity === 'WARNING').length;

  return {
    passed: blockerCount === 0,
    canSubmitForDpsReview: blockerCount === 0,
    blockerCount,
    warningCount,
    findings,
    scrubbedCopy,
    piiDetected,
    checkedAt: new Date().toISOString(),
    laYufti: LA_YUFTI_NOTICE
  };
}
