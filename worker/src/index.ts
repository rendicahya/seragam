import { WorkerEntrypoint } from 'cloudflare:workers';
import { todayWib } from '../../src/lib/date';
import { APP_ORIGIN, APP_URL, VAPID_PUBLIC_KEY } from '../../src/lib/push-config';
import { reminderFor } from '../../src/lib/reminder';
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
}

const ALLOWED_ORIGINS = new Set([APP_ORIGIN, 'http://localhost:5173', 'http://localhost:4173']);

/**
 * Paket gratis membatasi 50 subrequest per pemanggilan, jadi pengiriman dipecah
 * ke beberapa pemanggilan Sender. Tiap kelompok menyisakan ruang untuk hapus KV.
 */
const BATCH_SIZE = 20;

/** Pengingat pagi tidak berguna lagi setelah siang hari. */
const REMINDER_TTL_SECONDS = 6 * 3600;

function vapidKeys(env: Env): VapidKeys {
  return { publicKey: VAPID_PUBLIC_KEY, privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK), subject: APP_URL };
}

async function targetId(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return base64urlEncode(new Uint8Array(digest));
}

async function listTargets(env: Env): Promise<StoredTarget[]> {
  const targets: StoredTarget[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.SUBSCRIPTIONS.list<TargetMetadata>({ cursor });
    for (const key of page.keys) {
      if (key.metadata) targets.push({ id: key.name, endpoint: key.metadata.e, p256dh: key.metadata.p, auth: key.metadata.a });
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
    confirm?: unknown;
    replaces?: unknown;
  } | null;
  const target = parseSubscription(body?.subscription);
  if (!target) return 400;

  const metadata: TargetMetadata = { e: target.endpoint, p: target.p256dh, a: target.auth };
  await env.SUBSCRIPTIONS.put(await targetId(target.endpoint), '', { metadata });

  if (typeof body?.replaces === 'string' && body.replaces !== target.endpoint) {
    await env.SUBSCRIPTIONS.delete(await targetId(body.replaces));
  }

  if (body?.confirm === true) {
    const payload = JSON.stringify({
      title: 'Pengingat seragam aktif',
      body: 'Anda akan diingatkan setiap hari kerja pukul 06.00 WIB.',
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
  async sendBatch(targets: StoredTarget[], payload: string) {
    const vapid = vapidKeys(this.env);
    const result = { sent: 0, removed: 0, failed: 0 };
    await Promise.all(
      targets.map(async (target) => {
        try {
          const res = await sendPush(target, payload, vapid, REMINDER_TTL_SECONDS);
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

  // Cron 23.00 UTC = 06.00 WIB keesokan harinya; hari libur dilewati di sini.
  async scheduled(controller, env) {
    const date = todayWib(new Date(controller.scheduledTime));
    const reminder = reminderFor(date);
    if (!reminder) {
      console.log(`${date}: hari libur, tidak ada pengingat`);
      return;
    }

    const targets = await listTargets(env);
    const payload = JSON.stringify({ ...reminder, tag: `seragam-${date}`, url: APP_URL });
    const batches: StoredTarget[][] = [];
    for (let i = 0; i < targets.length; i += BATCH_SIZE) batches.push(targets.slice(i, i + BATCH_SIZE));

    const results = await Promise.allSettled(batches.map((batch) => env.SENDER.sendBatch(batch, payload)));
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
    console.log(`${date}: ${reminder.title}`, total);
  },
} satisfies ExportedHandler<Env>;
