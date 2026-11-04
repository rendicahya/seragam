# Pakai seragam apa hari ini?

PWA penunjuk seragam dinas harian FILKOM UB. Aplikasi ini bisa dipasang di ponsel dan berjalan offline.

Buka aplikasinya: <https://rendicahya.github.io/seragam/>

## Fitur

- Seragam hari ini dan hari kerja berikutnya, lengkap dengan fotonya
- Akhir pekan, hari libur nasional, dan cuti bersama ditampilkan sebagai libur
- Berjalan offline dan mengikuti tanggal WIB
- Tombol mode terang dan gelap

## Memasang aplikasi

- **Android dan desktop (Chrome/Edge):** ketuk tombol **Pasang** di halaman utama, atau pilih pasang aplikasi dari menu browser.
- **iPhone dan iPad:** buka di Safari, ketuk **Bagikan**, lalu **Tambah ke Layar Utama**.

## Teknologi

Svelte 5, Vite, TypeScript, `vite-plugin-pwa`, dan Vitest. Aplikasi ini sepenuhnya statis, tanpa backend dan tanpa analitik.

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

## Memperbarui data

| Data | File | Kapan |
| --- | --- | --- |
| Aturan seragam | `src/lib/uniform.ts` | Saat aturan berubah |
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
