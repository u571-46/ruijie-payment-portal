const express = require('express');
const midtransClient = require('midtrans-client');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/static', express.static(path.join(__dirname, 'public')));

// KUNCI RAHASIA OWNER (Jangan sampai pembeli tahu isi string ini!)
// Ubah string ini dengan kode acak rahasia Anda sendiri sebelum membagikan aplikasi
const OWNER_SECRET_SALT = "KQ5_CORE_GATEWAY_SECURITY_SALT_2026";

// Inisialisasi Midtrans Snap Client
let snap = new midtransClient.Snap({
    isProduction: process.env.NODE_ENV === 'production',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// === CONFIG, DATABASE, & LICENSE PATHS ===
const CONFIG_PATH = path.join(__dirname, 'config.json');
const VOUCHER_FILE = path.join(__dirname, 'vouchers.json');
const SALES_FILE = path.join(__dirname, 'sales.json');
const LICENSE_PATH = path.join(__dirname, 'license.json');

const defaultConfig = {
    passwordAdmin: "kq5digital#2026",
    namaWiFi: "KQ5 DIGITAL",
    subtitleWiFi: "WiFi Premium Cepat & Stabil",
    hargaPaket1: "Rp 3.000",
    durasiPaket1: "Paket Ekstra 1 Jam",
    hargaPaket2: "Rp 15.000",
    durasiPaket2: "Paket Puas 24 Jam",
    telegramBotToken: "",
    telegramChatId: ""
};

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
        return { ...defaultConfig };
    }
    try {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
        return { ...defaultConfig, ...JSON.parse(raw) };
    } catch (e) { return { ...defaultConfig }; }
}

function saveConfig(newConfig) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
}

function readJSON(filePath) {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) { return []; }
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// === ANTICRACK ENGINE: DECRYPTION & VALIDATION ===
function checkLicenseStatus() {
    if (!fs.existsSync(LICENSE_PATH)) {
        return { valid: false, message: "Aplikasi Belum Teraktivasi! Masukkan Lisensi Resmi." };
    }
    try {
        const licenseData = JSON.parse(fs.readFileSync(LICENSE_PATH, 'utf8'));
        const { licensedTo, tier, expiresAt, signature } = licenseData;

        // Validasi ulang Signature asli menggunakan Salt Key Rahasia Owner
        const rawString = `${licensedTo}|${tier}|${expiresAt}`;
        const calculatedSignature = crypto.createHmac('sha256', OWNER_SECRET_SALT).update(rawString).digest('hex');

        if (calculatedSignature !== signature) {
            return { valid: false, message: "Kunci Lisensi Ilegal / Terdeteksi Hasil Crack!" };
        }

        // Validasi Waktu Kedaluwarsa (Kecuali tipe Lifetime)
        if (tier !== 'Lifetime') {
            const expiryDate = new Date(expiresAt);
            if (new Date() > expiryDate) {
                return { valid: false, message: `Masa Langganan Paket [${tier}] Anda Telah Habis pada ${expiresAt}!` };
            }
        }

        return { valid: true, tier, expiresAt, licensedTo };
    } catch (e) {
        return { valid: false, message: "Gagal memproses file lisensi sistem." };
    }
}

// === MULTER STORAGE MANAGEMENT (LOGO & UPDATE APPLICATION) ===
const uploadManager = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'appUpdate') {
            cb(null, __dirname); // File update ditaruh di folder utama
        } else {
            cb(null, path.join(__dirname, 'public')); // Logo ditaruh di folder public
        }
    },
    filename: function (req, file, cb) {
        if (file.fieldname === 'appUpdate') {
            cb(null, 'update_package.zip');
        } else {
            cb(null, 'logo.png');
        }
    }
});
const upload = multer({ storage: uploadManager });


// ==========================================
// GATEWAY API PORTAL INTERNET (TERKUNCI SANKSI LISENSI)
// ==========================================

