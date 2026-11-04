<script lang="ts">
  import Calendar from './components/Calendar.svelte';
  import Today from './components/Today.svelte';
  import { todayWib } from './lib/date';

  const currentRoute = () => (location.hash === '#/kalender' ? 'kalender' : 'seragam');

  let route = $state(currentRoute());
  let today = $state(todayWib());

  // Aplikasi yang terpasang bisa terbuka berhari-hari, jadi tanggal harus dicek ulang.
  function refreshToday() {
    today = todayWib();
  }

  function onHashChange() {
    route = currentRoute();
    window.scrollTo(0, 0);
  }

  $effect(() => {
    const timer = setInterval(refreshToday, 60_000);
    return () => clearInterval(timer);
  });
</script>

<svelte:window onhashchange={onHashChange} onfocus={refreshToday} />
<svelte:document onvisibilitychange={refreshToday} />

<div class="page">
  {#if route === 'kalender'}
    <Calendar {today} />
  {:else}
    <Today {today} />
  {/if}
  <footer>Powered by ☕</footer>
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

  footer {
    margin-top: auto;
    padding-top: 0.5rem;
    text-align: center;
    font-size: 0.8125rem;
    color: var(--text-muted);
  }
</style>
