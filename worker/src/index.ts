import { WorkerEntrypoint } from 'cloudflare:workers';
import { addDays, todayWib } from '../../src/lib/date';
import { APP_ORIGIN, APP_URL, VAPID_PUBLIC_KEY } from '../../src/lib/push-config';
import { REMINDER_TIMES, reminderFor, type ReminderTime } from '../../src/lib/reminder';
import { base64urlDecode, base64urlEncode, sendPush, type PushTarget, type VapidKeys } from './webpush';

interface Env {
  SUBSCRIPTIONS: KVNamespace;
  /** JWK kunci privat VAPID (secret). */
  VAPID_PRIVATE_JWK: string;
  /** Binding ke entrypoint Sender milik Worker ini sendiri. */
  SENDER: Service<Sender>;
}

interface StoredTarget extends PushTarget {
  /** Kunci KV: hash SHA-256 dari endpoint. */
  id: string;
}

/** Disimpan sebagai metadata KV agar daftar langganan bisa dibaca hanya dengan list(). */
interface TargetMetadata {
  e: string;
  p: string;
  a: string;
  /** Waktu pengingat yang dipilih; langganan lama tanpa field ini hanya menerima pagi. */
  t?: ReminderTime[];
}

const DEFAULT_TIMES: ReminderTime[] = ['pagi'];

/** Cron di wrangler.jsonc: 23.00 UTC = 06.00 WIB esok hari, 12.00 UTC = 19.00 WIB. */
const CRON_TIME: Record<string, ReminderTime> = { '0 23 * * *': 'pagi', '0 12 * * *': 'malam' };

/** Pengingat kedaluwarsa jika belum sampai: pagi sampai siang, malam sampai pengingat pagi. */
const TTL_SECONDS: Record<ReminderTime, number> = { pagi: 6 * 3600, malam: 11 * 3600 };

const ALLOWED_ORIGINS = new Set([APP_ORIGIN, 'http://localhost:5173', 'http://localhost:4173']);

/**
 * Paket gratis membatasi 50 subrequest per pemanggilan, jadi pengiriman dipecah
 * ke beberapa pemanggilan Sender. Tiap kelompok menyisakan ruang untuk hapus KV.
 */
const BATCH_SIZE = 20;

function vapidKeys(env: Env): VapidKeys {
  return { publicKey: VAPID_PUBLIC_KEY, privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK), subject: APP_URL };
}

async function targetId(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return base64urlEncode(new Uint8Array(digest));
}

