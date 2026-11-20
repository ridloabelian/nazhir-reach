import type { LaYuftiNotice } from '../types/domain.js';

export const LA_YUFTI_NOTICE: LaYuftiNotice = {
  principle: 'LA_YUFTI',
  aiIsMufti: false,
  requiresHumanDpsSignOff: true,
  disclaimer:
    'Pra-penapisan deterministik berbasis regulasi & fatwa eksplisit (Prinsip La Yufti / ZK-023). Sistem ini BUKAN Mufti dan tidak mengeluarkan fatwa; pengesahan akhir wajib ditinjau oleh Dewan Pengawas Syariah (DPS) atau Pimpinan Nazhir/LAZ.'
};

export interface RuleCitation {
  title: string;
  regulationRef: string;
}

export const RULE_CITATIONS = {
  'SHARIA-001': {
    title: 'Larangan Janji Imbal Hasil Pribadi Wakif & Pelanggaran Hifz al-Ashl',
    regulationRef:
      'UU No. 41/2004 Pasal 40 & 42, Fatwa DSN-MUI Wakaf Uang (2002), Prinsip Hifz al-Ashl (ZK-026)'
  },
  'SHARIA-002': {
    title: 'Pencampuran Akad (Wakaf vs ZIS) atau Pelanggaran Batas Imbal Jasa / Hak Amil',
    regulationRef:
      'UU No. 41/2004 Pasal 12 (Imbal Jasa Nazhir maks. 10% hasil bersih), UU No. 23/2011, PSAK 412 vs PSAK 109 (Hak Amil Zakat maks. 12,5%)'
  },
  'SHARIA-003': {
    title: 'Kelengkapan Identitas Hukum Lembaga (STBPN BWI, LKS-PWU, atau SK Izin LAZ)',
    regulationRef:
      'UU No. 41/2004, PP No. 42/2006, Peraturan BWI Wakaf Uang (STBPN & LKS-PWU), UU No. 23/2011 Pasal 18 (SK LAZ)'
  },
  'SHARIA-004': {
    title: 'Framing Eksploitatif atau Pemaksaan Spiritual terhadap Mauquf Alaih / Mustahik',
    regulationRef:
      'Maqasid al-Shariah (Hifz al-Irdh / Karamah Insaniyah), Kode Etik Filantropi & SKKNI LSP BWI'
  },
  'PDP-001': {
    title: 'Kebocoran Data Pribadi (NIK/KK, Rekening Pribadi, atau No. HP Mustahik)',
    regulationRef:
      'UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) Pasal 4 & Pasal 65'
  }
} as const satisfies Record<string, RuleCitation>;
