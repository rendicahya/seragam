<script lang="ts">
  import { addDays, formatLong, formatShort } from '../lib/date';
  import { holidayOn, isDayOff, isHolidayDataExpired, nextWorkday } from '../lib/holidays';
  import { uniformFor, weekOfMonth } from '../lib/uniform';
  import InstallPrompt from './InstallPrompt.svelte';
  import ThemeToggle from './ThemeToggle.svelte';

  let { today }: { today: string } = $props();

  let showNext = $state(false);

  const nextDate = $derived(nextWorkday(today));
  const nextLabel = $derived(nextDate === addDays(today, 1) ? 'Besok' : formatShort(nextDate));
  const viewed = $derived(showNext ? nextDate : today);

  const holiday = $derived(holidayOn(viewed));
  const dayOff = $derived(isDayOff(viewed));
  const uniform = $derived(uniformFor(viewed));
</script>

<header>
  <h1>👔 Pakai seragam apa hari ini?</h1>
  <ThemeToggle />
</header>

<div class="tabs" role="group" aria-label="Pilih hari">
  <button aria-pressed={!showNext} onclick={() => (showNext = false)}>Hari ini</button>
  <button aria-pressed={showNext} onclick={() => (showNext = true)}>{nextLabel}</button>
</div>

<main class="card">
  <p class="date">
    {formatLong(viewed)}{dayOff ? '' : ` · Minggu ke-${weekOfMonth(viewed)}`}
  </p>

  {#if holiday}
    <h2 class="name">Libur</h2>
    <p class="detail">{holiday.type === 'cuti' ? 'Cuti bersama' : 'Hari libur nasional'}: {holiday.name}</p>
  {:else}
    <h2 class="name">
      {#if uniform.swatch}<span class="swatch" style:background={uniform.swatch} aria-hidden="true"></span>{/if}
      {uniform.name}
    </h2>
    <p class="detail">{uniform.detail}</p>
    {#if uniform.image}
      <img src={uniform.image.src} width={uniform.image.width} height={uniform.image.height} alt="Foto seragam {uniform.name}" />
      {#if uniform.image.starred}
        <p class="caption">Seragam yang dimaksud ditandai bintang ⭐</p>
      {/if}
    {/if}
  {/if}
</main>

{#if isHolidayDataExpired(today)}
  <p class="notice">Data hari libur sudah habis, jadi hanya akhir pekan yang dikenali sebagai libur.</p>
{/if}

<InstallPrompt />

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  h1 {
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1.3;
  }

  .tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.125rem;
    width: fit-content;
    margin-inline: auto;
    padding: 0.1875rem;
    border-radius: 10px;
    background: var(--surface-muted);
  }

  .tabs button {
    min-height: 2rem;
    padding: 0.125rem 0.875rem;
    border: 0;
    border-radius: 8px;
    background: transparent;
    font-size: 0.875rem;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
  }

  .tabs button[aria-pressed='true'] {
    background: var(--accent);
    color: var(--accent-text);
  }

  .card {
    padding: 1.25rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }

  .date {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .name {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    margin-top: 0.25rem;
    font-size: 1.75rem;
    font-weight: 750;
    line-height: 1.2;
  }

  .swatch {
    flex: none;
    width: 1.25rem;
    height: 1.25rem;
    border: 1px solid var(--text-muted);
    border-radius: 50%;
  }

  .detail {
    margin-top: 0.375rem;
    color: var(--text-muted);
  }

  img {
    display: block;
    width: 100%;
    height: auto;
    margin-top: 1rem;
    border-radius: 10px;
    background: var(--surface-muted);
  }

  .caption {
    margin-top: 0.5rem;
    font-size: 0.8125rem;
    color: var(--text-muted);
  }
</style>
