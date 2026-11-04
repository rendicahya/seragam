<script lang="ts">
  import Today from './components/Today.svelte';
  import { todayWib } from './lib/date';

  let today = $state(todayWib());

  // Aplikasi yang terpasang bisa terbuka berhari-hari, jadi tanggal harus dicek ulang.
  function refreshToday() {
    today = todayWib();
  }

  $effect(() => {
    const timer = setInterval(refreshToday, 60_000);
    return () => clearInterval(timer);
  });
</script>

<svelte:window onfocus={refreshToday} />
<svelte:document onvisibilitychange={refreshToday} />

<div class="page">
  <Today {today} />
</div>

<style>
  .page {
    max-width: 30rem;
    min-height: 100dvh;
    margin: 0 auto;
    padding: calc(1.25rem + env(safe-area-inset-top)) calc(1rem + env(safe-area-inset-right))
      calc(1.25rem + env(safe-area-inset-bottom)) calc(1rem + env(safe-area-inset-left));
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
