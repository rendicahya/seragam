import type { IsoDate } from './date';
import { uniformInfoFor, type UniformInfo } from './schedule';

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

/** Seragam menurut hari dan minggu saja, belum memperhitungkan hari libur nasional. */
export function uniformFor(date: IsoDate): Uniform {
  const info = uniformInfoFor(date);
  const photo = info.photo;
  if (!photo) return info;
  return {
    ...info,
    image: { src: `${import.meta.env.BASE_URL}${photo.path}`, width: photo.width, height: photo.height, starred: photo.starred },
  };
}
