import data from '../data/holidays.json';
import { addDays, dayOfWeek, type IsoDate } from './date';

export interface Holiday {
  date: IsoDate;
  name: string;
  type: 'nasional' | 'cuti';
}

/** Terurut menurut tanggal. Sumber: SKB 3 Menteri tahun 2026 dan 2027. */
export const holidays = data as Holiday[];

const byDate = new Map(holidays.map((holiday) => [holiday.date, holiday]));
const lastCovered = holidays[holidays.length - 1].date;

export function holidayOn(date: IsoDate): Holiday | undefined {
  return byDate.get(date);
}

export function isDayOff(date: IsoDate): boolean {
  const day = dayOfWeek(date);
  return day === 0 || day === 6 || byDate.has(date);
}

/** Hari kerja pertama setelah `date`. */
export function nextWorkday(date: IsoDate): IsoDate {
  let next = addDays(date, 1);
  while (isDayOff(next)) next = addDays(next, 1);
  return next;
}

/** Tanggal merah pertama pada atau setelah `date`. */
export function nextHoliday(date: IsoDate): Holiday | undefined {
  return holidays.find((holiday) => holiday.date >= date);
}

/** True jika `date` sudah melewati akhir data hari libur. */
export function isHolidayDataExpired(date: IsoDate): boolean {
  return date > lastCovered;
}
