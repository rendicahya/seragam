import { describe, expect, it } from 'vitest';
import { addDays, dayOfWeek, formatLong, todayWib } from './date';
import { holidayOn, holidays, isDayOff, isHolidayDataExpired, nextWorkday } from './holidays';
import { uniformFor, weekOfMonth } from './uniform';

describe('todayWib', () => {
  it('sudah berganti hari pada 00.30 WIB, saat UTC masih kemarin', () => {
    expect(todayWib(new Date('2026-11-03T17:30:00Z'))).toBe('2026-11-04');
  });

  it('tidak mundur sehari pada 06.30 WIB', () => {
    expect(todayWib(new Date('2026-11-03T23:30:00Z'))).toBe('2026-11-04');
  });
});

describe('date helpers', () => {
  it('melewati batas bulan dan tahun', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('memformat tanggal dalam bahasa Indonesia', () => {
    expect(formatLong('2026-11-04')).toBe('Rabu, 4 November 2026');
  });
});

describe('weekOfMonth', () => {
  it('menghitung dari Senin pertama', () => {
    expect(weekOfMonth('2026-11-02')).toBe(1);
    expect(weekOfMonth('2026-11-09')).toBe(2);
    expect(weekOfMonth('2026-11-16')).toBe(3);
    expect(weekOfMonth('2026-11-23')).toBe(4);
  });

  it('menganggap tanggal sebelum Senin pertama sebagai minggu ke-1', () => {
    expect(weekOfMonth('2026-12-01')).toBe(1);
    expect(weekOfMonth('2026-12-08')).toBe(1);
    expect(weekOfMonth('2026-12-15')).toBe(2);
  });

  it('menganggap minggu ke-5 sebagai minggu ke-4', () => {
    expect(weekOfMonth('2026-03-31')).toBe(4);
  });
});

describe('uniformFor', () => {
  it.each([
    ['2026-11-02', 'Warna Putih'],
    ['2026-11-03', 'Abu-abu Terang 2025'],
    ['2026-11-04', 'Krem 2025'],
    ['2026-11-05', 'Batik 2025'],
    ['2026-11-06', 'Pakaian Bebas Rapi'],
    ['2026-11-07', 'Libur'],
    ['2026-11-08', 'Libur'],
    ['2026-11-17', 'Warna Abu-abu 2024'],
    ['2026-11-18', 'Warna Coklat 2024'],
    ['2026-11-19', 'Batik 2024'],
    ['2026-11-23', 'Warna Putih'],
    ['2026-11-27', 'Pakaian Bebas Rapi'],
  ])('%s memakai %s', (date, name) => {
    expect(uniformFor(date).name).toBe(name);
  });
});

describe('holidays data', () => {
  it('terurut dan tidak ada tanggal ganda', () => {
    const dates = holidays.map((holiday) => holiday.date);
    expect(dates).toEqual([...new Set(dates)].sort());
  });

  it.each([
    ['2026', 17, 8],
    ['2027', 18, 8],
  ])('tahun %s berisi %i libur nasional dan %i cuti bersama sesuai SKB', (year, nasional, cuti) => {
    const ofYear = holidays.filter((holiday) => holiday.date.startsWith(year));
    expect(ofYear.filter((holiday) => holiday.type === 'nasional')).toHaveLength(nasional);
    expect(ofYear.filter((holiday) => holiday.type === 'cuti')).toHaveLength(cuti);
  });

  it('cuti bersama selalu jatuh pada hari kerja', () => {
    for (const holiday of holidays.filter((item) => item.type === 'cuti')) {
      expect([0, 6]).not.toContain(dayOfWeek(holiday.date));
    }
  });
});

describe('hari libur', () => {
  it('mengenali Senin tanggal merah sebagai hari libur', () => {
    expect(dayOfWeek('2026-08-17')).toBe(1);
    expect(holidayOn('2026-08-17')?.name).toBe('Proklamasi Kemerdekaan');
    expect(isDayOff('2026-08-17')).toBe(true);
  });

  it('hari kerja berikutnya melewati akhir pekan', () => {
    expect(nextWorkday('2026-11-06')).toBe('2026-11-09');
  });

  it('hari kerja berikutnya melewati libur panjang', () => {
    expect(nextWorkday('2026-12-23')).toBe('2026-12-28');
    expect(nextWorkday('2027-03-05')).toBe('2027-03-16');
  });

  it('menandai data yang sudah habis', () => {
    expect(isHolidayDataExpired('2027-12-26')).toBe(false);
    expect(isHolidayDataExpired('2027-12-27')).toBe(true);
  });
});
