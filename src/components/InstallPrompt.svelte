<script lang="ts">
  interface InstallEvent extends Event {
    prompt(): Promise<void>;
  }

  const DISMISS_KEY = 'seragam:install-dismissed';

  function wasDismissed() {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  }

  const standalone =
    matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  const ios =
    /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  let installEvent = $state<InstallEvent | null>(null);
  let dismissed = $state(wasDismissed());

  const visible = $derived(!standalone && !dismissed && (installEvent !== null || ios));

  function onBeforeInstall(event: Event) {
    event.preventDefault();
    installEvent = event as InstallEvent;
  }

  $effect(() => {
    const onInstalled = () => (dismissed = true);
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  });

  async function install() {
    await installEvent?.prompt();
    installEvent = null;
  }

  function dismiss() {
    dismissed = true;
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Pilihan ini cukup berlaku untuk sesi sekarang jika penyimpanan diblokir.
    }
  }
</script>

<svelte:window onbeforeinstallprompt={onBeforeInstall} />

{#if visible}
  <aside>
    {#if installEvent}
      <p>Pasang aplikasi ini agar bisa dibuka cepat, juga saat offline.</p>
      <div class="actions">
        <button class="primary" onclick={install}>Pasang</button>
        <button onclick={dismiss}>Nanti saja</button>
      </div>
    {:else}
      <p>Untuk memasang aplikasi ini: buka di Safari, ketuk <b>Bagikan</b>, lalu <b>Tambah ke Layar Utama</b>.</p>
      <div class="actions">
        <button onclick={dismiss}>Mengerti</button>
      </div>
    {/if}
  </aside>
{/if}

<style>
  aside {
    padding: 1rem;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    font-size: 0.875rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  button {
    min-height: 2.5rem;
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
</style>
