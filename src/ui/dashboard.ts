export function renderDashboardHtml(port: number | string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>nazhir-reach — Sharia Campaign, Wakif Flywheel & PSAK 412/109 Attribution</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg-deep: #08101F;
      --bg-surface: #0C172E;
      --bg-elevated: #11203D;
      --border: #1D3158;
      --gold: #C19F65;
      --gold-soft: rgba(193, 159, 101, 0.14);
      --emerald: #298D6B;
      --emerald-soft: rgba(41, 141, 107, 0.16);
      --crimson: #E05263;
      --crimson-soft: rgba(224, 82, 99, 0.16);
      --amber: #D99B26;
      --amber-soft: rgba(217, 155, 38, 0.16);
      --text-main: #F1F5F9;
      --text-muted: #94A3B8;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', ui-monospace, monospace;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: radial-gradient(circle at top right, #10203F 0%, var(--bg-deep) 55%);
      color: var(--text-main);
      font-family: var(--font-sans);
      min-height: 100vh;
      line-height: 1.5;
    }
    .mono { font-family: var(--font-mono); }
    header {
      border-bottom: 1px solid var(--border);
      background: rgba(8, 16, 31, 0.88);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 30;
    }
    .container {
      max-width: 1320px;
      margin: 0 auto;
      padding: 0 24px;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 0;
      gap: 16px;
      flex-wrap: wrap;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-mark {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--gold) 0%, #8A6D3B 100%);
      color: #08101F;
      font-weight: 700;
      display: grid;
      place-items: center;
      font-size: 18px;
      letter-spacing: -0.02em;
    }
    .brand h1 {
      margin: 0;
      font-size: 19px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand p {
      margin: 2px 0 0;
      font-size: 12px;
      color: var(--text-muted);
    }
    .badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid var(--border);
      background: var(--bg-surface);
      color: var(--text-main);
    }
    .badge-gold { border-color: rgba(193,159,101,0.45); background: var(--gold-soft); color: #E8CF9F; }
    .badge-emerald { border-color: rgba(41,141,107,0.45); background: var(--emerald-soft); color: #6EE7B7; }
    .badge-crimson { border-color: rgba(224,82,99,0.45); background: var(--crimson-soft); color: #FDA4AF; }
    .badge-amber { border-color: rgba(217,155,38,0.45); background: var(--amber-soft); color: #FCD34D; }

    nav.tabs {
      display: flex;
      gap: 6px;
      padding-bottom: 12px;
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      color: var(--text-muted);
      border: 1px solid transparent;
      padding: 9px 15px;
      border-radius: 8px;
      font-family: var(--font-sans);
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .tab-btn:hover { color: var(--text-main); background: var(--bg-surface); }
    .tab-btn.active {
      background: var(--gold-soft);
      color: var(--gold);
      border-color: rgba(193,159,101,0.45);
    }

    main { padding: 24px 0 64px; }
    .panel { display: none; }
    .panel.active { display: block; }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 16px;
      margin-bottom: 22px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
      gap: 20px;
      margin-bottom: 22px;
    }
    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .card-title {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #F8FAFC;
    }
    .card-sub {
      margin: 4px 0 0;
      font-size: 12px;
      color: var(--text-muted);
    }
    .kpi-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      font-weight: 600;
    }
    .kpi-value {
      font-size: 24px;
      font-weight: 700;
      margin: 6px 0 4px;
      font-family: var(--font-mono);
      color: #FFFFFF;
    }
    .kpi-foot {
      font-size: 12px;
      color: var(--text-muted);
    }

    label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #CBD5E1;
      margin-bottom: 6px;
    }
    input, select, textarea {
      width: 100%;
      background: var(--bg-deep);
      border: 1px solid var(--border);
      color: var(--text-main);
      border-radius: 8px;
      padding: 10px 12px;
      font-family: var(--font-sans);
      font-size: 13px;
      outline: none;
    }
    textarea { font-family: var(--font-sans); min-height: 125px; resize: vertical; }
    input:focus, select:focus, textarea:focus { border-color: var(--gold); }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 8px;
      padding: 9px 15px;
      font-size: 13px;
      font-weight: 600;
      font-family: var(--font-sans);
      cursor: pointer;
      border: 1px solid var(--border);
      background: var(--bg-elevated);
      color: var(--text-main);
      text-decoration: none;
    }
    .btn:hover { border-color: var(--gold); }
    .btn-primary {
      background: var(--gold);
      color: #08101F;
      border-color: var(--gold);
    }
    .btn-primary:hover { filter: brightness(1.06); }
    .btn-emerald {
      background: var(--emerald);
      color: #FFFFFF;
      border-color: var(--emerald);
    }
    .btn-sm { padding: 6px 10px; font-size: 12px; }

    .row-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 10px;
    }
    .field-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 600;
    }
    .table-wrap { overflow-x: auto; }

    .finding {
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 10px;
      border: 1px solid var(--border);
      background: var(--bg-deep);
    }
    .finding.BLOCKER { border-left: 4px solid var(--crimson); }
    .finding.WARNING { border-left: 4px solid var(--amber); }
    pre.codebox {
      background: var(--bg-deep);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      font-family: var(--font-mono);
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      margin: 8px 0 0;
      color: #CBD5E1;
    }
    .la-yufti-banner {
      background: rgba(193,159,101,0.08);
      border: 1px solid rgba(193,159,101,0.32);
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 20px;
      font-size: 12.5px;
      color: #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .variant-item {
      background: var(--bg-deep);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 12px;
    }
    .status-pill {
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      font-family: var(--font-mono);
    }
    .status-PUBLISHED, .status-APPROVED_FOR_PUBLISH { background: var(--emerald-soft); color: #6EE7B7; }
    .status-PENDING_DPS_REVIEW { background: var(--amber-soft); color: #FCD34D; }
    .status-LINT_BLOCKED, .status-REJECTED { background: var(--crimson-soft); color: #FDA4AF; }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <div class="topbar">
        <div class="brand">
          <div class="brand-mark">NR</div>
          <div>
            <h1>nazhir-reach</h1>
            <p>Sharia-Compliant Campaign Distribution, Wakif Flywheel &amp; PSAK 412/109 Attribution Suite</p>
          </div>
        </div>
        <div class="badges">
          <span class="badge badge-gold">La Yufti Pre-Screening (ZK-023)</span>
          <span class="badge badge-emerald">PSAK 412 / PSAK 109 Segregated</span>
          <span class="badge mono">PORT :${port}</span>
        </div>
      </div>
      <nav class="tabs" role="tablist">
        <button class="tab-btn active" data-tab="flywheel">Wakif Flywheel &amp; PSAK 412/109</button>
        <button class="tab-btn" data-tab="linter">Sharia &amp; UU PDP Copy Linter</button>
        <button class="tab-btn" data-tab="campaigns">Campaign Packager &amp; DPS Gate</button>
        <button class="tab-btn" data-tab="sroi">Honest SROI Estimator (ZK-027)</button>
      </nav>
    </div>
  </header>

  <main class="container">
    <div class="la-yufti-banner">
      <div>
        <strong style="color: var(--gold);">Prinsip La Yufti (ZK-023):</strong>
        AI &amp; linter deterministik hanya melakukan pra-penapisan kepatuhan (UU 41/2004, UU 23/2011, Fatwa DSN-MUI, UU PDP). Pengesahan syariah tetap wajib oleh manusia berwenang (DPS / Pimpinan Nazhir/LAZ).
      </div>
      <div class="badges">
        <a class="btn btn-sm" href="/api/export/odoo/json" target="_blank">Export Odoo JSON</a>
        <a class="btn btn-sm" href="/api/export/odoo/csv?standard=psak412" target="_blank">CSV PSAK 412</a>
        <a class="btn btn-sm" href="/api/export/odoo/csv?standard=psak109" target="_blank">CSV PSAK 109</a>
      </div>
    </div>

    <!-- PANEL 1: FLYWHEEL & PSAK 412/109 -->
    <section id="panel-flywheel" class="panel active">
      <div id="kpi-strip" class="grid-4"></div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Pemisahan Dana PSAK 412 (Wakaf — waqf-odoo-modules)</h2>
              <p class="card-sub">Layer 2 Hifz al-Ashl: Pokok kekal abadi terproteksi (0% potongan pokok)</p>
            </div>
            <span class="badge badge-emerald mono" id="psak412-variance">Variance: Rp 0</span>
          </div>
          <div id="psak412-breakdown"></div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Pemisahan Dana PSAK 109 (ZIS — zakat-odoo-modules)</h2>
              <p class="card-sub">Layer 1 De-Risking: Zakat 8 Asnaf (Amil &le; 12,5%), Infak Terikat &amp; Dampak</p>
            </div>
            <span class="badge badge-emerald mono" id="psak109-variance">Variance: Rp 0</span>
          </div>
          <div id="psak109-breakdown"></div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 22px;">
        <div class="card-header">
          <div>
            <h2 class="card-title">Atribusi Konten (<span class="mono">ef_ep</span>), Kohort D+1 / D+3 / D+7 &amp; Rasio Biaya Distribusi</h2>
            <p class="card-sub">Mengukur konten edukasi mana yang paling efektif melahirkan Wakif Baru &amp; Wakif Berulang (ZK-004)</p>
          </div>
          <button class="btn btn-sm btn-primary" id="btn-digest-preview">Preview Kartu WA (waflare) &amp; Telegram</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Episode &amp; Program</th>
                <th>Standar</th>
                <th>Transaksi &amp; Wakif</th>
                <th>D+1</th>
                <th>D+3</th>
                <th>D+7</th>
                <th>Total Terhimpun</th>
                <th>Biaya Distribusi (%)</th>
              </tr>
            </thead>
            <tbody id="episode-table-body"></tbody>
          </table>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Atribusi Kanal Distribusi (<span class="mono">utm_source</span>)</h2>
              <p class="card-sub">Perbandingan kontribusi Wakaf vs ZIS lintas platform</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Tx</th>
                  <th>Wakif Baru</th>
                  <th>Wakif Berulang</th>
                  <th>Wakaf (PSAK 412)</th>
                  <th>ZIS (PSAK 109)</th>
                </tr>
              </thead>
              <tbody id="platform-table-body"></tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Simulasi Kartu Pengurus (WhatsApp waflare / Telegram)</h2>
              <p class="card-sub">Mode dry-run aman; klik tombol preview di atas untuk memuat kartu terkini</p>
            </div>
          </div>
          <pre id="digest-preview-box" class="codebox">Klik "Preview Kartu WA (waflare) & Telegram" untuk melihat kartu eksekutif terbaru...</pre>
        </div>
      </div>
    </section>

    <!-- PANEL 2: LINTER PLAYGROUND -->
    <section id="panel-linter" class="panel">
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Sharia, Regulatory &amp; UU PDP Copy Linter Playground</h2>
              <p class="card-sub">Uji naskah kampanye secara deterministik sebelum masuk antrean review DPS</p>
            </div>
            <span class="badge badge-gold">5 Aturan Eksplisit</span>
          </div>

          <div class="field-grid">
            <div>
              <label for="lint-akad">Akad Dana</label>
              <select id="lint-akad">
                <option value="wakaf_uang_abadi">wakaf_uang_abadi (PSAK 412)</option>
                <option value="wakaf_melalui_uang">wakaf_melalui_uang (PSAK 412)</option>
                <option value="cwls_ritel">cwls_ritel (PSAK 412)</option>
                <option value="hasil_kelolaan_wakaf">hasil_kelolaan_wakaf (PSAK 412)</option>
                <option value="zakat_maal">zakat_maal (PSAK 109)</option>
                <option value="infak_terikat">infak_terikat (PSAK 109)</option>
                <option value="dana_sosial_dampak">dana_sosial_dampak (PSAK 109)</option>
              </select>
            </div>
            <div>
              <label for="lint-segment">Segmen Audiens</label>
              <select id="lint-segment">
                <option value="CALON_WAKIF_BARU">CALON_WAKIF_BARU</option>
                <option value="LAPORAN_DAMPAK_WAKIF_EKSISTING">LAPORAN_DAMPAK_WAKIF_EKSISTING</option>
              </select>
            </div>
          </div>

          <label for="lint-text">Naskah Kampanye</label>
          <textarea id="lint-text">Salurkan Wakaf Uang Abadi untuk sumur bor produktif desa kering Garut. Pokok wakaf dijaga utuh (Hifz al-Ashl) melalui LKS-PWU Bank Syariah Indonesia (BSI) oleh Nazhir resmi terdaftar BWI (STBPN No. 3.3.00386). Imbal hasil bersih disalurkan bagi petani tanpa memotong pokok wakaf.</textarea>

          <div class="row-actions">
            <button class="btn btn-primary" id="btn-run-lint">Jalankan Linter Deterministik</button>
            <button class="btn btn-sm" id="preset-pass">Preset Lolos</button>
            <button class="btn btn-sm" id="preset-sharia001">Uji SHARIA-001 + PDP-001</button>
            <button class="btn btn-sm" id="preset-sharia002">Uji SHARIA-002 (Campur Akad)</button>
            <button class="btn btn-sm" id="preset-sharia004">Uji SHARIA-004 (Framing)</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Hasil Pra-Penapisan &amp; UU PDP Scrubber</h2>
              <p class="card-sub" id="lint-summary-sub">Menunggu eksekusi linter...</p>
            </div>
            <span class="badge" id="lint-status-badge">READY</span>
          </div>
          <div id="lint-findings-list"></div>
          <label style="margin-top: 12px;">Teks Setelah UU PDP PII Scrubber</label>
          <pre id="lint-scrubbed-box" class="codebox">—</pre>
        </div>
      </div>
    </section>

    <!-- PANEL 3: CAMPAIGN PACKAGER & DPS GATE -->
    <section id="panel-campaigns" class="panel">
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Buat Brief Kampanye Baru (Auto-Package 5 Kanal &times; 2 Segmen)</h2>
              <p class="card-sub">Menghasilkan 10 varian konten dengan tautan <span class="mono">ef_ep</span> &amp; <span class="mono">utm_*</span></p>
            </div>
          </div>
          <form id="campaign-create-form">
            <div class="field-grid">
              <div>
                <label>Judul Kampanye</label>
                <input name="title" required value="Wakaf Produktif Penggilingan Padi Petani Cianjur" />
              </div>
              <div>
                <label>Episode ID (<span class="mono">ef_ep</span>)</label>
                <input name="episodeId" required value="EP-WKF-06" />
              </div>
            </div>
            <div class="field-grid">
              <div>
                <label>Akad</label>
                <select name="akadType">
                  <option value="wakaf_melalui_uang">wakaf_melalui_uang (PSAK 412)</option>
                  <option value="wakaf_uang_abadi">wakaf_uang_abadi (PSAK 412)</option>
                  <option value="cwls_ritel">cwls_ritel (PSAK 412)</option>
                  <option value="zakat_maal">zakat_maal (PSAK 109)</option>
                  <option value="infak_terikat">infak_terikat (PSAK 109)</option>
                </select>
              </div>
              <div>
                <label>STBPN BWI / SK LAZ</label>
                <input name="stbpnNumber" value="3.3.00386" />
              </div>
              <div>
                <label>LKS-PWU Mitra</label>
                <input name="lksPwuName" value="Bank Syariah Indonesia (BSI)" />
              </div>
            </div>
            <div class="field-grid">
              <div>
                <label>Nama Lembaga Nazhir / LAZ</label>
                <input name="nazhirName" required value="Yayasan Amal Produktif Indonesia" />
              </div>
              <div>
                <label>Landing URL Resmi</label>
                <input name="officialLandingUrl" required value="https://wakaf.amalproduktif.or.id/padi-cianjur" />
              </div>
            </div>
            <label>Ringkasan Penerima Manfaat (Bermartabat)</label>
            <input name="beneficiarySummary" required value="180 keluarga petani kecil anggota koperasi tani Cianjur" />
            <div class="row-actions">
              <button type="submit" class="btn btn-primary">Generate 10 Varian &amp; Jalankan Linter</button>
              <span id="campaign-create-msg" class="kpi-foot"></span>
            </div>
          </form>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Daftar Kampanye &amp; Status Governance Gate</h2>
              <p class="card-sub">Klik kampanye untuk memeriksa varian konten atau melakukan DPS Sign-Off</p>
            </div>
          </div>
          <div id="campaign-list"></div>
        </div>
      </div>

      <div class="card" id="campaign-detail-card" style="display:none;">
        <div class="card-header">
          <div>
            <h2 class="card-title" id="detail-title">Detail Kampanye</h2>
            <p class="card-sub" id="detail-meta"></p>
          </div>
          <span class="status-pill" id="detail-status"></span>
        </div>

        <div class="card" style="background: var(--bg-deep); margin-bottom: 16px;">
          <h3 class="card-title" style="font-size: 14px; margin-bottom: 10px;">Human Governance Gate (DPS / Pimpinan Sign-Off)</h3>
          <div class="field-grid">
            <div>
              <label>Nama Reviewer Berwenang</label>
              <input id="gate-reviewer-name" placeholder="mis. Ust. Dr. H. Ahmad Fauzan, Lc." />
            </div>
            <div>
              <label>Peran Otoritas</label>
              <select id="gate-reviewer-role">
                <option value="DPS">Dewan Pengawas Syariah (DPS)</option>
                <option value="PIMPINAN_NAZHIR">Pimpinan Nazhir</option>
                <option value="CWC_OFFICER">Certified Waqf Competence (CWC)</option>
                <option value="PIMPINAN_LAZ">Pimpinan LAZ</option>
              </select>
            </div>
            <div>
              <label>Catatan Audit</label>
              <input id="gate-notes" value="Disahkan setelah verifikasi naskah, STBPN, LKS-PWU, dan prinsip Hifz al-Ashl." />
            </div>
          </div>
          <div class="row-actions">
            <label style="display:flex; align-items:center; gap:8px; margin:0; cursor:pointer;">
              <input type="checkbox" id="gate-layufti" style="width:auto;" />
              <span>Saya menyetujui deklarasi <strong>La Yufti</strong>: AI bukan Mufti dan persetujuan ini merupakan keputusan hukum manusia berwenang.</span>
            </label>
          </div>
          <div class="row-actions">
            <button class="btn btn-emerald" id="btn-gate-approve">Approve for Publish</button>
            <span id="gate-result-msg" class="kpi-foot"></span>
          </div>
        </div>

        <div id="detail-variants"></div>
      </div>
    </section>

    <!-- PANEL 4: HONEST SROI -->
    <section id="panel-sroi" class="panel">
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Kalkulator Honest SROI (ZK-027)</h2>
              <p class="card-sub">Mengurangi Deadweight, Displacement, Attribution, Drop-Off &amp; Nilai Waktu Uang</p>
            </div>
          </div>
          <form id="sroi-form">
            <label>Nama Program</label>
            <input name="programName" value="Wakaf Sumur Bor & Irigasi Tetes Garut" style="margin-bottom:12px;" />
            <div class="field-grid">
              <div>
                <label>Total Investasi Dana (IDR)</label>
                <input name="totalInvestmentIdr" type="number" value="300000000" />
              </div>
              <div>
                <label>Discount Rate (% / thn)</label>
                <input name="discountRatePct" type="number" step="0.5" value="6" />
              </div>
              <div>
                <label>Jumlah Penerima Manfaat</label>
                <input name="beneficiaryCount" type="number" value="320" />
              </div>
              <div>
                <label>Nilai Manfaat Kotor / Orang / Thn (IDR)</label>
                <input name="grossUnitValueIdr" type="number" value="2500000" />
              </div>
            </div>
            <div class="field-grid">
              <div>
                <label>Deadweight (%)</label>
                <input name="deadweightPct" type="number" value="20" />
              </div>
              <div>
                <label>Displacement (%)</label>
                <input name="displacementPct" type="number" value="10" />
              </div>
              <div>
                <label>Attribution (%)</label>
                <input name="attributionPct" type="number" value="25" />
              </div>
              <div>
                <label>Drop-Off (% / thn)</label>
                <input name="dropOffPct" type="number" value="15" />
              </div>
              <div>
                <label>Durasi Manfaat (Tahun)</label>
                <input name="benefitPeriodYears" type="number" min="1" max="20" value="3" />
              </div>
            </div>
            <button type="submit" class="btn btn-primary">Hitung Honest Discounted SROI</button>
          </form>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Perbandingan Vanity vs Honest SROI</h2>
              <p class="card-sub">Mencegah klaim dampak filantropi yang dilebih-lebihkan kepada Wakif</p>
            </div>
            <span class="badge badge-gold" id="sroi-band-badge">—</span>
          </div>
          <div id="sroi-output"></div>
        </div>
      </div>
    </section>
  </main>

  <script>
    const fmtIdr = (v) => 'Rp ' + Math.round(Number(v || 0)).toLocaleString('id-ID');
    let selectedCampaignId = null;

    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
      });
    });

    async function loadAnalytics() {
      const [overviewRes, odooRes] = await Promise.all([
        fetch('/api/analytics/overview'),
        fetch('/api/export/odoo/json')
      ]);
      const data = await overviewRes.json();
      const odoo = await odooRes.json();

      document.getElementById('kpi-strip').innerHTML = [
        {
          label: 'Total Dana Terhimpun',
          val: fmtIdr(data.totals.totalMobilizedIdr),
          foot: data.totals.totalTransactions + ' transaksi (' + data.totals.totalUniqueDonors + ' donatur unik)'
        },
        {
          label: 'Repeat Wakif (30d / 90d)',
          val: data.retention.repeatWakifRate30dPct + '% / ' + data.retention.repeatWakifRate90dPct + '%',
          foot: 'Overall repeat rate Wakif: ' + data.retention.wakifRepeatRatePct + '%'
        },
        {
          label: 'Rasio Biaya Distribusi',
          val: data.totals.blendedCostRatioPct + '%',
          foot: 'Total biaya distribusi: ' + fmtIdr(data.totals.totalDistributionCostIdr)
        },
        {
          label: 'Rata-rata Tiket Wakaf/ZIS',
          val: fmtIdr(data.totals.averageTicketIdr),
          foot: 'Wakif PSAK 412 aktif: ' + data.totals.totalWakifDonors + ' donatur'
        }
      ].map((k) =>
        '<div class="card"><div class="kpi-label">' + k.label + '</div><div class="kpi-value">' + k.val + '</div><div class="kpi-foot">' + k.foot + '</div></div>'
      ).join('');

      document.getElementById('psak412-variance').textContent =
        'Variance: ' + fmtIdr(odoo.reconciliation.psak412VarianceIdr);
      document.getElementById('psak109-variance').textContent =
        'Variance: ' + fmtIdr(odoo.reconciliation.psak109VarianceIdr);

      const w = data.fundSegregation.psak412Waqf;
      document.getElementById('psak412-breakdown').innerHTML =
        '<table><tbody>' +
        '<tr><td>Wakaf Uang Abadi (Pokok Permanen)</td><td class="mono" style="text-align:right">' + fmtIdr(w.wakafUangAbadiIdr) + '</td></tr>' +
        '<tr><td>Wakaf Melalui Uang (Aset Produktif)</td><td class="mono" style="text-align:right">' + fmtIdr(w.wakafMelaluiUangIdr) + '</td></tr>' +
        '<tr><td>CWLS Ritel (Sukuk Terproteksi Negara)</td><td class="mono" style="text-align:right">' + fmtIdr(w.cwlsRitelIdr) + '</td></tr>' +
        '<tr><td>Hasil Pengelolaan Wakaf (Net Mauquf Alaih)</td><td class="mono" style="text-align:right">' + fmtIdr(w.hasilPengelolaanWakafNetIdr) + '</td></tr>' +
        '<tr><td>Imbal Jasa Nazhir (&le; 10% Hasil Bersih)</td><td class="mono" style="text-align:right">' + fmtIdr(w.hakNazhirIdr) + '</td></tr>' +
        '<tr><th>Total Bruto PSAK 412</th><th class="mono" style="text-align:right; color: var(--gold)">' + fmtIdr(w.totalPsak412GrossIdr) + '</th></tr>' +
        '</tbody></table>';

      const z = data.fundSegregation.psak109Zis;
      document.getElementById('psak109-breakdown').innerHTML =
        '<table><tbody>' +
        '<tr><td>Dana Zakat Maal (Net 8 Asnaf)</td><td class="mono" style="text-align:right">' + fmtIdr(z.zakatMaalNetIdr) + '</td></tr>' +
        '<tr><td>Hak Amil dari Zakat (&le; 12,5%)</td><td class="mono" style="text-align:right">' + fmtIdr(z.hakAmilZakatIdr) + '</td></tr>' +
        '<tr><td>Infak / Sedekah Terikat (Muqayyad)</td><td class="mono" style="text-align:right">' + fmtIdr(z.infakTerikatNetIdr) + '</td></tr>' +
        '<tr><td>Dana Sosial Dampak (Layer 1 De-Risking)</td><td class="mono" style="text-align:right">' + fmtIdr(z.danaSosialDampakNetIdr) + '</td></tr>' +
        '<tr><td>Hak Amil dari Infak</td><td class="mono" style="text-align:right">' + fmtIdr(z.hakAmilInfakIdr) + '</td></tr>' +
        '<tr><th>Total Bruto PSAK 109</th><th class="mono" style="text-align:right; color: var(--gold)">' + fmtIdr(z.totalPsak109GrossIdr) + '</th></tr>' +
        '</tbody></table>';

      document.getElementById('episode-table-body').innerHTML = data.byEpisode.map((ep) =>
        '<tr>' +
        '<td><div class="mono" style="font-size:11px; color: var(--gold)">' + ep.episodeId + '</div><strong>' + ep.title + '</strong></td>' +
        '<td><span class="badge">' + ep.accountingStandard + '</span></td>' +
        '<td class="mono">' + ep.txCount + ' tx / ' + ep.uniqueDonors + ' org<br><small style="color:var(--text-muted)">Baru: ' + ep.newDonors + ' | Ulang: ' + ep.repeatDonors + '</small></td>' +
        '<td class="mono">' + fmtIdr(ep.cohorts.d1AmountIdr) + '<br><small style="color:var(--text-muted)">' + ep.cohorts.d1Donors + ' wakif</small></td>' +
        '<td class="mono">' + fmtIdr(ep.cohorts.d3AmountIdr) + '<br><small style="color:var(--text-muted)">' + ep.cohorts.d3Donors + ' wakif</small></td>' +
        '<td class="mono">' + fmtIdr(ep.cohorts.d7AmountIdr) + '<br><small style="color:var(--text-muted)">' + ep.cohorts.d7Donors + ' wakif</small></td>' +
        '<td class="mono" style="color: var(--emerald)"><strong>' + fmtIdr(ep.totalMobilizedIdr) + '</strong></td>' +
        '<td class="mono">' + fmtIdr(ep.distributionCostIdr) + ' (' + ep.costRatioPct + '%)</td>' +
        '</tr>'
      ).join('');

      document.getElementById('platform-table-body').innerHTML = data.byPlatform.map((p) =>
        '<tr>' +
        '<td class="mono"><strong>' + p.platform + '</strong></td>' +
        '<td class="mono">' + p.txCount + '</td>' +
        '<td class="mono">' + p.newDonorTx + '</td>' +
        '<td class="mono">' + p.repeatDonorTx + '</td>' +
        '<td class="mono">' + fmtIdr(p.waqfMobilizedIdr) + '</td>' +
        '<td class="mono">' + fmtIdr(p.zisMobilizedIdr) + '</td>' +
        '</tr>'
      ).join('');
    }

    async function runLinter() {
      const payload = {
        text: document.getElementById('lint-text').value,
        akadType: document.getElementById('lint-akad').value,
        segment: document.getElementById('lint-segment').value
      };
      const res = await fetch('/api/linter/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const r = await res.json();
      const badge = document.getElementById('lint-status-badge');
      badge.className = 'badge ' + (r.passed ? 'badge-emerald' : 'badge-crimson');
      badge.textContent = r.passed ? 'LOLOS PRA-PENAPISAN' : 'DIBLOKIR (' + r.blockerCount + ' BLOCKER)';
      document.getElementById('lint-summary-sub').textContent =
        r.laYufti.disclaimer;

      const listEl = document.getElementById('lint-findings-list');
      if (!r.findings.length) {
        listEl.innerHTML = '<div class="finding" style="border-left:4px solid var(--emerald);"><strong>Tidak ditemukan pelanggaran aturan syariah, regulasi, atau UU PDP.</strong><br><small style="color:var(--text-muted)">Siap diajukan ke Dewan Pengawas Syariah / Pimpinan untuk pengesahan fisik.</small></div>';
      } else {
        listEl.innerHTML = r.findings.map((f) =>
          '<div class="finding ' + f.severity + '">' +
          '<div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px;">' +
          '<strong class="mono">' + f.ruleCode + ' · ' + f.title + '</strong>' +
          '<span class="badge ' + (f.severity === 'BLOCKER' ? 'badge-crimson' : 'badge-amber') + '">' + f.severity + '</span>' +
          '</div>' +
          '<div style="font-size:13px;">' + f.message + '</div>' +
          '<div style="font-size:11.5px; color:var(--text-muted); margin-top:4px;">Rujukan: ' + f.regulationRef + '</div>' +
          '<div style="font-size:12px; color:#E8CF9F; margin-top:4px;">Saran perbaikan: ' + f.remediation + '</div>' +
          '</div>'
        ).join('');
      }
      document.getElementById('lint-scrubbed-box').textContent = r.scrubbedCopy;
    }

    document.getElementById('btn-run-lint').addEventListener('click', runLinter);
    document.getElementById('preset-pass').addEventListener('click', () => {
      document.getElementById('lint-akad').value = 'wakaf_uang_abadi';
      document.getElementById('lint-text').value = 'Salurkan Wakaf Uang Abadi untuk sumur bor produktif desa kering Garut. Pokok wakaf dijaga utuh (Hifz al-Ashl) melalui LKS-PWU Bank Syariah Indonesia (BSI) oleh Nazhir resmi terdaftar BWI (STBPN No. 3.3.00386). Imbal hasil bersih disalurkan bagi petani tanpa memotong pokok wakaf.';
      runLinter();
    });
    document.getElementById('preset-sharia001').addEventListener('click', () => {
      document.getElementById('lint-akad').value = 'wakaf_uang_abadi';
      document.getElementById('lint-text').value = 'Wakaf uang dijamin cuan 18% kembali ke rekening pribadi wakif dan diputar untuk trading kripto. Hubungi NIK 3273011205900001 WA 081234567890 atau rekening pribadi Bapak Budi 1234567890.';
      runLinter();
    });
    document.getElementById('preset-sharia002').addEventListener('click', () => {
      document.getElementById('lint-akad').value = 'wakaf_melalui_uang';
      document.getElementById('lint-text').value = 'Salurkan zakat maal sekaligus wakaf dalam satu rekening gabungan dengan imbal jasa nazhir 20% dari pokok wakaf.';
      runLinter();
    });
    document.getElementById('preset-sharia004').addEventListener('click', () => {
      document.getElementById('lint-akad').value = 'wakaf_uang_abadi';
      document.getElementById('lint-text').value = 'Tonton penderitaan mereka yang wajah kumuh melas tak berdaya menunggu mati kelaparan. Jika anda skip pesan ini rezeki seret dan masuk neraka! STBPN 3.3.00386 LKS-PWU BSI.';
      runLinter();
    });

    async function loadCampaigns() {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      const container = document.getElementById('campaign-list');
      container.innerHTML = data.campaigns.map((c) =>
        '<div class="variant-item" style="cursor:pointer;" onclick="selectCampaign(\\'' + c.id + '\\')">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">' +
        '<div><span class="mono" style="font-size:11px;color:var(--gold)">' + c.episodeId + ' · ' + c.accountingStandard + '</span><br><strong>' + c.title + '</strong></div>' +
        '<span class="status-pill status-' + c.status + '">' + c.status + '</span>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin-top:6px;">Akad: ' + c.akadType + ' · Varian: ' + c.variants.length + ' · Blocker aktif: ' + c.variants.reduce((s,v)=>s+v.blockerCount,0) + '</div>' +
        '</div>'
      ).join('');
    }

    window.selectCampaign = async (id) => {
      selectedCampaignId = id;
      const res = await fetch('/api/campaigns/' + id);
      const data = await res.json();
      const c = data.campaign;
      document.getElementById('campaign-detail-card').style.display = 'block';
      document.getElementById('detail-title').textContent = c.title;
      document.getElementById('detail-meta').textContent =
        c.episodeId + ' | ' + c.akadType + ' | ' + c.accountingStandard + ' | ' + c.blendedLayer;
      const pill = document.getElementById('detail-status');
      pill.textContent = c.status;
      pill.className = 'status-pill status-' + c.status;
      document.getElementById('gate-result-msg').textContent = '';

      document.getElementById('detail-variants').innerHTML = c.variants.map((v) =>
        '<div class="variant-item">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px;">' +
        '<div><span class="badge badge-gold mono">' + v.channel + '</span> <span class="badge">' + v.segment + '</span></div>' +
        '<span class="badge ' + (v.lintPassed ? 'badge-emerald' : 'badge-crimson') + '">' + (v.lintPassed ? 'LINT PASS' : 'BLOCKED (' + v.blockerCount + ')') + '</span>' +
        '</div>' +
        '<div style="font-weight:700;margin-bottom:4px;">' + v.headline + '</div>' +
        '<pre class="codebox">' + v.copyText + '</pre>' +
        '<div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;" class="mono">Tracking: ' + v.trackingUrl + '</div>' +
        '</div>'
      ).join('');
    };

    document.getElementById('btn-gate-approve').addEventListener('click', async () => {
      if (!selectedCampaignId) return;
      const msgEl = document.getElementById('gate-result-msg');
      const res = await fetch('/api/campaigns/' + selectedCampaignId + '/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerName: document.getElementById('gate-reviewer-name').value,
          reviewerRole: document.getElementById('gate-reviewer-role').value,
          notes: document.getElementById('gate-notes').value,
          laYuftiAcknowledged: document.getElementById('gate-layufti').checked,
          approved: true
        })
      });
      const body = await res.json();
      if (!res.ok) {
        msgEl.style.color = '#FDA4AF';
        msgEl.textContent = 'Ditolak Gate (' + body.code + '): ' + body.error;
      } else {
        msgEl.style.color = '#6EE7B7';
        msgEl.textContent = 'Berhasil disahkan ke status ' + body.campaign.status;
        await loadCampaigns();
        await window.selectCampaign(selectedCampaignId);
      }
    });

    document.getElementById('campaign-create-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json();
      const msgEl = document.getElementById('campaign-create-msg');
      if (res.ok) {
        msgEl.style.color = '#6EE7B7';
        msgEl.textContent = 'Kampanye dibuat (' + body.campaign.status + ')';
        await loadCampaigns();
        await window.selectCampaign(body.campaign.id);
      } else {
        msgEl.style.color = '#FDA4AF';
        msgEl.textContent = body.error || 'Gagal membuat kampanye';
      }
    });

    async function runSroiCalc(e) {
      if (e) e.preventDefault();
      const fd = new FormData(document.getElementById('sroi-form'));
      const payload = {
        programName: fd.get('programName'),
        totalInvestmentIdr: Number(fd.get('totalInvestmentIdr')),
        discountRatePct: Number(fd.get('discountRatePct')),
        streams: [{
          label: 'Peningkatan Pendapatan & Ketahanan Manfaat',
          beneficiaryCount: Number(fd.get('beneficiaryCount')),
          grossUnitValueIdr: Number(fd.get('grossUnitValueIdr')),
          deadweightPct: Number(fd.get('deadweightPct')),
          displacementPct: Number(fd.get('displacementPct')),
          attributionPct: Number(fd.get('attributionPct')),
          dropOffPct: Number(fd.get('dropOffPct')),
          benefitPeriodYears: Number(fd.get('benefitPeriodYears'))
        }]
      };
      const res = await fetch('/api/sroi/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const r = await res.json();
      document.getElementById('sroi-band-badge').textContent = r.credibilityBand;
      document.getElementById('sroi-output').innerHTML =
        '<table><tbody>' +
        '<tr><td>Vanity Gross Value (Tanpa Diskon)</td><td class="mono" style="text-align:right">' + fmtIdr(r.grossUndiscountedTotalIdr) + ' (' + r.naiveVanityRatio + 'x)</td></tr>' +
        '<tr><td>Total Potongan Haircut (Deadweight/Attribution/Drop-off/PV)</td><td class="mono" style="text-align:right; color: var(--amber)">-' + r.haircutPct + '%</td></tr>' +
        '<tr><td>Present Value Manfaat Bersih</td><td class="mono" style="text-align:right">' + fmtIdr(r.presentValueBenefitsIdr) + '</td></tr>' +
        '<tr><td>Net Present Social Value (NPSV)</td><td class="mono" style="text-align:right">' + fmtIdr(r.netPresentSocialValueIdr) + '</td></tr>' +
        '<tr><th>Honest Discounted SROI Ratio</th><th class="mono" style="text-align:right; font-size:18px; color: var(--emerald)">' + r.honestSroiRatio + 'x</th></tr>' +
        '</tbody></table>' +
        '<p style="font-size:12.5px; color:var(--text-muted); margin-top:12px;">' + r.methodologyNote + '</p>';
    }

    document.getElementById('sroi-form').addEventListener('submit', runSroiCalc);
    document.getElementById('btn-digest-preview').addEventListener('click', async () => {
      const res = await fetch('/api/notifications/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true, channels: ['waflare', 'telegram'] })
      });
      const body = await res.json();
      document.getElementById('digest-preview-box').textContent = body.markdownCard;
    });

    loadAnalytics();
    loadCampaigns();
    runLinter();
    runSroiCalc();
  </script>
</body>
</html>`;
}