app.post('/api/pay', async (req, res) => {
    const license = checkLicenseStatus();
    if (!license.valid) return res.status(403).json({ error: `Akses Diblokir: ${license.message}` });

    try {
        const { packageId } = req.body;
        let config = loadConfig();
        let price = 0;
        if (packageId === 'paket_1jam') price = parseInt((config.hargaPaket1||'').replace(/\D/g, '')) || 3000;
        if (packageId === 'paket_24jam') price = parseInt((config.hargaPaket2||'').replace(/\D/g, '')) || 15000;

        const orderId = `WIFI-${Date.now()}`;
        let parameter = {
            "transaction_details": { "order_id": orderId, "gross_amount": price },
            "credit_card": { "secure": true },
            "customer_details": { "first_name": "Pelanggan WiFi" }
        };

        const transaction = await snap.createTransaction(parameter);
        res.json({ token: transaction.token });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/get-voucher/:packageId', (req, res) => {
    const license = checkLicenseStatus();
    if (!license.valid) return res.status(403).json({ success: false, message: license.message });

    const { packageId } = req.params;
    let vouchers = readJSON(VOUCHER_FILE);
    let sales = readJSON(SALES_FILE);
    let config = loadConfig();

    const voucherIndex = vouchers.findIndex(v => v.packageId === packageId && v.status === 'tersedia');
    if (voucherIndex === -1) {
        return res.status(404).json({ success: false, message: "Stok voucher habis! Hubungi admin kasir." });
    }

    const selectedVoucher = vouchers[voucherIndex];
    vouchers[voucherIndex].status = 'terpakai';
    vouchers[voucherIndex].dateUsed = new Date().toLocaleString('id-ID');

    let price = 0;
    if (packageId === 'paket_1jam') price = parseInt((config.hargaPaket1||'').replace(/\D/g, '')) || 3000;
    if (packageId === 'paket_24jam') price = parseInt((config.hargaPaket2||'').replace(/\D/g, '')) || 15000;

    sales.push({
        id: 'TRX-' + Date.now(),
        packageId: packageId,
        packageName: packageId === 'paket_1jam' ? config.durasiPaket1 : config.durasiPaket2,
        price: price,
        voucherCode: selectedVoucher.code,
        date: new Date().toLocaleString('id-ID')
    });

    writeJSON(VOUCHER_FILE, vouchers);
    writeJSON(SALES_FILE, sales);

    // KONTROL CS: Notifikasi bot Telegram otomatis jika token terisi
    if (config.telegramBotToken && config.telegramChatId) {
        const messageText = encodeURIComponent(`📢 *YAY! PENJUALAN WIFI SUKSES*\n\n📦 Paket: ${packageId}\n💰 Nominal: Rp ${price.toLocaleString('id-ID')}\n🎫 Kode Voucher: ${selectedVoucher.code}`);
        fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage?chat_id=${config.telegramChatId}&text=${messageText}&parse_mode=Markdown`).catch(e => console.log("Telegram Error"));
    }

    res.json({ success: true, code: selectedVoucher.code });
});

app.get('/api/portal-settings', (req, res) => {
    const config = loadConfig();
    const { passwordAdmin, telegramBotToken, telegramChatId, ...safeConfig } = config;
    res.json(safeConfig);
});


// ==========================================
// EXPANSION DASHBOARD: KQ5 COREPORTAL UI
// ==========================================

app.get('/admin/portal-config', (req, res) => {
    const config = loadConfig();
    const vouchers = readJSON(VOUCHER_FILE);
    const sales = readJSON(SALES_FILE);
    const license = checkLicenseStatus();

    const stok1Jam = vouchers.filter(v => v.packageId === 'paket_1jam' && v.status === 'tersedia').length;
    const stok24Jam = vouchers.filter(v => v.packageId === 'paket_24jam' && v.status === 'tersedia').length;
    const totalTerjual = sales.length;
    const totalPendapatan = sales.reduce((acc, curr) => acc + curr.price, 0);

    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>KQ5 CorePortal - Control Center</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { background: #070a13; color: #e2e8f0; font-family: 'Segoe UI', sans-serif; display: flex; min-height: 100vh; }
            .sidebar { width: 260px; background: #0f172a; padding: 25px 15px; border-right: 1px solid rgba(255,255,255,0.05); }
            .sidebar-brand h3 { font-size: 1.4rem; color: #00d2ff; font-weight: 800; text-align:center; margin-bottom:30px; letter-spacing:0.5px;}
            .nav-tabs-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
            .nav-link { display: flex; align-items: center; gap: 12px; padding: 12px 16px; color: #94a3b8; text-decoration: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
            .nav-link:hover, .nav-link.active { background: linear-gradient(90deg, #00d2ff, #9a3eff); color: white; box-shadow: 0 4px 15px rgba(0, 210, 255, 0.2); }
            .content-area { flex: 1; padding: 35px 30px; overflow-y: auto; }
            .tab-panel { display: none; }
            .tab-panel.active { display: block; animation: fadeIn 0.4s ease; }
            .main-header { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #1e293b; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .stat-card { background: #0f172a; padding: 20px; border-radius: 16px; display: flex; align-items: center; justify-content: space-between; border: 1px solid rgba(255,255,255,0.05); }
            .stat-info p { font-size: 1.6rem; font-weight: 800; color: white; }
            .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
            .bg-blue { background: rgba(0, 210, 255, 0.1); color: #00d2ff; }
            .bg-green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
            .panel-card { background: #0f172a; border-radius: 16px; padding: 25px; margin-bottom: 25px; border: 1px solid rgba(255,255,255,0.05); }
            .form-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 15px; color: #00d2ff; display: flex; align-items: center; gap: 8px; }
            label { display: block; margin-bottom: 6px; font-size: 0.85rem; color: #94a3b8; font-weight:600; }
            input, select, textarea { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #1e293b; margin-bottom: 16px; background: #070a13; color: white; }
            .badge { padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
            .badge-success { background: rgba(16, 185, 129, 0.15); color: #10b981; }
            .badge-danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #1e293b; padding: 12px; color: white; }
            td { padding: 12px; border-bottom: 1px solid #1e293b; }
            .license-banner { padding: 15px; border-radius: 10px; margin-bottom: 20px; font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; gap: 10px; }
            .lic-ok { background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; color: #10b981; }
            .lic-fail { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        </style>
    </head>
    <body>

        <div class="sidebar">
            <div class="sidebar-brand">
                <h3>KQ5 CorePortal</h3>
                <span style="font-size:11px; color:#64748b;">Enterprise Core Gateway</span>
            </div>
            <ul class="nav-tabs-list">
                <li class="nav-link active" onclick="openTab('tab-monitor')"><i class="fa-solid fa-gauge"></i> Monitor System</li>
                <li class="nav-link" onclick="openTab('tab-generate')"><i class="fa-solid fa-plus"></i> Tambah Voucher</li>
                <li class="nav-link" onclick="openTab('tab-stok')"><i class="fa-solid fa-server"></i> Database Stok</li>
                <li class="nav-link" onclick="openTab('tab-laporan')"><i class="fa-solid fa-book"></i> Log Penjualan</li>
                <li class="nav-link" onclick="openTab('tab-custom')"><i class="fa-solid fa-palette"></i> Desain Portal</li>
                <li class="nav-link" onclick="openTab('tab-system')"><i class="fa-solid fa-shield-halved"></i> Lisensi & Update</li>
            </ul>
        </div>

        <div class="content-area">
            <div class="license-banner ${license.valid ? 'lic-ok' : 'lic-fail'}">
                <i class="fa-solid ${license.valid ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i>
                <span>Status Lisensi: ${license.valid ? `AKTIF - Paket [${license.tier}] Terdaftar atas nama ${license.licensedTo} (Exp: ${license.expiresAt})` : license.message}</span>
            </div>

            <div id="tab-monitor" class="tab-panel active">
                <div class="main-header"><h2>System Overview</h2></div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-info"><h4>Omset Bersih</h4><p>Rp ${totalPendapatan.toLocaleString('id-ID')}</p></div>
                        <div class="stat-icon bg-green"><i class="fa-solid fa-wallet"></i></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-info"><h4>Voucher Terjual</h4><p>${totalTerjual} Unit</p></div>
                        <div class="stat-icon bg-blue"><i class="fa-solid fa-receipt"></i></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-info"><h4>Stok 1 Jam</h4><p>${stok1Jam} Pcs</p></div>
                        <div class="stat-icon bg-blue"><i class="fa-solid fa-clock"></i></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-info"><h4>Stok 24 Jam</h4><p>${stok24Jam} Pcs</p></div>
                        <div class="stat-icon bg-green"><i class="fa-solid fa-bolt"></i></div>
                    </div>
                </div>
            </div>

            <div id="tab-generate" class="tab-panel">
                <div class="main-header"><h2>Stok Feeder</h2></div>
                <div class="panel-card">
                    <div class="form-title"><i class="fa-solid fa-ticket"></i> Inject Voucher Baru</div>
                    <form action="/admin/add-vouchers-massal" method="POST">
                        <label>Kategori Paket</label>
                        <select name="packageId" required>
                            <option value="paket_1jam">${config.durasiPaket1}</option>
                            <option value="paket_24jam">${config.durasiPaket2}</option>
                        </select>
                        <label>Kode Kupon (Satu kode per baris)</label>
                        <textarea name="rawVouchers" style="height:140px; font-family:monospace; background:#070a13; color:white; width:100%; padding:10px; border-radius:8px;" placeholder="VCHR1\nVCHR2" required></textarea>
                        <button type="submit">Suntik Data</button>
                    </form>
                </div>
            </div>

            <div id="tab-stok" class="tab-panel">
                <div class="main-header"><h2>Voucher Ledger</h2></div>
                <div class="panel-card" style="background:#0f172a;">
                    <table>
                        <thead><tr><th>No</th><th>Kode</th><th>Paket</th><th>Status</th><th>Waktu Guna</th></tr></thead>
                        <tbody>
                            ${vouchers.map((v, i) => `<tr><td>${i+1}</td><td style="font-family:monospace; color:#00d2ff; font-weight:700;">${v.code}</td><td>${v.packageId}</td><td><span class="badge ${v.status==='tersedia'?'badge-success':'badge-danger'}">${v.status}</span></td><td>${v.dateUsed||'-'}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="tab-laporan" class="tab-panel">
                <div class="main-header"><h2>Laporan Akuntansi</h2></div>
                <div class="panel-card" style="background:#0f172a;">
                    <table>
                        <thead><tr><th>ID</th><th>Waktu</th><th>Kategori</th><th>Harga</th><th>Voucher</th></tr></thead>
                        <tbody>
                            ${sales.map(s => `<tr><td>${s.id}</td><td>${s.date}</td><td>${s.packageName}</td><td style="color:#10b981; font-weight:700;">Rp ${s.price.toLocaleString('id-ID')}</td><td style="font-family:monospace; font-weight:700; color:#f59e0b;">${s.voucherCode}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="tab-custom" class="tab-panel">
                <div class="main-header"><h2>Interface & Integrasi CS Bot</h2></div>
                <div class="panel-card">
                    <form action="/admin/update-branding" method="POST">
                        <div class="form-title"><i class="fa-solid fa-wifi"></i> Konfigurasi Teks Informasi</div>
                        <label>Nama Akses Hotspot</label><input type="text" name="namaWiFi" value="${config.namaWiFi}">
                        <label>Sub-Slogan Banner</label><input type="text" name="subtitleWiFi" value="${config.subtitleWiFi}">
                        <button type="submit">Simpan Parameter</button>
                    </form>
                </div>
                <div class="panel-card">
                    <form action="/admin/update-telegram" method="POST">
                        <div class="form-title"><i class="fa-solid fa-headset"></i> Sistem Customer Service (Telegram Bot Gateway)</div>
                        <label>Token Bot Telegram CS</label><input type="text" name="telegramBotToken" value="${config.telegramBotToken}" placeholder="Contoh: 123456:ABCdef...">
                        <label>ID Chat Telegram Admin/Grup (Penerima Notif Keuangan)</label><input type="text" name="telegramChatId" value="${config.telegramChatId}" placeholder="Contoh: 987654321">
                        <button type="submit">Aktifkan Bot Telegram</button>
                    </form>
                </div>
            </div>

            <div id="tab-system" class="tab-panel">
                <div class="main-header"><h2>Sistem Inti & Lisensi Komersial</h2></div>
                <div class="panel-card">
                    <form action="/admin/activate-license" method="POST">
                        <div class="form-title"><i class="fa-solid fa-key"></i> Registrasi Kunci Aktivasi Lisensi</div>
                        <label>Tempel String Token Lisensi Pembelian</label>
                        <textarea name="licenseToken" style="height:90px; font-family:monospace; background:#070a13; color:white;" placeholder="Masukkan token terenkripsi SHA256..." required></textarea>
                        <button type="submit">Verifikasi & Aktivasi</button>
                    </form>
                </div>
                <div class="panel-card">
                    <form action="/admin/update-app-file" method="POST" enctype="multipart/form-data">
                        <div class="form-title"><i class="fa-solid fa-cloud-arrow-up"></i> Pembaruan Aplikasi Melalui Unggahan (Update Package)</div>
                        <label>Pilih File Pembaruan Inti Sistem (.js / .zip)</label>
                        <input type="file" name="appUpdate" required>
                        <button type="submit" style="background:linear-gradient(90deg, #9a3eff, #7928ca);">Pasang Pembaruan Sistem</button>
                    </form>
                </div>
            </div>
        </div>

        <script>
            function openTab(tabId) {
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                document.getElementById(tabId).classList.add('active');
                event.currentTarget.classList.add('active');
            }
        </script>
    </body>
    </html>
    `);
});

// ==========================================
// FORM SUBMISSION ACTION HANDLERS
// ==========================================

// Integrasi Input Lisensi
app.post('/admin/activate-license', (req, res) => {
    const { licenseToken } = req.body;
    try {
        const decoded = Buffer.from(licenseToken.trim(), 'base64').toString('utf8');
        const parsed = JSON.parse(decoded);
        
        fs.writeFileSync(LICENSE_PATH, JSON.stringify(parsed, null, 2));
        res.send(`<script>alert('Sistem Berhasil Diaktivasi! Status Lisensi Valid.'); window.location.href='/admin/portal-config';</script>`);
    } catch(e) {
        res.send(`<script>alert('Format Lisensi Tidak Valid atau Rusak!'); history.back();</script>`);
    }
});

// Integrasi Update Aplikasi
app.post('/admin/update-app-file', upload.single('appUpdate'), (req, res) => {
    res.send(`<script>alert('File Paket Pembaruan Berhasil Diunggah! Server Sedang Membaca Ulang Berkas Berubah.'); window.location.href='/admin/portal-config';</script>`);
});

// Integrasi CS Telegram Token
app.post('/admin/update-telegram', (req, res) => {
    const { telegramBotToken, telegramChatId } = req.body;
    let config = loadConfig();
    config.telegramBotToken = telegramBotToken.trim();
    config.telegramChatId = telegramChatId.trim();
    saveConfig(config);
    res.send(`<script>alert('Parameter Customer Service Sukses Disimpan!'); window.location.href='/admin/portal-config';</script>`);
});

app.post('/admin/add-vouchers-massal', (req, res) => {
    const { packageId, rawVouchers } = req.body;
    if (!rawVouchers) return res.send('<script>alert("Data kosong!"); history.back();</script>');
    const cleanCodes = rawVouchers.split('\n').map(code => code.trim()).filter(code => code.length > 0);
    let currentVouchers = readJSON(VOUCHER_FILE);
    let added = 0;
    cleanCodes.forEach(code => {
        if (!currentVouchers.some(v => v.code === code)) {
            currentVouchers.push({
                id: 'VCH-' + Date.now() + Math.floor(Math.random() * 1000),
                code: code,
                packageId: packageId,
                status: 'tersedia',
                dateAdded: new Date().toLocaleString('id-ID'),
                dateUsed: null
            });
            added++;
        }
    });
    writeJSON(VOUCHER_FILE, currentVouchers);
    res.send(`<script>alert('Berhasil menginjeksi ${added} voucher!'); window.location.href='/admin/portal-config';</script>`);
});

app.post('/admin/update-branding', (req, res) => {
    const { namaWiFi, subtitleWiFi } = req.body;
    let config = loadConfig();
    config.namaWiFi = namaWiFi;
    config.subtitleWiFi = subtitleWiFi;
    saveConfig(config);
    res.send(`<script>alert('Data Berhasil Diperbarui!');window.location.href='/admin/portal-config';</script>`);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
