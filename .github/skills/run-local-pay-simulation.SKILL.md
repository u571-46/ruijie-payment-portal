# Skill: run-local-pay-simulation

Tujuan: menjalankan simulasi pembayaran lokal (sandbox/mocked) agar agen atau maintainer dapat menguji alur tanpa menyentuh produksi.

Opsi A — Gunakan Midtrans Sandbox:
1. Set environment variables sandbox (contoh): `MIDTRANS_SERVER_KEY=your-sandbox-server-key MIDTRANS_CLIENT_KEY=your-sandbox-client-key`.
2. Jalankan `npm start` dan buka UI, lakukan pembelian; Midtrans sandbox akan memberikan token/flow sandbox.

Opsi B — Mock server-side snap.createTransaction:
1. Untuk pengujian cepat tanpa koneksi eksternal, buat file kecil `scripts/mock-snap.js` yang meng-overwrite `snap.createTransaction` untuk mengembalikan objek { token: 'FAKE_TOKEN' }.
2. Jalankan aplikasi dalam mode dev menggunakan mock tersebut, lalu panggil UI untuk memicu alur pembayaran ter-handle oleh mock.

Catatan: jangan commit kredensial nyata. Untuk pengujian otomatis, jalankan headless browser (Puppeteer) terhadap `public/index.html`.
