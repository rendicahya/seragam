<script lang="ts">
  import { PUSH_API, VAPID_PUBLIC_KEY } from '../lib/push-config';
  import { REMINDER_TIMES, type ReminderTime } from '../lib/reminder';

  type Status = 'loading' | 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

  const TIME_LABELS: Record<ReminderTime, string> = {
    pagi: 'Pagi, 06.00 WIB (seragam hari ini)',
    malam: 'Malam, 19.00 WIB (seragam besok)',
  };
  const TIMES_KEY = 'reminder-times';

  // Salinan lokal pilihan waktu untuk tampilan; yang berlaku adalah yang tersimpan di Worker.
  function loadTimes(): ReminderTime[] {
    try {
      const saved = JSON.parse(localStorage.getItem(TIMES_KEY) ?? 'null');
      const times = REMINDER_TIMES.filter((time) => Array.isArray(saved) && saved.includes(time));
      if (times.length > 0) return times;
    } catch {}
    return ['pagi'];
  }

  function saveTimes(value: ReminderTime[]) {
    try {
      localStorage.setItem(TIMES_KEY, JSON.stringify(value));
    } catch {}
  }

  let times = $state<ReminderTime[]>(loadTimes());

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
      const res = await postSubscribe(subscription, times, true);
      if (!res.ok) {
        await subscription.unsubscribe();
        throw new Error(`HTTP ${res.status}`);
      }
      saveTimes(times);
      status = 'on';
    } catch {
      error = 'Gagal mengaktifkan pengingat. Pastikan sedang online, lalu coba lagi.';
    } finally {
      busy = false;
    }
  }

  function postSubscribe(subscription: PushSubscription, selected: ReminderTime[], confirm = false) {
    return fetch(`${PUSH_API}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, times: selected, confirm }),
    });
  }

  async function toggleTime(time: ReminderTime, checked: boolean) {
    const previous = times;
    const next = REMINDER_TIMES.filter((t) => (t === time ? checked : times.includes(t)));
    if (next.length === 0) return;
    times = next;
    busy = true;
    error = '';
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        status = 'off';
        return;
      }
      const res = await postSubscribe(subscription, next);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      saveTimes(next);
    } catch {
      times = previous;
      error = 'Gagal menyimpan pilihan waktu. Pastikan sedang online, lalu coba lagi.';
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
    <div class="row">
      <p>
        {#if status === 'on'}
          🔔 Pengingat seragam aktif setiap hari kerja
        {:else}
          🔔 Ingatkan seragam setiap hari kerja
        {/if}
      </p>
      {#if status === 'on'}
        <button onclick={disable} disabled={busy}>{busy ? 'Memproses…' : 'Matikan'}</button>
      {:else}
        <button class="primary" onclick={enable} disabled={busy}>{busy ? 'Memproses…' : 'Aktifkan'}</button>
      {/if}
    </div>
    <fieldset class="times" disabled={busy}>
      <legend>Waktu pengingat</legend>
      {#each REMINDER_TIMES as time (time)}
        {@const checked = times.includes(time)}
        <label>
          <input
            type="checkbox"
            {checked}
            disabled={checked && times.length === 1}
            onchange={(event) => {
              const value = event.currentTarget.checked;
              if (status === 'on') toggleTime(time, value);
              else times = REMINDER_TIMES.filter((t) => (t === time ? value : times.includes(t)));
            }}
          />
          {TIME_LABELS[time]}
        </label>
      {/each}
    </fieldset>
  </section>
  {#if error}<p class="notice" role="alert">{error}</p>{/if}
{:else if status === 'denied'}
  <p class="hint">
    🔕 Notifikasi untuk situs ini diblokir. Izinkan notifikasi di pengaturan browser untuk mengaktifkan pengingat harian.
  </p>
{:else if status === 'needs-install'}
  <p class="hint">🔔 Pasang aplikasi ini ke Layar Utama untuk menerima pengingat seragam setiap hari kerja.</p>
{:else if status === 'unsupported'}
  <p class="hint">
    🔕 Browser ini tidak mendukung notifikasi pengingat. Buka aplikasi ini di browser yang mendukung notifikasi, seperti
    Chrome, Brave, Edge, atau Firefox (Android) atau Safari (iPhone), untuk menerima pengingat seragam.
  </p>
{/if}

<style>
  .reminder {
    padding: 0.625rem 0.625rem 0.75rem 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    font-size: 0.875rem;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .times {
    display: grid;
    gap: 0.375rem;
    margin: 0.5rem 0 0;
    padding: 0;
    border: 0;
    color: var(--text-muted);
  }

  .times legend {
    padding: 0;
    margin-bottom: 0.25rem;
    font-size: 0.8125rem;
  }

  .times label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 1.75rem;
    cursor: pointer;
  }

  .times input {
    width: 1.125rem;
    height: 1.125rem;
    margin: 0;
    accent-color: var(--accent);
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
