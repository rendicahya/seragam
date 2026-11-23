import { createECDH, randomBytes } from 'node:crypto';
// @ts-expect-error http_ece tidak menyertakan tipe.
import ece from 'http_ece';
import { describe, expect, it } from 'vitest';
import { base64urlDecode, base64urlEncode, encryptPayload, vapidAuthorization } from './webpush';

describe('encryptPayload', () => {
  it('bisa didekripsi oleh implementasi aes128gcm lain (http_ece)', async () => {
    const browser = createECDH('prime256v1');
    browser.generateKeys();
    const auth = randomBytes(16);
    const message = JSON.stringify({ title: 'Hari ini: Krem 2025', body: 'Seragam 2025 · Minggu 1 & 2' });

    const body = await encryptPayload(new TextEncoder().encode(message), {
      endpoint: 'https://push.example/abc',
      p256dh: base64urlEncode(browser.getPublicKey()),
      auth: base64urlEncode(auth),
    });

    const decrypted: Buffer = ece.decrypt(Buffer.from(body), {
      version: 'aes128gcm',
      privateKey: browser,
      authSecret: auth,
    });
    expect(decrypted.toString('utf8')).toBe(message);
  });
});

describe('vapidAuthorization', () => {
  it('membuat JWT ES256 yang valid untuk origin layanan push', async () => {
    const keys = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair;
    const publicKey = base64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey)));
    const privateJwk = await crypto.subtle.exportKey('jwk', keys.privateKey);

    const header = await vapidAuthorization(
      'https://fcm.googleapis.com/fcm/send/xyz',
      { publicKey, privateJwk, subject: 'https://example.com/' },
      Date.UTC(2026, 10, 23),
    );

    const match = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header)!;
    expect(match).not.toBeNull();
    const [, head, claims, signature, k] = match;
    expect(k).toBe(publicKey);
    expect(JSON.parse(new TextDecoder().decode(base64urlDecode(claims)))).toEqual({
      aud: 'https://fcm.googleapis.com',
      exp: Date.UTC(2026, 10, 23) / 1000 + 12 * 3600,
      sub: 'https://example.com/',
    });
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      keys.publicKey,
      base64urlDecode(signature),
      new TextEncoder().encode(`${head}.${claims}`),
    );
    expect(valid).toBe(true);
  });
});
