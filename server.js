const express = require('express');
const midtransClient = require('midtrans-client');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// Serve public files under /static for admin preview (logo, etc.)
app.use('/static', express.static(path.join(__dirname, 'public')));

// Inisialisasi Midtrans Snap Client
let snap = new midtransClient.Snap({
    isProduction: process.env.NODE_ENV === 'production',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// === CONFIG & DATABASE STORAGE ===
const CONFIG_PATH = path.join(__dirname, 'config.json');
const VOUCHER_FILE = path.join(__dirname, 'vouchers.json');
const SALES_FILE = path.join(__dirname, 'sales.json');

const defaultConfig = {
    passwordAdmin: "kq5digital#2026",
    namaWiFi: "KQ5 DIGITAL",
    subtitleWiFi: "WiFi Premium Cepat & Stabil",
    hargaPaket1: "Rp 3.000",
    durasiPaket1: "Paket Ekstra 1 Jam",
    hargaPaket2: "Rp 15.000",
    durasiPaket2: "Paket Puas 24 Jam"
};

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
        return { ...defaultConfig };
    }
    try {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
        return { ...defaultConfig, ...JSON.parse(raw) };
    } catch (e) {
        return { ...defaultConfig };
    }
}

function saveConfig(newConfig) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
}

// Fungsi pembantu untuk membaca data JSON Voucher & Sales secara aman
function readJSON(filePath) {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        return [];
    }
}

// Fungsi pembantu untuk menulis data JSON
function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Pengaturan penyimpanan file logo menggunakan multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public'));
    },
    filename: function (req, file, cb) {
        cb(null, 'logo.png');
    }
});
const upload = multer({ storage: storage });


// ==========================================
// API ENDPOINTS (UNTUK KLIEN / PORTAL)
// ==========================================

