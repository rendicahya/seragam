# Pakai seragam apa hari ini?

PWA penunjuk seragam dinas harian FILKOM UB. Aplikasi ini bisa dipasang di ponsel dan berjalan offline.

Buka aplikasinya: <https://rendicahya.github.io/seragam/>

## Fitur

- Seragam hari ini dan hari kerja berikutnya, lengkap dengan fotonya
- Akhir pekan, hari libur nasional, dan cuti bersama ditampilkan sebagai libur
- Berjalan offline dan mengikuti tanggal WIB
- Tombol mode terang dan gelap
- Tombol Update saat versi baru tersedia
- Pengingat notifikasi setiap hari kerja, lengkap dengan foto seragam: pagi pukul 06.00 WIB dan/atau malam sebelumnya pukul 19.00 WIB (opsional; di iPhone/iPad aplikasi harus dipasang dulu)

## Memasang aplikasi

- **Android dan desktop (Chrome/Edge):** ketuk tombol **Pasang** di halaman utama, atau pilih pasang aplikasi dari menu browser.
- **iPhone dan iPad:** buka di Safari, ketuk **Bagikan**, lalu **Tambah ke Layar Utama**.

## Teknologi

Svelte 5, Vite, TypeScript, `vite-plugin-pwa`, dan Vitest. Aplikasinya statis dan tanpa analitik. Satu-satunya backend adalah Cloudflare Worker kecil untuk pengingat harian, yang hanya menyimpan alamat langganan push.

## Pengembangan

```sh
npm install
npm run dev      # server pengembangan
npm test         # unit test
npm run check    # pemeriksaan tipe
npm run build    # hasil build di dist/
npm run preview  # coba hasil build, termasuk service worker
```

Setiap push ke `main` di-deploy otomatis lewat GitHub Actions.

## Pengingat harian (Cloudflare Worker)

Kode ada di `worker/`. Worker ini menyimpan langganan push (beserta pilihan waktunya) di KV `SUBSCRIPTIONS` dan menjalankan dua cron: `0 23 * * *` (06.00 WIB, seragam hari ini) dan `0 12 * * *` (19.00 WIB, seragam besok). Akhir pekan dan hari libur dilewati memakai aturan yang sama dengan aplikasi (`src/lib/reminder.ts`). Foto di notifikasi diambil dari `public/seragam/` di GitHub Pages.

Worker ikut di-deploy oleh GitHub Actions pada setiap push ke `main`, jika secret repositori `CLOUDFLARE_API_TOKEN` (template token "Edit Cloudflare Workers") dan `CLOUDFLARE_ACCOUNT_ID` sudah diatur. Tanpa secret itu, langkah tersebut dilewati dengan peringatan.

```sh
npx wrangler login     # sekali saja
npm run worker:deploy  # deploy Worker manual
npm run worker:dev     # coba lokal; cron dipicu lewat /__scheduled?cron=0+23+*+*+*
```

Kunci publik VAPID ada di `src/lib/push-config.ts`. Kunci privatnya disimpan sebagai secret `VAPID_PRIVATE_JWK` (`npx wrangler secret put VAPID_PRIVATE_JWK -c worker/wrangler.jsonc`). Jika kunci diganti, semua pengguna harus mengaktifkan ulang pengingat.

## Memperbarui data

| Data | File | Kapan |
| --- | --- | --- |
| Aturan seragam | `src/lib/schedule.ts` (foto di `src/lib/uniform.ts`) | Saat aturan berubah |
| Hari libur dan cuti bersama | `src/data/holidays.json` | Setiap terbit SKB 3 Menteri baru; data saat ini sampai akhir 2027 |

Data hari libur bersumber dari SKB 3 Menteri yang dimuat [Setneg](https://setneg.go.id/baca/index/inilah_skb_3_menteri_libur_nasional_dan_cuti_bersama_2027).

## Aturan seragam

Aturan ini diambil dari aplikasi versi lama, bukan dari dokumen resmi.

| Hari | Minggu ke-1 dan 2 | Minggu ke-3 dan 4 |
| --- | --- | --- |
| Senin | Putih | Putih |
| Selasa | Abu-abu Terang 2025 | Abu-abu 2024 |
| Rabu | Krem 2025 | Coklat 2024 |
| Kamis | Batik 2025 | Batik 2024 |
| Jumat | Bebas rapi | Bebas rapi |

Minggu ke-1 dimulai pada Senin pertama dalam bulan. Tanggal sebelum Senin pertama dianggap minggu ke-1, dan minggu ke-5 dianggap minggu ke-4. Akhir pekan, hari libur nasional, dan cuti bersama ditampilkan sebagai libur.
