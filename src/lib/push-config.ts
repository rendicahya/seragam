/**
 * Konfigurasi pengingat harian, dipakai bersama oleh aplikasi dan Worker (worker/).
 * Kunci privat VAPID tersimpan sebagai secret Worker, bukan di repositori.
 * Jika PUSH_API berubah, ubah juga konstanta yang sama di public/push-sw.js.
 */
export const PUSH_API = 'https://seragam-push.rendicahya.workers.dev';
export const VAPID_PUBLIC_KEY = 'BE82LZHyYohmUc2vtXq1lxOq3q48vvBnygW5tU6NIzB6rrlbFNdHa9xsLGBnb6Mp1VcsXaklf2AB6jFnb7qB0Qc';
export const APP_URL = 'https://rendicahya.github.io/seragam/';
export const APP_ORIGIN = 'https://rendicahya.github.io';
