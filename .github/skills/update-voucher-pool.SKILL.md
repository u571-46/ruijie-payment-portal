# Skill: update-voucher-pool

Tujuan: membantu maintainer menambah/rotasi kode voucher di `voucherPool` di `server.js` dengan cara yang aman dan terstruktur.

Kapan dipakai:
- Operator menyediakan daftar kode baru untuk paket tertentu.

Langkah singkat:
1. Buka [server.js](../../server.js) dan cari deklarasi `voucherPool` di bagian atas file.
2. Validasi format kode (string, unik, tanpa karakter aneh). Jangan commit data sensitif.
3. Tambahkan kode baru ke array paket yang sesuai. Untuk menjaga FIFO (server memakai `shift()`), tambahkan di akhir array (append).
4. Jalankan `npm start` lalu uji alur pembelian di UI (`public/index.html`) untuk memastikan pengambilan voucher berhasil.
5. Jika jumlah kode besar, sarankan pemilik repo mempertimbangkan penyimpanan eksternal atau file terpisah — diskusikan sebelum mengubah arsitektur.

Output yang diharapkan: commit kecil atau PR berisi perubahan `voucherPool` dan catatan singkat (why/how).
