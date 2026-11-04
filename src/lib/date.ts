/** Tanggal kalender tanpa jam, berformat YYYY-MM-DD. */
export type IsoDate = string;

const MS_PER_DAY = 86_400_000;

const wibParts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Tanggal saat ini di WIB, apa pun zona waktu perangkatnya. */
export function todayWib(now: Date = new Date()): IsoDate {
  const part = (type: string) => wibParts.formatToParts(now).find((p) => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function toUtc(date: IsoDate): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(toUtc(date).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Jumlah hari dari `from` ke `to`; negatif jika `to` lebih awal. */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / MS_PER_DAY);
}

/** 0 = Minggu, 1 = Senin, ..., 6 = Sabtu. */
export function dayOfWeek(date: IsoDate): number {
  return toUtc(date).getUTCDay();
}

export function formatDate(date: IsoDate, options: Intl.DateTimeFormatOptions): string {
  return toUtc(date).toLocaleDateString('id-ID', { ...options, timeZone: 'UTC' });
}

/** Contoh: "Rabu, 4 November 2026". */
export function formatLong(date: IsoDate): string {
  return formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Contoh: "Senin, 9 Nov". */
export function formatShort(date: IsoDate): string {
  return formatDate(date, { weekday: 'long', day: 'numeric', month: 'short' });
}
