import type { IsoDate } from './date';
import { isDayOff } from './holidays';
import { uniformInfoFor } from './schedule';

/** pagi = 06.00 WIB untuk hari itu, malam = 19.00 WIB untuk keesokan harinya. */
export type ReminderTime = 'pagi' | 'malam';

export const REMINDER_TIMES: readonly ReminderTime[] = ['pagi', 'malam'];

export interface Reminder {
  title: string;
  body: string;
  /** Path foto seragam relatif terhadap akar aplikasi, jika ada. */
  image?: string;
}

/**
 * Isi notifikasi untuk seragam pada `date`, atau null jika hari itu libur (tidak dikirim).
 * Pengingat malam dikirim sehari sebelumnya, jadi judulnya "Besok".
 */
export function reminderFor(date: IsoDate, time: ReminderTime = 'pagi'): Reminder | null {
  if (isDayOff(date)) return null;
  const uniform = uniformInfoFor(date);
  return {
    title: `${time === 'pagi' ? 'Hari ini' : 'Besok'}: ${uniform.name}`,
    body: uniform.detail,
    ...(uniform.photo && { image: uniform.photo.path }),
  };
}
