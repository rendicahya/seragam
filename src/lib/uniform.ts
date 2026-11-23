import type { IsoDate } from './date';
import { uniformInfoFor, type UniformId, type UniformInfo } from './schedule';
import abu2024 from '../assets/seragam/2024-grey.webp';
import coklat2024 from '../assets/seragam/2024-brown.webp';
import batik2024 from '../assets/seragam/2024-batik.webp';
import abu2025 from '../assets/seragam/2025-light-grey.webp';
import krem2025 from '../assets/seragam/2025-cream.webp';
import batik2025 from '../assets/seragam/2025-batik.webp';
import putih from '../assets/seragam/putih.webp';

export { weekOfMonth } from './schedule';

export interface UniformImage {
  src: string;
  width: number;
  height: number;
  /** Foto berisi beberapa seragam; yang dimaksud ditandai bintang. */
  starred: boolean;
}

export interface Uniform extends UniformInfo {
  image?: UniformImage;
}

const set2025 = (src: string): UniformImage => ({ src, width: 800, height: 481, starred: true });
const set2024 = (src: string): UniformImage => ({ src, width: 800, height: 600, starred: true });

const IMAGES: Partial<Record<UniformId, UniformImage>> = {
  putih: { src: putih, width: 626, height: 417, starred: false },
  'abu-2025': set2025(abu2025),
  'krem-2025': set2025(krem2025),
  'batik-2025': set2025(batik2025),
  'abu-2024': set2024(abu2024),
  'coklat-2024': set2024(coklat2024),
  'batik-2024': set2024(batik2024),
};

/** Seragam menurut hari dan minggu saja, belum memperhitungkan hari libur nasional. */
export function uniformFor(date: IsoDate): Uniform {
  const info = uniformInfoFor(date);
  return { ...info, image: IMAGES[info.id] };
}
