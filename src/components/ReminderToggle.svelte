<script lang="ts">
  import { PUSH_API, VAPID_PUBLIC_KEY } from '../lib/push-config';

  type Status = 'loading' | 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const standalone =
    matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  const ios =
    /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Di iPhone/iPad, push hanya tersedia setelah aplikasi dipasang ke Layar Utama.
  let status = $state<Status>(supported ? 'loading' : ios && !standalone ? 'needs-install' : 'unsupported');
  let busy = $state(false);
  let error = $state('');

  function applicationServerKey() {
    const base64 = VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  }

  $effect(() => {
    if (!supported) return;
    // Service worker tidak aktif saat `npm run dev`, jadi status tetap 'loading' (tidak tampil).
    navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      status = subscription ? 'on' : Notification.permission === 'denied' ? 'denied' : 'off';
    });
  });

  async function enable() {
    busy = true;
    error = '';
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        status = permission === 'denied' ? 'denied' : 'off';
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(),
      });
      const res = await fetch(`${PUSH_API}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, confirm: true }),
      });
      if (!res.ok) {
        await subscription.unsubscribe();
        throw new Error(`HTTP ${res.status}`);
      }
      status = 'on';
    } catch {
      error = 'Gagal mengaktifkan pengingat. Pastikan sedang online, lalu coba lagi.';
    } finally {
      busy = false;
    }
  }

  async function disable() {
    busy = true;
    error = '';
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Jika server tidak terjangkau, langganan yang sudah dibatalkan akan dihapus saat pengiriman berikutnya.
        fetch(`${PUSH_API}/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => {});
        await subscription.unsubscribe();
      }
      status = 'off';
    } catch {
      error = 'Gagal mematikan pengingat. Coba lagi.';
    } finally {
      busy = false;
    }
  }
</script>

{#if status === 'off' || status === 'on'}
  <section class="reminder">
    <p>
      {#if status === 'on'}
        🔔 Pengingat aktif setiap hari kerja pukul 06.00 WIB
      {:else}
        🔔 Ingatkan seragam setiap hari kerja pukul 06.00 WIB
      {/if}
    </p>
    {#if status === 'on'}
      <button onclick={disable} disabled={busy}>{busy ? 'Memproses…' : 'Matikan'}</button>
    {:else}
      <button class="primary" onclick={enable} disabled={busy}>{busy ? 'Memproses…' : 'Aktifkan'}</button>
    {/if}
  </section>
  {#if error}<p class="notice" role="alert">{error}</p>{/if}
{:else if status === 'denied'}
  <p class="hint">
    🔕 Notifikasi untuk situs ini diblokir. Izinkan notifikasi di pengaturan browser untuk mengaktifkan pengingat harian.
  </p>
{:else if status === 'needs-install'}
  <p class="hint">🔔 Pasang aplikasi ini ke Layar Utama untuk menerima pengingat seragam setiap pagi.</p>
{:else if status === 'unsupported'}
  <p class="hint">
    🔕 Browser ini tidak mendukung notifikasi pengingat. Buka aplikasi ini di Chrome (Android) atau Safari (iPhone)
    untuk menerima pengingat setiap pagi.
  </p>
{/if}

<style>
  .reminder {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.625rem 0.625rem 0.625rem 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    font-size: 0.875rem;
  }

  button {
    flex: none;
    min-height: 2.25rem;
    padding: 0 1rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: transparent;
    font-weight: 600;
    cursor: pointer;
  }

  .primary {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--accent-text);
  }

  button:disabled {
    opacity: 0.7;
    cursor: progress;
  }

  .hint {
    font-size: 0.875rem;
    color: var(--text-muted);
  }
</style>
