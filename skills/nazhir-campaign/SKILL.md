---
name: nazhir-campaign
description: >-
  Workflow wajib bagi AI Agent tim media Nazhir Wakaf dan Lembaga Amil Zakat
  (LAZ) Indonesia saat menyusun, memvalidasi, menjadwalkan, dan melacak atribusi
  kampanye berbasis nazhir-reach (Prinsip La Yufti, PSAK 412/109, UU PDP, dan
  Honest SROI).
---

# Skill: Nazhir & LAZ Sharia-Compliant Campaign Workflow (`nazhir-reach`)

## Prinsip Utama (Wajib Dipatuhi Agent)

1. **`La Yufti` (`ZK-023`)**: Anda **BUKAN Mufti** dan dilarang mengeluarkan fatwa atau menyatakan hukum syariah final. Tugas Anda adalah menyusun draf bermartabat, menjalankan **Deterministic Sharia & UU PDP Copy Linter**, dan menyiapkan paket review bagi manusia berwenang (**DPS / Pimpinan Nazhir / CWC / Pimpinan LAZ**).
2. **Pemisahan Akad & 3-Layer Blended Finance (`ZK-026`)**:
   - **Layer 2 (`PSAK 412` — Wakaf)**: `wakaf_uang_abadi`, `wakaf_melalui_uang`, `cwls_ritel`, `hasil_kelolaan_wakaf`. Pokok abadi (*Hifz al-Ashl*) tidak boleh dijanjikan sebagai return pribadi Wakif, tidak boleh dipotong biaya operasional dari pokok, dan maksimal imbal jasa Nazhir adalah **10% dari hasil bersih** (UU 41/2004 Pasal 12).
   - **Layer 1 (`PSAK 109` — ZIS)**: `zakat_maal`, `infak_terikat`, `dana_sosial_dampak`. Hak Amil Zakat maksimal **12,5% (1/8)** dan hanya untuk 8 Asnaf.
   - **Dilarang keras** menggabungkan penghimpunan Wakaf dan Zakat dalam satu naskah atau satu rekening.
3. **Pelindungan Data Pribadi (`UU No. 27/2022 PDP`)**:
   - Jangan pernah menampilkan NIK/No. KK 16 digit, nomor rekening pribadi Mustahik/Mauquf 'Alaih, atau nomor WhatsApp pribadi penerima manfaat di materi publik.
4. **Kejujuran Dampak (`Honest SROI / ZK-027`)**:
   - Setiap klaim angka SROI pada laporan dampak Wakif harus berasal dari kalkulator `/api/sroi/calculate` yang sudah mengurangi *Deadweight*, *Displacement*, *Attribution*, *Drop-Off*, dan *Discount Rate*.

---

## Alur Kerja Standar Agent (Step-by-Step)

### Langkah 1: Tentukan Akad & Identitas Hukum Lembaga
Pastikan metadata berikut lengkap sebelum menulis naskah:
- Untuk **Wakaf Uang / CWLS / Wakaf Melalui Uang**:
  - Nama Nazhir berbadan hukum
  - Nomor **STBPN BWI** (contoh: `3.3.00386`)
  - Nama **LKS-PWU mitra** (contoh: `Bank Syariah Indonesia (BSI)`, `Bank Muamalat`)
- Untuk **Zakat Maal / Profesi**:
  - Nama LAZ/UPZ
  - Nomor **SK Kemenag / Izin LAZ / SK BAZNAS**

### Langkah 2: Paketkan Brief Lintas Kanal (5 Platform × 2 Segmen)
Kirim brief ke `POST http://localhost:8793/api/campaigns` agar otomatis menghasilkan 10 varian untuk:
- Kanal: `instagram`, `tiktok`, `youtube_shorts`, `x_threads`, `whatsapp`
- Segmen:
  1. `CALON_WAKIF_BARU` (edukasi & akuisisi dengan tautan `ef_ep` & `utm_*`)
  2. `LAPORAN_DAMPAK_WAKIF_EKSISTING` (laporan hasil pengelolaan & *Honest SROI* untuk menjaga *Repeat Wakif Rate 30/90 hari*)

### Langkah 3: Jalankan Deterministic Linter Sebelum Mengajukan Review
Uji setiap naskah melalui CLI atau REST API sebelum menawarkannya ke pengurus:

```bash
# Via CLI
npm run lint:copy -- --akad wakaf_uang_abadi --text "Salurkan Wakaf Uang Abadi melalui LKS-PWU BSI oleh Nazhir STBPN No. 3.3.00386..."

# Atau via HTTP API
curl -sS -X POST http://localhost:8793/api/linter/check \
  -H "Content-Type: application/json" \
  -d '{"text":"...","akadType":"wakaf_uang_abadi","segment":"CALON_WAKIF_BARU"}'
```

**Stop Rule**: Jika `blockerCount > 0` atau `passed === false`, **perbaiki seluruh pelanggaran terlebih dahulu** (`SHARIA-001` s/d `SHARIA-004`, `PDP-001`). Jangan pernah meminta approval saat linter memblokir draf.

### Langkah 4: Human Governance Gate (`DPS / Pimpinan Sign-Off`)
Kampanye hanya boleh terbit setelah manusia berwenang menyetujui lewat `POST /api/campaigns/:id/approve` dengan:
- `reviewerName`
- `reviewerRole`: `DPS` | `PIMPINAN_NAZHIR` | `CWC_OFFICER` | `PIMPINAN_LAZ`
- `laYuftiAcknowledged: true`
- `approved: true`

### Langkah 5: Lacak Atribusi, Cohort & Sinkronkan ke Odoo ERP
- Pastikan tautan publikasi selalu mempertahankan parameter `ef_ep` dan `utm_source` agar transaksi masuk (`QRIS_DINAMIS`, `LKS_PWU_TRANSFER`, `WAFLARE_WEBHOOK`) tercatat pada konten asal.
- Ekspor jurnal harian ke **`waqf-odoo-modules` (PSAK 412)** dan **`zakat-odoo-modules` (PSAK 109)** melalui `/api/export/odoo/json` atau `/api/export/odoo/csv?standard=psak412|psak109` dengan rekonsiliasi varians `Rp 0`.
