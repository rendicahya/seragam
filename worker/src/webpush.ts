/**
 * Pengirim Web Push minimal dengan WebCrypto (tanpa dependensi):
 * enkripsi payload RFC 8291 (aes128gcm, RFC 8188) dan autentikasi VAPID RFC 8292.
 */

type Bytes = Uint8Array<ArrayBuffer>;

export interface PushTarget {
  endpoint: string;
  /** Kunci publik P-256 browser (base64url, 65 byte tak terkompresi). */
  p256dh: string;
  /** Rahasia autentikasi browser (base64url, 16 byte). */
  auth: string;
}

export interface VapidKeys {
  /** Kunci publik (base64url, 65 byte), sama dengan applicationServerKey di aplikasi. */
  publicKey: string;
  privateJwk: JsonWebKey;
  /** URL https: atau mailto: untuk dihubungi layanan push. */
  subject: string;
}

const encoder = new TextEncoder();
const RECORD_SIZE = 4096;

export function base64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64urlDecode(text: string): Bytes {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** HKDF-SHA256 (extract lalu expand). */
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}

/** Mengenkripsi payload untuk satu langganan menjadi body aes128gcm satu record. */
export async function encryptPayload(payload: Uint8Array, target: PushTarget): Promise<Bytes> {
  const uaPublic = base64urlDecode(target.p256dh);
  const authSecret = base64urlDecode(target.auth);

  const local = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', local.publicKey)) as ArrayBuffer);
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(
    // Tipe Workers menamai properti ini `$public`, tetapi runtime memakai nama standar `public`.
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey } as unknown as SubtleCryptoDeriveKeyAlgorithm, local.privateKey, 256),
  );

  const keyInfo = concat(encoder.encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode('Content-Encoding: nonce\0'), 12);

  // Satu record saja: payload diikuti pembatas record terakhir (0x02), tanpa padding tambahan.
  const plaintext = concat(payload, Uint8Array.of(2));
  if (plaintext.length + 16 > RECORD_SIZE) throw new Error('Payload terlalu besar');
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext));

  // Header: salt (16) | ukuran record (uint32) | panjang keyid (1) | keyid = kunci publik server.
  const header = new Uint8Array(21 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, ciphertext);
}

/** Header Authorization VAPID untuk layanan push pemilik `endpoint`. */
export async function vapidAuthorization(endpoint: string, vapid: VapidKeys, now = Date.now()): Promise<string> {
  const header = base64urlEncode(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = base64urlEncode(
    encoder.encode(
      JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: vapid.subject }),
    ),
  );
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey('jwk', vapid.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
  ]);
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(unsigned)),
  );
  return `vapid t=${unsigned}.${base64urlEncode(signature)}, k=${vapid.publicKey}`;
}

/**
 * Mengirim satu pesan push. Status 404/410 berarti langganan sudah tidak berlaku
 * dan sebaiknya dihapus.
 */
export async function sendPush(
  target: PushTarget,
  payload: string,
  vapid: VapidKeys,
  ttlSeconds: number,
): Promise<Response> {
  const body = await encryptPayload(encoder.encode(payload), target);
  return fetch(target.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(target.endpoint, vapid),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttlSeconds),
      Urgency: 'normal',
    },
    body,
  });
}
