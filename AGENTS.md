# AGENTS.md — Panduan Kontributor & AI Agent `nazhir-reach`

## 1. Misi & Filosofi Arsitektur
`nazhir-reach` adalah suite open-source untuk distribusi kampanye patuh syariah, flywheel retensi Wakif, dan atribusi dampak akuntansi **PSAK 412 (Wakaf)** / **PSAK 109 (ZIS)** bagi Nazhir Wakaf dan Lembaga Amil Zakat (LAZ) di Indonesia.

Seluruh perubahan kode maupun integrasi agent harus menjaga empat prinsip inti:
1. **`La Yufti` (`ZK-023`)**: AI/kode tidak pernah mengeluarkan fatwa. Linter syariah (`src/linter/`) bersifat 100% deterministik dan hanyalah pra-penapisan; pengesahan final berada di tangan manusia (`DPS` / `Pimpinan Nazhir` / `CWC` / `Pimpinan LAZ`).
2. **Pemisahan Akad & 3-Layer Islamic Blended Finance (`ZK-026`)**: Jangan pernah mencampur saldo atau akuntansi Wakaf (`PSAK 412`) dengan ZIS (`PSAK 109`), dan jaga *Hifz al-Ashl* (0% potongan biaya operasional dari pokok wakaf abadi).
3. **Honest SROI (`ZK-027`)**: Kalkulator dampak (`src/sroi/`) wajib memotong *deadweight*, *displacement*, *attribution*, *drop-off*, dan nilai waktu uang.
4. **Zero PII Leak (`UU No. 27/2022 PDP`)**: Data identitas pribadi (NIK 16 digit, rekening pribadi, nomor HP pribadi penerima manfaat) harus disaring dan di-*scrub*.

## 2. Konvensi Teknis & Runtime
- **Runtime**: Node.js >= 22.5, TypeScript strict (`"module": "NodeNext"`, import relatif wajib menyertakan ekstensi `.js`).
- **Database**: `node:sqlite` (`DatabaseSync`). Selalu konversi boolean (`1 | 0`) dan `undefined` (`null`) lewat `toSqlValue()` sebelum bind parameter SQLite.
- **Port Default**: `:8793` (jangan mengubah port default tanpa alasan eksplisit).
- **Command Verifikasi**:
  ```bash
  npm run typecheck
  npm test
  npm run build
  npm run demo
  ```

## 3. Struktur Modul Penting
- `src/linter/` — Mesin aturan deterministik `SHARIA-001`..`SHARIA-004` & `PDP-001`
- `src/campaigns/` — Multi-channel packager (5 platform × 2 segmen) & Physical Governance Gate
- `src/sroi/` — Kalkulator *Deadweight-Discounted SROI*
- `src/attribution/` — Atribusi `ef_ep` / `utm_*`, *Repeat Wakif 30d/90d*, kohort `D+1/D+3/D+7`, dan rasio biaya distribusi
- `src/odoo/` — Eksportir JSON & RFC 4180 CSV untuk `waqf-odoo-modules` (PSAK 412) dan `zakat-odoo-modules` (PSAK 109)
- `src/notifications/` — Kartu ringkasan pengurus via WhatsApp (`waflare`) & Telegram
- `skills/nazhir-campaign/SKILL.md` — Instruksi agent tim media Nazhir/LAZ
