# 🌐 Panduan Pembuatan Captive Portal Hotspot di GitHub & Ruijie

Dokumentasi ini berisi rangkuman percakapan langkah demi langkah mengenai pembuatan captive portal, integrasi payment gateway (Midtrans), dan konfigurasi router Ruijie.

---

## 📑 Daftar Isi
1. [Cara 1: Mengambil & Modifikasi Template dari GitHub](#cara-1-mengambil--modifikasi-template-dari-github)
2. [Cara 2: Menghosting Captive Portal di GitHub Pages (External Login)](#cara-2-menghosting-captive-portal-di-github-pages-external-login)
3. [Integrasi Ruijie dengan Midtrans (Payment Gateway)](#integrasi-ruijie-dengan-midtrans-payment-gateway)
4. [Edukasi Mengenai Mikhmon di GitHub & Cloud Hosting](#edukasi-mengenai-mikhmon-di-github--cloud-hosting)
5. [Tutorial Detail: Hotspot Otomatis Ruijie EG105GW(T) Berbasis Voucher Pool](#tutorial-detail-hotspot-otomatis-ruijie-eg105gwt-berbasis-voucher-pool)
6. [Opsi Platform Cloud Gratis Selain Koyeb](#opsi-platform-cloud-gratis-selain-koyeb)

---

## 🛠 Cara 1: Mengambil & Modifikasi Template dari GitHub
*Paling sering digunakan untuk mencari desain tampilan login hotspot yang responsif (bagus di HP dan laptop) untuk dimasukkan ke router.*

### 📥 Langkah 1: Cari Template di GitHub
1. Buka [github.com](https://github.com).
2. Di kolom pencarian, ketik kata kunci seperti: `mikrotik hotspot template` atau `captive portal login page responsive`.
3. Pilih salah satu repository yang desainnya Anda sukai.
4. Klik tombol **Code** (warna hijau) lalu pilih **Download ZIP**.

### ✏️ Langkah 2: Edit & Modifikasi Halaman Login
1. Ekstrak file ZIP yang sudah di-download.
2. Cari file bernama `login.html`. Klik kanan, lalu buka menggunakan teks editor (seperti Notepad++, VS Code, atau Notepad).
3. Ubah teks di dalamnya, misalnya:
   * **Ganti nama WiFi:** Cari teks *Nama WiFi Anda* dan ubah sesuai keinginan.
   * **Ganti Logo:** Cari tag `<img>`, lalu ganti file `logo.png` di folder gambar dengan logo WiFi Anda sendiri.
4. Simpan (**Save**) perubahan tersebut.

### 📤 Langkah 3: Upload ke Router (Contoh: MikroTik)
1. Buka aplikasi **Winbox** dan hubungkan ke MikroTik Anda.
2. Masuk ke menu **Files**.
3. Cari folder bernama `hotspot` di MikroTik.
4. *Drag and drop* (seret dan lepas) seluruh file template yang sudah Anda edit tadi dari komputer ke dalam folder `hotspot` di Winbox.

---

## 🚀 Cara 2: Menghosting Captive Portal di GitHub Pages (External Login)
*Digunakan jika Anda ingin halaman login tersebut di-host secara online di server GitHub.*

> ⚠️ **Catatan Penting:** Router Anda (seperti MikroTik atau OpenWrt) harus dikonfigurasi agar mengizinkan akses (**Walled Garden**) ke server GitHub, dan diarahkan (*redirect*) ke URL GitHub Pages Anda.

### 🗂 Langkah 1: Buat Repository Baru
1. Masuk ke akun GitHub Anda.
2. Klik ikon **+** di pojok kanan atas, lalu pilih **New repository**.
3. Beri nama repository (misal: `hotspot-login`).
4. Atur statusnya menjadi **Public**.
5. Klik **Create repository**.

### 📤 Langkah 2: Upload File Login
1. Di halaman repository baru, klik **uploading an existing file**.
2. Tarik semua file captive portal Anda (pastikan file utamanya bernama `index.html` atau `login.html`).
3. Klik **Commit changes** di bagian bawah.

### 🌐 Langkah 3: Aktifkan GitHub Pages
1. Masuk ke menu **Settings** di repository tersebut.
2. Di menu sebelah kiri, cari dan klik **Pages**.
3. Pada bagian *Build and deployment*, ubah *Branch* dari **None** menjadi **main** (atau master).
4. Klik **Save**.
5. Tunggu sekitar 1-2 menit, GitHub akan memberikan link URL gratis (contoh: `https://usernameanda.github.io/hotspot-login/`).
6. URL inilah yang dimasukkan ke pengaturan *external login page* di router Anda.

---

## 💳 Integrasi Ruijie dengan Midtrans (Payment Gateway)
Secara bawaan (*native*), Ruijie Cloud / Ruijie Reyee **tidak mendukung** integrasi langsung ke payment gateway lokal seperti Midtrans. Ruijie Cloud hanya menyediakan autentikasi standar seperti *One-click login*, akun manual, dan sistem Voucher internal.

Namun, Anda tetap bisa menggunakan perangkat Ruijie (Access Point atau Gateway EG Series) untuk hotspot berbayar otomatis dengan Midtrans menggunakan metode **Third-Party Captive Portal (External Portal)** berbasis protokol **WISPr**.

### 📋 3 Opsi/Solusi Menjalankannya:
1. **Menggunakan Layanan Radius Server Pihak Ketiga (Paling Mudah):**
   * Menggunakan platform manajemen hotspot pihak ketiga buatan lokal yang sudah jadi (seperti Mikhmon Online dengan Radius khusus, Kiwire, atau Hotspot.id).
   * Berfungsi sebagai External Captive Portal yang otomatis mencetak voucher setelah bayar via QRIS/Bank Transfer.
   * Di Ruijie Cloud: Masuk ke menu `Auth & Account > Captive Portal > Third-party portal` dan masukkan URL server tersebut.
2. **Membuat Sistem Sendiri dengan GitHub + Server Backend (Self-Hosted):**
   * **Frontend (GitHub Pages):** Desain tampilan login menangkap parameter URL bawaan dari Ruijie (IP user, MAC address, dll).
   * **Backend (VPS/Koyeb/Vercel):** Menjalankan script (Node.js/PHP) untuk memanggil API Midtrans (QRIS) dan menerima callback. Setelah sukses, memanggil **Ruijie Cloud API (Developer API)** untuk memberikan izin akses berdasarkan MAC address.
3. **Menggunakan Router Tambahan sebagai Billing (Sering di Lapangan):**
   * Kombinasi Hardware: Ruijie sebagai Access Point (AP) murni, sedangkan MikroTik (seperti RB750Gr3) bertindak sebagai Gateway dan Hotspot Server yang diintegrasikan ke Midtrans.

---

## 🖥 Edukasi Mengenai Mikhmon di GitHub & Cloud Hosting
> ⚠️ **Klarifikasi Penting:** GitHub Pages **tidak bisa** digunakan untuk menjalankan (*running*) Mikhmon secara langsung karena bersifat statis (HTML/CSS/JS), sedangkan Mikhmon berbasis PHP dinamis. Selain itu, Mikhmon dibuat khusus (*hardcoded*) untuk API MikroTik dan tidak bisa mengontrol perangkat Ruijie secara langsung.

### ☁️ Cara Onlinekan Mikhmon (Khusus MikroTik) via GitHub + Koyeb:
1. **Di GitHub:** Buat repository Publik, unggah file master Mikhmon V3/V4 (pastikan `index.php` ada di root folder).
2. **Di Koyeb:** Hubungkan akun GitHub, pilih repository Mikhmon, atur Builder ke **Buildpack** (otomatis mendeteksi PHP), lalu klik **Deploy** untuk mendapatkan URL gratis.
3. *Catatan:* Perlu VPN Remote (Tunneling) pada router agar port API router (8728) dapat diakses Mikhmon dari internet.

---

## 📝 Tutorial Detail: Hotspot Otomatis Ruijie EG105GW(T) Berbasis Voucher Pool
*Solusi otomatis tanpa MikroTik menggunakan skema stok voucher yang disimpan di backend server.*

### 🎫 Langkah 1: Buat Paket & Cetak Voucher di Ruijie Cloud
1. Masuk ke Ruijie Cloud melalui browser.
2. Buka proyek jaringan, masuk ke menu **Auth & Account > Voucher**.
3. Pilih **Manage Package > Klik Add Package** (misal: `paket_1jam` atau `paket_24jam`).
4. Kembali ke tab **Voucher** dan klik **Print Voucher**.
5. Pilih paket, tentukan jumlah (misal: 50 buah), lalu ekspor/catat daftar kode voucher alfanumerik yang dihasilkan.

### 🌐 Langkah 2: Konfigurasi Captive Portal & Walled Garden di Ruijie
#### 1. Daftarkan Domain Bebas Akses (Allowlist / Walled Garden)
*Agar calon pelanggan bisa membuka link pembayaran sebelum memiliki akses internet.*
1. Pada eWeb lokal router atau Ruijie Cloud, masuk ke menu **Authentication > Web Authentication** (atau `Device Config > Gateway > Advanced`).
2. Cari tab **Allowlist** (di sebelah kiri *Customized Portal*).
3. Klik **Add** dan daftarkan domain berikut:
   * `*.koyeb.app` (Domain aplikasi Anda)
   * `*.midtrans.com` (Domain payment gateway Midtrans)
   * `*.stg.midtrans.com` (Jika menggunakan mode Sandbox/Testing)

#### 2. Aktifkan Captive Portal Berbasis Voucher
1. Klik tab **Customized Portal**.
2. Aktifkan fitur login hotspot, pilih metode autentikasi menggunakan **Voucher**.
3. Edit teks halaman login atau pasang tombol tautan eksternal yang mengarah ke URL Koyeb Anda (Tempat pembelian voucher).
4. *Tips:* Desain portal melalui web Ruijie Cloud jauh lebih fleksibel dan rapi dibanding eWeb lokal router.

### 💻 Langkah 3: Siapkan Source Code di GitHub (Node.js)
1. Buat repository publik di GitHub dengan nama `ruijie-payment-portal`.
2. Siapkan file `package.json`, `server.js` (berisi array `voucherPool` dari Ruijie Cloud, integrasi Midtrans Snap API, dan logika pengurangan stok), serta `public/index.html` (frontend pilihan paket).

### 🚀 Langkah 4: Deploy ke Koyeb
1. Daftar di **Koyeb.com** menggunakan akun GitHub.
2. Klik **Create Service**, pilih repository `ruijie-payment-portal`.
3. Di bagian **Environment Variables**, masukkan:
   * `MIDTRANS_SERVER_KEY`
   * `MIDTRANS_CLIENT_KEY`
   * `NODE_ENV = development` (atau `production`)
4. Set Port ke **8080**, lalu klik **Deploy** hingga status menjadi *Healthy*.

### 📱 Langkah 5: Cara Pengujian di Lapangan
1. Hubungkan HP ke WiFi Ruijie EG105GW(T).
2. Halaman captive portal bawaan Ruijie akan muncul otomatis.
3. Klik link tautan eksternal menuju domain Koyeb Anda.
4. Pilih paket dan bayar via QRIS (gunakan simulator jika masih mode *Sandbox*).
5. Setelah sukses, halaman web akan memunculkan kode voucher resmi Ruijie.
6. Salin kode tersebut, kembali ke halaman login utama Ruijie, lalu masukkan kodenya untuk membuka akses internet.
7. *Update Stok:* Jika stok menipis, cetak voucher baru di Ruijie Cloud, perbarui array di file `server.js` lewat GitHub, dan Koyeb akan otomatis melakukan *re-deploy*.

---

## ☁️ Opsi Platform Cloud Gratis Selain Koyeb

| Platform | Kelebihan | Kekurangan | Catatan Khusus untuk Hotspot |
| :--- | :--- | :--- | :--- |
| **Render.com** | Sangat mirip Koyeb, mudah di-deploy, gratis RAM 512 MB, tanpa kartu kredit. | **Efek Tidur:** Jika sepi traffic selama 15 menit, server akan tidur. | Pembeli pertama setelah masa tidur harus menunggu **30–50 detik** (*cold start*) agar halaman terbuka. |
| **Vercel** | Berbasis *Serverless*, super cepat, *cold start* hanya hitungan milidetik. | **Stateless:** Server otomatis mati/menyala ulang di latar belakang. | Variabel `voucherPool` di dalam memori `server.js` akan **ter-reset ke awal** saat restart. Stok voucher wajib dipindah ke database eksternal seperti Supabase atau MongoDB Atlas. |