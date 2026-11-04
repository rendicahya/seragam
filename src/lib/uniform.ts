import { dayOfWeek, type IsoDate } from './date';
import abu2024 from '../assets/seragam/2024-grey.webp';
import coklat2024 from '../assets/seragam/2024-brown.webp';
import batik2024 from '../assets/seragam/2024-batik.webp';
import abu2025 from '../assets/seragam/2025-light-grey.webp';
import krem2025 from '../assets/seragam/2025-cream.webp';
import batik2025 from '../assets/seragam/2025-batik.webp';
import putih from '../assets/seragam/putih.webp';

export interface UniformImage {
  src: string;
  width: number;
  height: number;
  /** Foto berisi beberapa seragam; yang dimaksud ditandai bintang. */
  starred: boolean;
}

export interface Uniform {
  name: string;
  detail: string;
  /** Warna contoh kain untuk penanda di samping nama. */
  swatch?: string;
  image?: UniformImage;
}

const set2025 = (src: string): UniformImage => ({ src, width: 800, height: 481, starred: true });
const set2024 = (src: string): UniformImage => ({ src, width: 800, height: 600, starred: true });

const MONDAY: Uniform = {
  name: 'Warna Putih',
  detail: 'Seragam putih berlaku setiap hari Senin',
  swatch: '#ffffff',
  image: { src: putih, width: 626, height: 417, starred: false },
};

const FRIDAY: Uniform = {
  name: 'Pakaian Bebas Rapi',
  detail: 'Gunakan pakaian bebas yang rapi dan sopan',
};

const WEEKEND: Uniform = {
  name: 'Libur',
  detail: 'Tidak ada seragam dinas. Selamat beristirahat! 😊',
};

const DETAIL_2025 = 'Seragam 2025 · Minggu 1 & 2';
const DETAIL_2024 = 'Seragam 2024 · Minggu 3 & 4';

/** Selasa (2) sampai Kamis (4), menurut kelompok minggu. */
const WEEKS_1_2: Record<number, Uniform> = {
  2: { name: 'Abu-abu Terang 2025', detail: DETAIL_2025, swatch: '#b4b3af', image: set2025(abu2025) },
  3: { name: 'Krem 2025', detail: DETAIL_2025, swatch: '#ede3c9', image: set2025(krem2025) },
  4: { name: 'Batik 2025', detail: DETAIL_2025, swatch: '#2d2738', image: set2025(batik2025) },
};

const WEEKS_3_4: Record<number, Uniform> = {
  2: { name: 'Warna Abu-abu 2024', detail: DETAIL_2024, swatch: '#7586a0', image: set2024(abu2024) },
  3: { name: 'Warna Coklat 2024', detail: DETAIL_2024, swatch: '#9a8468', image: set2024(coklat2024) },
  4: { name: 'Batik 2024', detail: DETAIL_2024, swatch: '#4a3a2a', image: set2024(batik2024) },
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
export function uniformFor(date: IsoDate): Uniform {
  const day = dayOfWeek(date);
  if (day === 0 || day === 6) return WEEKEND;
  if (day === 1) return MONDAY;
  if (day === 5) return FRIDAY;
  return (weekOfMonth(date) <= 2 ? WEEKS_1_2 : WEEKS_3_4)[day];
}
