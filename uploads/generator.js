const crypto = require('crypto');

// WAJIB SAMA PERSIS DENGAN YANG ADA DI FILE SERVER.JS
const OWNER_SECRET_SALT = "KQ5_CORE_GATEWAY_SECURITY_SALT_2026";

// 🛠️ CONFIG PENJUALAN ANDA (Ubah bagian ini setiap ada pembeli baru)
const LISENSI_UNTUK = "Fadhil Net Bekasi"; 
const PILIHAN_TIER = "6 Bulan"; // Opsi isi: "Bulanan", "6 Bulan", "1 Tahun", "Lifetime"
const TANGGAL_EXPIRED = "2026-11-16"; // Format: YYYY-MM-DD (Abaikan jika memilih Lifetime)

function buatTokenLisensiKomersial() {
    const dataString = `${LISENSI_UNTUK}|${PILIHAN_TIER}|${TANGGAL_EXPIRED}`;
    
    // Pembuatan Signature Kriptografi Anti-Crack
    const signature = crypto.createHmac('sha256', OWNER_SECRET_SALT)
                            .update(dataString)
                            .digest('hex');

    const paketLisensi = {
        licensedTo: LISENSI_UNTUK,
        tier: PILIHAN_TIER,
        expiresAt: TANGGAL_EXPIRED,
        signature: signature
    };

    // Mengubah objek menjadi string Base64 yang aman dikirim lewat teks WhatsApp/Email
    const tokenFinal = Buffer.from(JSON.stringify(paketLisensi)).toString('base64');
    
    console.log("==================================================================");
    console.log(`SUKSES GENERATE TOKEN UNTUK: ${LISENSI_UNTUK} [Paket ${PILIHAN_TIER}]`);
    console.log("==================================================================");
    console.log(tokenFinal);
    console.log("==================================================================");
}

buatTokenLisensiKomersial();