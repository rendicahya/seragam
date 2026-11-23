import type { IsoDate } from './date';
import { isDayOff } from './holidays';
import { uniformInfoFor } from './schedule';

export interface Reminder {
  title: string;
  body: string;
}

/** Isi notifikasi pagi untuk `date`, atau null jika hari itu libur (tidak dikirim). */
export function reminderFor(date: IsoDate): Reminder | null {
  if (isDayOff(date)) return null;
  const uniform = uniformInfoFor(date);
  return { title: `Hari ini: ${uniform.name}`, body: uniform.detail };
}
