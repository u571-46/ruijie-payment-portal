
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


// === CONFIG STORAGE ===
const CONFIG_PATH = path.join(__dirname, 'config.json');
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

// VOUCHER POOL: Masukkan kode voucher dari Ruijie Cloud di sini
const voucherPool = {
        "paket_1jam": ["VCHR1H01", "VCHR1H02", "VCHR1H03"], 
        "paket_24jam": ["VCHR24H01", "VCHR24H02", "VCHR24H03"]
};

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


// Endpoint untuk mengambil voucher setelah transaksi sukses
app.get('/api/get-voucher/:packageId', (req, res) => {
    const { packageId } = req.params;
    const pool = voucherPool[packageId];
    if (pool && pool.length > 0) {
        const voucherCode = pool.shift(); // FIFO
        res.json({ success: true, code: voucherCode });
    } else {
        res.json({ success: false, message: "Maaf, stok voucher habis!" });
    }
});

// === API ENDPOINT: Portal Settings (tanpa password) ===
app.get('/api/portal-settings', (req, res) => {
    const config = loadConfig();
    const { passwordAdmin, ...safeConfig } = config;
    res.json(safeConfig);
});


// === ADMIN: Halaman konfigurasi portal (DASHBOARD) ===
app.get('/admin/portal-config', (req, res) => {
    const config = loadConfig();
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>KQ5 DIGITAL - Admin Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { background: #0f172a; color: #e2e8f0; font-family: 'Segoe UI',sans-serif; margin:0; padding:0; }
            .dashboard { max-width: 520px; margin: 40px auto; background: #1e293b; border-radius: 18px; box-shadow: 0 8px 32px rgba(0,0,0,0.25); padding: 32px 24px; }
            h2 { text-align:center; font-size: 2rem; font-weight: 800; margin-bottom: 18px; background: linear-gradient(90deg,#00d2ff,#9a3eff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            form { margin-bottom: 28px; background: #273043; border-radius: 12px; padding: 18px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
            label { display:block; margin-bottom: 7px; font-weight: 600; color: #a5b4fc; }
            input[type="text"], input[type="password"] { width:100%; padding:10px; border-radius:7px; border:none; margin-bottom:14px; background:#0f172a; color:#e2e8f0; font-size:1rem; }
            button { background: linear-gradient(90deg,#00d2ff,#9a3eff); color:white; border:none; padding:10px 22px; border-radius:7px; font-weight:700; cursor:pointer; transition:filter .2s; }
            button:hover { filter: brightness(1.1); }
            .form-title { font-size:1.1rem; font-weight:700; margin-bottom:10px; color:#38bdf8; }
            .logo-preview { display:block; margin:12px auto 0 auto; width:90px; height:90px; border-radius:50%; object-fit:cover; border:2px solid #00d2ff; background:#22223b; }
            .divider { height:1px; background:#334155; margin:24px 0; border:none; }
        </style>
    </head>
    <body>
        <div class="dashboard">
            <h2>Admin Dashboard<br>KQ5 DIGITAL</h2>

            <!-- FORM 1: Keamanan -->
            <form action="/admin/update-password" method="POST" autocomplete="off">
                <div class="form-title">Keamanan: Ubah Password Admin</div>
                <label>Password Lama</label>
                <input type="password" name="oldPassword" required>
                <label>Password Baru</label>
                <input type="password" name="newPassword" required>
                <button type="submit">Update Password</button>
            </form>

            <!-- FORM 2: Branding -->
            <form action="/admin/update-branding" method="POST">
                <div class="form-title">Branding Portal</div>
                <label>Nama WiFi</label>
                <input type="text" name="namaWiFi" value="${config.namaWiFi||''}" required>
                <label>Subtitle WiFi</label>
                <input type="text" name="subtitleWiFi" value="${config.subtitleWiFi||''}" required>
                <button type="submit">Update Branding</button>
            </form>

            <!-- FORM 3: Paket Internet -->
            <form action="/admin/update-packages" method="POST">
                <div class="form-title">Paket Internet</div>
                <label>Nama Paket 1</label>
                <input type="text" name="durasiPaket1" value="${config.durasiPaket1||''}" required>
                <label>Harga Paket 1</label>
                <input type="text" name="hargaPaket1" value="${config.hargaPaket1||''}" required>
                <label>Nama Paket 2</label>
                <input type="text" name="durasiPaket2" value="${config.durasiPaket2||''}" required>
                <label>Harga Paket 2</label>
                <input type="text" name="hargaPaket2" value="${config.hargaPaket2||''}" required>
                <button type="submit">Update Paket</button>
            </form>

            <!-- FORM 4: Logo -->
            <form action="/admin/upload-logo" method="POST" enctype="multipart/form-data">
                <div class="form-title">Logo Portal</div>
                <input type="file" name="logo" accept="image/png, image/jpeg" required>
                <img src="/static/logo.png" class="logo-preview" onerror="this.src='https://placehold.co/90x90?text=No+Logo'">
                <button type="submit">Upload Logo</button>
            </form>
        </div>
    </body>
    </html>
    `);
});


// === POST HANDLERS ===
// 1. Update Password
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

// 2. Update Branding
app.post('/admin/update-branding', (req, res) => {
    const { namaWiFi, subtitleWiFi } = req.body;
    let config = loadConfig();
    config.namaWiFi = namaWiFi;
    config.subtitleWiFi = subtitleWiFi;
    saveConfig(config);
    res.send(`<script>alert('Data Berhasil Diperbarui!');window.location.href='/admin/portal-config';</script>`);
});

// 3. Update Packages
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

// 4. Upload Logo
app.post('/admin/upload-logo', upload.single('logo'), (req, res) => {
    res.send(`<script>alert('Data Berhasil Diperbarui!');window.location.href='/admin/portal-config';</script>`);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));