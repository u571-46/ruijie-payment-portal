const express = require('express');
const midtransClient = require('midtrans-client');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/static', express.static(path.join(__dirname, 'public')));

const VOUCHERS_FILE = path.join(__dirname, 'vouchers.json');
const SALES_FILE = path.join(__dirname, 'sales.json');

// Initialize JSON files if not exist
if (!fs.existsSync(VOUCHERS_FILE)) fs.writeFileSync(VOUCHERS_FILE, '[]');
if (!fs.existsSync(SALES_FILE)) fs.writeFileSync(SALES_FILE, '[]');

function loadJSON(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Midtrans Snap Client
let snap = new midtransClient.Snap({
    isProduction: process.env.NODE_ENV === 'production',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// API: Get Voucher
app.get('/api/get-voucher/:packageId', (req, res) => {
    const { packageId } = req.params;
    const vouchers = loadJSON(VOUCHERS_FILE);
    const availableVoucher = vouchers.find(v => v.packageId === packageId && v.status === 'tersedia');

    if (availableVoucher) {
        availableVoucher.status = 'terpakai';
        availableVoucher.dateUsed = new Date().toISOString();
        saveJSON(VOUCHERS_FILE, vouchers);

        const sales = loadJSON(SALES_FILE);
        sales.push({
            id: uuidv4(),
            packageId,
            price: packageId === 'paket_1jam' ? 3000 : 15000,
            voucherCode: availableVoucher.code,
            status: 'success',
            date: new Date().toISOString()
        });
        saveJSON(SALES_FILE, sales);

        res.json({ success: true, code: availableVoucher.code });
    } else {
        res.json({ success: false, message: 'Stok voucher habis, hubungi admin!' });
    }
});

// Admin Dashboard
app.get('/admin/portal-config', (req, res) => {
    const vouchers = loadJSON(VOUCHERS_FILE);
    const sales = loadJSON(SALES_FILE);

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.price, 0);
    const available1Hour = vouchers.filter(v => v.packageId === 'paket_1jam' && v.status === 'tersedia').length;
    const available24Hour = vouchers.filter(v => v.packageId === 'paket_24jam' && v.status === 'tersedia').length;
    const totalSold = sales.length;

    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>Admin Dashboard</title>
        <style>
            body { background: #0f172a; color: #e2e8f0; font-family: Arial, sans-serif; margin: 0; padding: 0; }
            .container { max-width: 960px; margin: 20px auto; padding: 20px; background: #1e293b; border-radius: 8px; }
            .tabs { display: flex; justify-content: space-around; margin-bottom: 20px; }
            .tab { padding: 10px 20px; cursor: pointer; background: #334155; color: #e2e8f0; border-radius: 5px; }
            .tab:hover { background: #475569; }
            .tab.active { background: #64748b; }
            .content { display: none; }
            .content.active { display: block; }
        </style>
        <script>
            function showTab(tabId) {
                document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
                document.querySelector('#' + tabId).classList.add('active');
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelector('[data-tab="' + tabId + '"]').classList.add('active');
            }
        </script>
    </head>
    <body>
        <div class="container">
            <div class="tabs">
                <div class="tab active" data-tab="dashboard" onclick="showTab('dashboard')">Dashboard Monitor</div>
                <div class="tab" data-tab="add-vouchers" onclick="showTab('add-vouchers')">Input Voucher Massal</div>
                <div class="tab" data-tab="voucher-stock" onclick="showTab('voucher-stock')">Data Stok Voucher</div>
                <div class="tab" data-tab="sales-log" onclick="showTab('sales-log')">Laporan Penjualan</div>
            </div>

            <div id="dashboard" class="content active">
                <h2>Dashboard Monitor</h2>
                <p>Total Pendapatan: Rp ${totalRevenue}</p>
                <p>Sisa Stok Paket 1 Jam: ${available1Hour}</p>
                <p>Sisa Stok Paket 24 Jam: ${available24Hour}</p>
                <p>Total Voucher Terjual: ${totalSold}</p>
            </div>

            <div id="add-vouchers" class="content">
                <h2>Input Voucher Massal</h2>
                <form action="/admin/add-vouchers" method="POST">
                    <label for="packageId">Pilih Paket:</label>
                    <select name="packageId" id="packageId">
                        <option value="paket_1jam">Paket 1 Jam</option>
                        <option value="paket_24jam">Paket 24 Jam</option>
                    </select>
                    <br>
                    <label for="vouchers">Masukkan Kode Voucher (pisahkan dengan baris baru):</label>
                    <textarea name="vouchers" id="vouchers" rows="10" cols="50"></textarea>
                    <br>
                    <button type="submit">Tambah Voucher</button>
                </form>
            </div>

            <div id="voucher-stock" class="content">
                <h2>Data Stok Voucher</h2>
                <p>Fitur ini akan menampilkan tabel stok voucher.</p>
            </div>

            <div id="sales-log" class="content">
                <h2>Laporan Penjualan</h2>
                <p>Fitur ini akan menampilkan tabel laporan penjualan.</p>
            </div>
        </div>
    </body>
    </html>
    `);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

