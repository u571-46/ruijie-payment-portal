# Copilot instructions — ruijie-payment-portal

Singkat: proyek ini adalah aplikasi Node.js/Express kecil untuk penerbitan voucher WiFi menggunakan Midtrans (Snap).

Panduan cepat untuk agen AI:

- Baca terlebih dahulu [AGENTS.md](../AGENTS.md) — itu adalah panduan kanonik untuk agen.
- Jalankan pengembangan: `npm install` lalu `npm start`.
- Environment penting: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `PORT`.

Hal penting:

- Pertahankan nama rute yang ada: `/api/pay`, `/api/get-voucher/:packageId`, `/admin/portal-config`, `/admin/upload-logo`.
- `voucherPool` di [server.js](../server.js) adalah penyimpanan in-memory (FIFO). Jangan memperkenalkan persistence tanpa diskusi.
- Admin routes tidak diautentikasi — berhati-hati terhadap perubahan yang mengekspos data atau file upload.

Lokasi skill ringan: `.github/skills/` — gunakan file SKILL.md kecil untuk tugas yang sering diotomasi.

Jika perlu perubahan non-trivial (persistence, otentikasi, integrasi pembayaran baru), tanyakan pemilik repo sebelum menerapkan.
