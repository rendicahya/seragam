import { dayOfWeek, type IsoDate } from './date';

/**
 * Aturan seragam tanpa foto, agar bisa dipakai juga oleh Worker pengingat
 * (worker/) yang tidak bisa memuat aset gambar. Foto ditambahkan di uniform.ts.
 */

export type UniformId =
  | 'putih'
  | 'bebas'
  | 'libur'
  | 'abu-2025'
  | 'krem-2025'
  | 'batik-2025'
  | 'abu-2024'
  | 'coklat-2024'
  | 'batik-2024';

export interface UniformInfo {
  id: UniformId;
  name: string;
  detail: string;
  /** Warna contoh kain untuk penanda di samping nama. */
  swatch?: string;
  photo?: UniformPhoto;
}

export interface UniformPhoto {
  /** Relatif terhadap akar aplikasi (public/), agar URL-nya tetap dan bisa dipakai di notifikasi. */
  path: string;
  width: number;
  height: number;
  /** Foto berisi beberapa seragam; yang dimaksud ditandai bintang. */
  starred: boolean;
}

const photo2025 = (id: UniformId): UniformPhoto => ({ path: `seragam/${id}.webp`, width: 800, height: 481, starred: true });
const photo2024 = (id: UniformId): UniformPhoto => ({ path: `seragam/${id}.webp`, width: 800, height: 600, starred: true });

const MONDAY: UniformInfo = {
  id: 'putih',
  name: 'Warna Putih',
  detail: 'Seragam putih berlaku setiap hari Senin',
  swatch: '#ffffff',
  photo: { path: 'seragam/putih.webp', width: 626, height: 417, starred: false },
};

const FRIDAY: UniformInfo = {
  id: 'bebas',
  name: 'Pakaian Bebas Rapi',
  detail: 'Gunakan pakaian bebas yang rapi dan sopan',
};

const WEEKEND: UniformInfo = {
  id: 'libur',
  name: 'Libur',
  detail: 'Tidak ada seragam dinas. Selamat beristirahat! 😊',
};

const DETAIL_2025 = 'Seragam 2025 · Minggu 1 & 2';
const DETAIL_2024 = 'Seragam 2024 · Minggu 3 & 4';

/** Selasa (2) sampai Kamis (4), menurut kelompok minggu. */
const WEEKS_1_2: Record<number, UniformInfo> = {
  2: { id: 'abu-2025', name: 'Abu-abu Terang 2025', detail: DETAIL_2025, swatch: '#b4b3af', photo: photo2025('abu-2025') },
  3: { id: 'krem-2025', name: 'Krem 2025', detail: DETAIL_2025, swatch: '#ede3c9', photo: photo2025('krem-2025') },
  4: { id: 'batik-2025', name: 'Batik 2025', detail: DETAIL_2025, swatch: '#2d2738', photo: photo2025('batik-2025') },
};

const WEEKS_3_4: Record<number, UniformInfo> = {
  2: { id: 'abu-2024', name: 'Warna Abu-abu 2024', detail: DETAIL_2024, swatch: '#7586a0', photo: photo2024('abu-2024') },
  3: { id: 'coklat-2024', name: 'Warna Coklat 2024', detail: DETAIL_2024, swatch: '#9a8468', photo: photo2024('coklat-2024') },
  4: { id: 'batik-2024', name: 'Batik 2024', detail: DETAIL_2024, swatch: '#4a3a2a', photo: photo2024('batik-2024') },
};

/**
 * Minggu ke-1 dimulai pada Senin pertama dalam bulan. Tanggal sebelum Senin
 * pertama dianggap minggu ke-1, dan minggu ke-5 dianggap minggu ke-4.
 * Aturan ini mengikuti aplikasi versi lama, bukan dokumen resmi.
 */
export function weekOfMonth(date: IsoDate): number {
  const dayOfMonth = Number(date.slice(8, 10));
  const firstOfMonth = dayOfWeek(`${date.slice(0, 8)}01`);
  const firstMonday = 1 + ((1 - firstOfMonth + 7) % 7);
  if (dayOfMonth < firstMonday) return 1;
  return Math.min(Math.floor((dayOfMonth - firstMonday) / 7) + 1, 4);
}

/** Seragam menurut hari dan minggu saja, belum memperhitungkan hari libur nasional. */
export function uniformInfoFor(date: IsoDate): UniformInfo {
  const day = dayOfWeek(date);
  if (day === 0 || day === 6) return WEEKEND;
  if (day === 1) return MONDAY;
  if (day === 5) return FRIDAY;
  return (weekOfMonth(date) <= 2 ? WEEKS_1_2 : WEEKS_3_4)[day];
}
