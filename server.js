const express = require('express');
const midtransClient = require('midtrans-client');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Inisialisasi Midtrans Snap Client
let snap = new midtransClient.Snap({
    isProduction: process.env.NODE_ENV === 'production',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// VOUCHER POOL: Masukkan kode voucher dari Ruijie Cloud di sini
const voucherPool = {
    "paket_1jam": ["VCHR1H01", "VCHR1H02", "VCHR1H03"], 
    "paket_24jam": ["VCHR24H01", "VCHR24H02", "VCHR24H03"]
};

// Endpoint untuk membuat transaksi pembayaran
app.post('/api/pay', async (req, res) => {
    try {
        const { packageId } = req.body;
        
        let price = 0;
        if (packageId === 'paket_1jam') price = 3000;      // Rp 3.000
        if (packageId === 'paket_24jam') price = 15000;    // Rp 15.000

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
        const voucherCode = pool.shift(); // Mengambil kode paling atas (FIFO)
        res.json({ success: true, code: voucherCode });
    } else {
        res.json({ success: false, message: "Maaf, stok voucher habis!" });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));