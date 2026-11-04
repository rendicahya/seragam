<script lang="ts">
  import { registerSW } from 'virtual:pwa-register';

  const CHECK_INTERVAL_MS = 60 * 60 * 1000;

  let updateReady = $state(false);
  let updating = $state(false);

  const applyUpdate = registerSW({
    onNeedRefresh() {
      updateReady = true;
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;

      // Aplikasi yang terpasang jarang dimuat ulang, jadi versi baru perlu dicek sendiri.
      const checkForUpdate = () => {
        if (document.visibilityState === 'visible' && navigator.onLine && !registration.installing) {
          registration.update().catch(() => {});
        }
      };
      setInterval(checkForUpdate, CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', checkForUpdate);
    },
  });

  function update() {
    updating = true;
    applyUpdate(true);
  }
</script>

{#if updateReady}
  <div class="update" role="status">
    <span>Versi baru tersedia</span>
    <button onclick={update} disabled={updating}>{updating ? 'Memperbarui…' : 'Update'}</button>
  </div>
{/if}

<style>
  .update {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.5rem 0.5rem 0.5rem 1rem;
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    background: var(--surface);
    font-size: 0.875rem;
    font-weight: 600;
  }

  button {
    min-height: 2.25rem;
    padding: 0 1rem;
    border: 0;
    border-radius: 10px;
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 600;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.7;
    cursor: progress;
  }
</style>