// Endpoint untuk membuat transaksi pembayaran
app.post('/api/pay', async (req, res) => {
    try {
        const { packageId } = req.body;
        let config = loadConfig();
        let price = 0;
        if (packageId === 'paket_1jam') price = parseInt((config.hargaPaket1||'').replace(/\D/g, '')) || 3000;
        if (packageId === 'paket_24jam') price = parseInt((config.hargaPaket2||'').replace(/\D/g, '')) || 15000;

        const orderId = `WIFI-${Date.now()}`;
        let parameter = {
            "transaction_details": {
                "order_id": orderId,
                "gross_amount": price
            },
            "credit_card": { "secure": true },
            "customer_details": { "first_name": "Pelanggan WiFi" }
        };

        const transaction = await snap.createTransaction(parameter);
        res.json({ token: transaction.token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint Pembagian Voucher Otomatis Berbasis File Database (Mikhmon Style)
app.get('/api/get-voucher/:packageId', (req, res) => {
    const { packageId } = req.params;
    let vouchers = readJSON(VOUCHER_FILE);
    let sales = readJSON(SALES_FILE);
    let config = loadConfig();

    // Cari voucher teratas yang berstatus "tersedia" sesuai paket
    const voucherIndex = vouchers.findIndex(v => v.packageId === packageId && v.status === 'tersedia');

    if (voucherIndex === -1) {
        return res.status(404).json({ success: false, message: "Maaf, stok voucher habis! Silakan hubungi admin kasir." });
    }

    const selectedVoucher = vouchers[voucherIndex];
    
    // Update status voucher menjadi terpakai
    vouchers[voucherIndex].status = 'terpakai';
    vouchers[voucherIndex].dateUsed = new Date().toLocaleString('id-ID');

    // Tentukan harga berdasarkan config data saat ini
    let price = 0;
    if (packageId === 'paket_1jam') price = parseInt((config.hargaPaket1||'').replace(/\D/g, '')) || 3000;
    if (packageId === 'paket_24jam') price = parseInt((config.hargaPaket2||'').replace(/\D/g, '')) || 15000;

    // Masukkan data ke laporan penjualan log transaksi
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

    res.json({ success: true, code: selectedVoucher.code });
});

// API ENDPOINT: Portal Settings (tanpa password)
app.get('/api/portal-settings', (req, res) => {
    const config = loadConfig();
    const { passwordAdmin, ...safeConfig } = config;
    res.json(safeConfig);
});


// ==========================================
// ADMIN DASHBOARD & MANAGEMENT (MIKHMON UI)
// ==========================================

app.get('/admin/portal-config', (req, res) => {
    const config = loadConfig();
    const vouchers = readJSON(VOUCHER_FILE);
    const sales = readJSON(SALES_FILE);

    // Hitung data monitor statistik
    const stok1Jam = vouchers.filter(v => v.packageId === 'paket_1jam' && v.status === 'tersedia').length;
    const stok24Jam = vouchers.filter(v => v.packageId === 'paket_24jam' && v.status === 'tersedia').length;
    const totalTerjual = sales.length;
    const totalPendapatan = sales.reduce((acc, curr) => acc + curr.price, 0);

    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>KQ5 DIGITAL - Mikhmon Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { background: #0f172a; color: #e2e8f0; font-family: 'Segoe UI', Tahoma, sans-serif; display: flex; min-height: 100vh; }
            
            /* Sidebar Navigation */
            .sidebar { width: 240px; background: #1e293b; padding: 20px 10px; box-shadow: 2px 0 10px rgba(0,0,0,0.2); }
            .sidebar-brand { text-align: center; margin-bottom: 30px; padding: 10px; border-bottom: 1px solid #334155; }
            .sidebar-brand h3 { font-size: 1.3rem; color: #38bdf8; font-weight: 800; }
            .nav-tabs-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
            .nav-link { display: flex; align-items: center; gap: 12px; padding: 12px 16px; color: #94a3b8; text-decoration: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
            .nav-link:hover, .nav-link.active { background: linear-gradient(90deg, #00d2ff, #9a3eff); color: white; }

            /* Main Content Workspace */
            .content-area { flex: 1; padding: 30px 24px; overflow-y: auto; }
            .tab-panel { display: none; }
            .tab-panel.active { display: block; animation: fadeIn 0.4s ease; }
            
            /* Header Section */
            .main-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #334155; }
            .main-header h2 { font-size: 1.6rem; font-weight: 700; color: white; }

            /* Grid Cards Statistics */
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .stat-card { background: #1e293b; padding: 20px; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; border: 1px solid rgba(255,255,255,0.03); }
            .stat-info h4 { font-size: 0.85rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px; }
            .stat-info p { font-size: 1.5rem; font-weight: 800; color: white; }
            .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
            .bg-blue { background: rgba(56, 189, 248, 0.1); color: #38bdf8; }
            .bg-green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
            .bg-purple { background: rgba(154, 62, 255, 0.1); color: #9a3eff; }
            .bg-orange { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

            /* Form & UI Styling */
            .panel-card { background: #1e293b; border-radius: 14px; padding: 24px; margin-bottom: 25px; border: 1px solid rgba(255,255,255,0.03); }
            .form-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 15px; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
            label { display: block; margin-bottom: 6px; font-size: 0.9rem; font-weight: 600; color: #cbd5e1; }
            input[type="text"], input[type="password"], select, textarea { width: 100%; padding: 11px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 16px; background: #0f172a; color: white; font-size: 0.95rem; }
            input:focus, select:focus, textarea:focus { outline: none; border-color: #38bdf8; }
            textarea { resize: vertical; min-height: 120px; font-family: monospace; }
            button { background: linear-gradient(90deg, #00d2ff, #9a3eff); color: white; border: none; padding: 11px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: filter 0.2s; }
            button:hover { filter: brightness(1.1); }
            
            /* Data Tables Layout */
            .table-responsive { width: 100%; overflow-x: auto; background: #1e293b; border-radius: 12px; }
            table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
            th { background: #334155; padding: 12px 16px; color: white; font-weight: 600; }
            td { padding: 12px 16px; border-bottom: 1px solid #334155; color: #cbd5e0; }
            tr:hover td { background: rgba(255,255,255,0.02); }
            .badge { padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
            .badge-success { background: rgba(16, 185, 129, 0.15); color: #10b981; }
            .badge-danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
            .logo-preview { display: block; margin: 15px 0; width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 2px solid #00d2ff; }

            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @media(max-width: 768px) { body { flex-direction: column; } .sidebar { width: 100%; } }
        </style>
    </head>
    <body>

        <div class="sidebar">
            <div class="sidebar-brand">
                <h3>Mikhmon Portal</h3>
                <span style="font-size:11px; color:#64748b;">v1.0.0 &copy; KQ5 DIGITAL</span>
            </div>
            <ul class="nav-tabs-list">
                <li class="nav-link active" onclick="openTab('tab-monitor')"><i class="fa-solid fa-chart-line"></i> Monitor Panel</li>
                <li class="nav-link" onclick="openTab('tab-generate')"><i class="fa-solid fa-ticket"></i> Tambah Voucher</li>
                <li class="nav-link" onclick="openTab('tab-stok')"><i class="fa-solid fa-database"></i> Stok Voucher</li>
                <li class="nav-link" onclick="openTab('tab-laporan')"><i class="fa-solid fa-wallet"></i> Log Penjualan</li>
                <li class="nav-link" onclick="openTab('tab-pengaturan')"><i class="fa-solid fa-sliders"></i> Seting Tampilan</li>
            </ul>
        </div>

        <div class="content-area">
            
            <div id="tab-monitor" class="tab-panel active">
                <div class="main-header"><h2>Overview Monitor</h2></div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-info"><h4>Total Pendapatan</h4><p>Rp ${totalPendapatan.toLocaleString('id-ID')}</p></div>
                        <div class="stat-icon bg-green"><i class="fa-solid fa-money-bill-wave"></i></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-info"><h4>Voucher Terjual</h4><p>${totalTerjual} Pcs</p></div>
                        <div class="stat-icon bg-purple"><i class="fa-solid fa-cart-shopping"></i></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-info"><h4>Stok Paket 1 Jam</h4><p>${stok1Jam} Pcs</p></div>
                        <div class="stat-icon bg-blue"><i class="fa-solid fa-clock"></i></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-info"><h4>Stok Paket 24 Jam</h4><p>${stok24Jam} Pcs</p></div>
                        <div class="stat-icon bg-orange"><i class="fa-solid fa-calendar-day"></i></div>
                    </div>
                </div>
            </div>

            <div id="tab-generate" class="tab-panel">
                <div class="main-header"><h2>Manajemen Voucher</h2></div>
                <div class="panel-card">
                    <div class="form-title"><i class="fa-solid fa-plus-circle"></i> Input Voucher Massal dari Ruijie Cloud</div>
                    <form action="/admin/add-vouchers-massal" method="POST">
                        <label>Pilih Kategori Paket WiFi</label>
                        <select name="packageId" required>
                            <option value="paket_1jam">${config.durasiPaket1} (${config.hargaPaket1})</option>
                            <option value="paket_24jam">${config.durasiPaket2} (${config.hargaPaket2})</option>
                        </select>
                        <label>Tempel Kode Voucher (Pisahkan per baris dengan Enter)</label>
                        <textarea name="rawVouchers" placeholder="Contoh masukan:\nABCDE1\nFGHIJ2\nKLMNO3" required></textarea>
                        <button type="submit"><i class="fa-solid fa-save"></i> Simpan Stok Voucher</button>
                    </form>
                </div>
            </div>

            <div id="tab-stok" class="tab-panel">
                <div class="main-header"><h2>Daftar Database Voucher</h2></div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Kode Voucher</th>
                                <th>Kategori Paket</th>
                                <th>Status</th>
                                <th>Tanggal Digunakan</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${vouchers.length === 0 ? '<tr><td colspan="5" style="text-align:center;">Belum ada voucher yang di-input.</td></tr>' : 
                            vouchers.map((v, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td style="font-family:monospace; font-weight:700; color:#38bdf8;">${v.code}</td>
                                    <td>${v.packageId === 'paket_1jam' ? config.durasiPaket1 : config.durasiPaket2}</td>
                                    <td><span class="badge ${v.status === 'tersedia' ? 'badge-success' : 'badge-danger'}">${v.status.toUpperCase()}</span></td>
                                    <td>${v.dateUsed || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="tab-laporan" class="tab-panel">
                <div class="main-header"><h2>Riwayat Transaksi Penjualan</h2></div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>ID Transaksi</th>
                                <th>Tanggal Masuk</th>
                                <th>Paket Terjual</th>
                                <th>Nominal Bersih</th>
                                <th>Kode Voucher Dikirim</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sales.length === 0 ? '<tr><td colspan="5" style="text-align:center;">Belum ada transaksi penjualan masuk.</td></tr>' : 
                            sales.map(s => `
                                <tr>
                                    <td>${s.id}</td>
                                    <td>${s.date}</td>
                                    <td>${s.packageName}</td>
                                    <td style="color:#10b981; font-weight:700;">Rp ${s.price.toLocaleString('id-ID')}</td>
                                    <td style="font-family:monospace; font-weight:700; color:#f59e0b;">${s.voucherCode}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="tab-pengaturan" class="tab-panel">
                <div class="main-header"><h2>Konfigurasi Tampilan Portal & Keamanan</h2></div>
                
                <div class="panel-card">
                    <form action="/admin/update-password" method="POST" autocomplete="off">
                        <div class="form-title">Keamanan: Ubah Password Admin</div>
                        <label>Password Lama</label><input type="password" name="oldPassword" required>
                        <label>Password Baru</label><input type="password" name="newPassword" required>
                        <button type="submit">Update Password</button>
                    </form>
                </div>

                <div class="panel-card">
                    <form action="/admin/update-branding" method="POST">
                        <div class="form-title">Branding Portal</div>
                        <label>Nama WiFi</label><input type="text" name="namaWiFi" value="${config.namaWiFi||''}" required>
                        <label>Subtitle WiFi</label><input type="text" name="subtitleWiFi" value="${config.subtitleWiFi||''}" required>
                        <button type="submit">Update Branding</button>
                    </form>
                </div>

                <div class="panel-card">
                    <form action="/admin/update-packages" method="POST">
                        <div class="form-title">Paket Internet</div>
                        <label>Nama Paket 1</label><input type="text" name="durasiPaket1" value="${config.durasiPaket1||''}" required>
                        <label>Harga Paket 1</label><input type="text" name="hargaPaket1" value="${config.hargaPaket1||''}" required>
                        <label>Nama Paket 2</label><input type="text" name="durasiPaket2" value="${config.durasiPaket2||''}" required>
                        <label>Harga Paket 2</label><input type="text" name="hargaPaket2" value="${config.hargaPaket2||''}" required>
                        <button type="submit">Update Paket</button>
                    </form>
                </div>

                <div class="panel-card">
                    <form action="/admin/upload-logo" method="POST" enctype="multipart/form-data">
                        <div class="form-title">Logo Portal</div>
                        <input type="file" name="logo" accept="image/png, image/jpeg" required>
                        <img src="/static/logo.png" class="logo-preview" onerror="this.src='https://placehold.co/90x90?text=No+Logo'">
                        <button type="submit">Upload Logo</button>
                    </form>
                </div>
            </div>

        </div>

        <script>
            // Fungsi Pengendali Mekanisme Tab Navigasi Mikhmon
            function openTab(tabId) {
                // Nonaktifkan semua panel tab
                document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
                // Nonaktifkan semua link menu navigasi
                document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
                
                // Aktifkan tab panel & tombol menu yang sedang di-klik
                document.getElementById(tabId).classList.add('active');
                event.currentTarget.classList.add('active');
            }
        </script>
    </body>
    </html>
    `);
});


// ==========================================
// POST HANDLERS (KONFIGURASI LAMA AMAN)
// ==========================================

// 1. API: INPUT VOUCHER MASSAL DARI ADMIN PANEL
app.post('/admin/add-vouchers-massal', (req, res) => {
    const { packageId, rawVouchers } = req.body;
    if (!rawVouchers) return res.send('<script>alert("Data tidak boleh kosong!"); history.back();</script>');

    const cleanCodes = rawVouchers.split('\n').map(code => code.trim()).filter(code => code.length > 0);
    let currentVouchers = readJSON(VOUCHER_FILE);

    let countAdded = 0;
    cleanCodes.forEach(code => {
        const isExist = currentVouchers.some(v => v.code === code);
        if (!isExist) {
            currentVouchers.push({
                id: 'VCH-' + Date.now() + Math.floor(Math.random() * 1000),
                code: code,
                packageId: packageId,
                status: 'get_voucher' ? 'tersedia' : 'terpakai',
                status: 'tersedia',
                dateAdded: new Date().toLocaleString('id-ID'),
                dateUsed: null
            });
            countAdded++;
        }
    });

    writeJSON(VOUCHER_FILE, currentVouchers);
    res.send(`<script>alert('Berhasil menambahkan ${countAdded} voucher baru!');window.location.href='/admin/portal-config';</script>`);
});

// 2. Update Password
app.post('/admin/update-password', (req, res) => {
    const { oldPassword, newPassword } = req.body;
    let config = loadConfig();
    if (oldPassword !== config.passwordAdmin) {
        return res.send(`<script>alert('Password lama salah!');window.location.href='/admin/portal-config';</script>`);
    }
    config.passwordAdmin = newPassword;
    saveConfig(config);
    res.send(`<script>alert('Data Berhasil Diperbarui!');window.location.href='/admin/portal-config';</script>`);
});

// 3. Update Branding
app.post('/admin/update-branding', (req, res) => {
    const { namaWiFi, subtitleWiFi } = req.body;
    let config = loadConfig();
    config.namaWiFi = namaWiFi;
    config.subtitleWiFi = subtitleWiFi;
    saveConfig(config);
    res.send(`<script>alert('Data Berhasil Diperbarui!');window.location.href='/admin/portal-config';</script>`);
});

// 4. Update Packages
app.post('/admin/update-packages', (req, res) => {
    const { durasiPaket1, hargaPaket1, durasiPaket2, hargaPaket2 } = req.body;
    let config = loadConfig();
    config.durasiPaket1 = durasiPaket1;
    config.hargaPaket1 = hargaPaket1;
    config.durasiPaket2 = durasiPaket2;
    config.hargaPaket2 = hargaPaket2;
    saveConfig(config);
    res.send(`<script>alert('Data Berhasil Diperbarui!');window.location.href='/admin/portal-config';</script>`);
});

// 5. Upload Logo
app.post('/admin/upload-logo', upload.single('logo'), (req, res) => {
    res.send(`<script>alert('Data Berhasil Diperbarui!');window.location.href='/admin/portal-config';</script>`);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));