async function listTargets(env: Env, time: ReminderTime): Promise<StoredTarget[]> {
  const targets: StoredTarget[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.SUBSCRIPTIONS.list<TargetMetadata>({ cursor });
    for (const { name, metadata } of page.keys) {
      if (!metadata || !(metadata.t ?? DEFAULT_TIMES).includes(time)) continue;
      targets.push({ id: name, endpoint: metadata.e, p256dh: metadata.p, auth: metadata.a });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return targets;
}

/** Memeriksa bentuk langganan dari browser; mengembalikan null jika tidak sah. */
function parseSubscription(value: unknown): PushTarget | null {
  const sub = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') return null;
  if (endpoint.length > 700 || !endpoint.startsWith('https://')) return null;
  try {
    new URL(endpoint);
    if (base64urlDecode(p256dh).length !== 65 || base64urlDecode(auth).length !== 16) return null;
  } catch {
    return null;
  }
  return { endpoint, p256dh, auth };
}

/** Daftar waktu yang sah dan tidak kosong, atau null. */
function parseTimes(value: unknown): ReminderTime[] | null {
  if (!Array.isArray(value)) return null;
  const times = REMINDER_TIMES.filter((time) => value.includes(time));
  return times.length > 0 ? times : null;
}

async function storedTimes(env: Env, endpoint: unknown): Promise<ReminderTime[] | null> {
  if (typeof endpoint !== 'string') return null;
  const { metadata } = await env.SUBSCRIPTIONS.getWithMetadata<TargetMetadata>(await targetId(endpoint));
  return metadata ? (metadata.t ?? DEFAULT_TIMES) : null;
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin');
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function handleSubscribe(request: Request, env: Env, ctx: ExecutionContext): Promise<number> {
  const body = (await request.json().catch(() => null)) as {
    subscription?: unknown;
    times?: unknown;
    confirm?: unknown;
    replaces?: unknown;
  } | null;
  const target = parseSubscription(body?.subscription);
  if (!target) return 400;
  if (body?.times !== undefined && !parseTimes(body.times)) return 400;

  // Tanpa `times` (mis. dari pushsubscriptionchange), pilihan lama dipertahankan.
  const times =
    parseTimes(body?.times) ??
    (await storedTimes(env, target.endpoint)) ??
    (await storedTimes(env, body?.replaces)) ??
    DEFAULT_TIMES;
  const metadata: TargetMetadata = { e: target.endpoint, p: target.p256dh, a: target.auth, t: times };
  await env.SUBSCRIPTIONS.put(await targetId(target.endpoint), '', { metadata });

  if (typeof body?.replaces === 'string' && body.replaces !== target.endpoint) {
    await env.SUBSCRIPTIONS.delete(await targetId(body.replaces));
  }

  if (body?.confirm === true) {
    const payload = JSON.stringify({
      title: 'Pengingat seragam aktif',
      body: 'Anda akan diingatkan seragam setiap hari kerja.',
      tag: 'seragam-confirm',
      url: APP_URL,
    });
    ctx.waitUntil(
      sendPush(target, payload, vapidKeys(env), 3600)
        .then((res) => res.body?.cancel())
        .catch((error) => console.warn('Gagal mengirim konfirmasi', error)),
    );
  }
  return 201;
}

async function handleUnsubscribe(request: Request, env: Env): Promise<number> {
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== 'string') return 400;
  await env.SUBSCRIPTIONS.delete(await targetId(body.endpoint));
  return 204;
}

/** Mengirim ke sekelompok langganan; dipanggil lewat binding agar mendapat jatah subrequest sendiri. */
export class Sender extends WorkerEntrypoint<Env> {
  async sendBatch(targets: StoredTarget[], payload: string, ttlSeconds: number) {
    const vapid = vapidKeys(this.env);
    const result = { sent: 0, removed: 0, failed: 0 };
    await Promise.all(
      targets.map(async (target) => {
        try {
          const res = await sendPush(target, payload, vapid, ttlSeconds);
          await res.body?.cancel();
          if (res.ok) {
            result.sent++;
          } else if (res.status === 404 || res.status === 410) {
            await this.env.SUBSCRIPTIONS.delete(target.id);
            result.removed++;
          } else {
            result.failed++;
            console.warn('Push ditolak', res.status, new URL(target.endpoint).host);
          }
        } catch (error) {
          result.failed++;
          console.warn('Push gagal', error);
        }
      }),
    );
    return result;
  }
}

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const { pathname } = new URL(request.url);
    let status = 404;
    if (request.method === 'POST' && pathname === '/subscribe') status = await handleSubscribe(request, env, ctx);
    else if (request.method === 'POST' && pathname === '/unsubscribe') status = await handleUnsubscribe(request, env);
    else if (request.method === 'GET' && pathname === '/') {
      return new Response('Pengingat seragam FILKOM UB', { headers: cors });
    }
    return new Response(null, { status, headers: cors });
  },

  // Hari libur dilewati di sini, bukan lewat jadwal cron.
  async scheduled(controller, env) {
    const time = CRON_TIME[controller.cron];
    if (!time) {
      console.error('Cron tidak dikenal', controller.cron);
      return;
    }
    const today = todayWib(new Date(controller.scheduledTime));
    const date = time === 'pagi' ? today : addDays(today, 1);
    const reminder = reminderFor(date, time);
    if (!reminder) {
      console.log(`${time} ${date}: hari libur, tidak ada pengingat`);
      return;
    }

    const targets = await listTargets(env, time);
    // Tag sama untuk tanggal yang sama, jadi pengingat pagi menggantikan pengingat malam sebelumnya.
    const payload = JSON.stringify({
      title: reminder.title,
      body: reminder.body,
      image: reminder.image && new URL(reminder.image, APP_URL).href,
      tag: `seragam-${date}`,
      url: APP_URL,
    });
    const batches: StoredTarget[][] = [];
    for (let i = 0; i < targets.length; i += BATCH_SIZE) batches.push(targets.slice(i, i + BATCH_SIZE));

    const results = await Promise.allSettled(batches.map((batch) => env.SENDER.sendBatch(batch, payload, TTL_SECONDS[time])));
    const total = { sent: 0, removed: 0, failed: 0 };
    for (const [i, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        total.sent += result.value.sent;
        total.removed += result.value.removed;
        total.failed += result.value.failed;
      } else {
        total.failed += batches[i].length;
        console.error('Kelompok gagal', result.reason);
      }
    }
    console.log(`${time} ${date}: ${reminder.title}`, total);
  },
} satisfies ExportedHandler<Env>;
