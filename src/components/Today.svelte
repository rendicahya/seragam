<script lang="ts">
  import { addDays, diffDays, formatLong, formatShort } from '../lib/date';
  import { holidayOn, isDayOff, isHolidayDataExpired, nextHoliday, nextWorkday } from '../lib/holidays';
  import { uniformFor, weekOfMonth } from '../lib/uniform';
  import InstallPrompt from './InstallPrompt.svelte';

  let { today }: { today: string } = $props();

  let showNext = $state(false);

  const nextDate = $derived(nextWorkday(today));
  const nextLabel = $derived(nextDate === addDays(today, 1) ? 'Besok' : formatShort(nextDate));
  const viewed = $derived(showNext ? nextDate : today);

  const holiday = $derived(holidayOn(viewed));
  const dayOff = $derived(isDayOff(viewed));
  const uniform = $derived(uniformFor(viewed));

  const upcoming = $derived(nextHoliday(today));
  const upcomingDays = $derived(upcoming ? diffDays(today, upcoming.date) : 0);
  const upcomingCountdown = $derived(
    upcomingDays === 0 ? 'Hari ini' : upcomingDays === 1 ? 'Besok' : `${upcomingDays} hari lagi`,
  );
</script>

<header>
  <h1>👔 Pakai seragam apa hari ini?</h1>
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

{#if upcoming}
  <section class="holiday" aria-label="Tanggal merah terdekat">
    <div>
      <h3>🎉 Tanggal merah terdekat</h3>
      <p>{formatLong(upcoming.date)}</p>
      <p class="muted">{upcoming.type === 'cuti' ? 'Cuti bersama ' : ''}{upcoming.name}</p>
    </div>
    <strong>{upcomingCountdown}</strong>
  </section>
{/if}

{#if isHolidayDataExpired(today)}
  <p class="notice">Data hari libur sudah habis, jadi hanya akhir pekan yang dikenali sebagai libur.</p>
{/if}

<a class="calendar-link" href="#/kalender">Lihat kalender akademik 📅</a>

<InstallPrompt />

<style>
  h1 {
    font-size: 1.25rem;
    font-weight: 700;
    text-align: center;
  }

  .tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.25rem;
    padding: 0.25rem;
    border-radius: var(--radius);
    background: var(--surface-muted);
  }

  .tabs button {
    min-height: 2.75rem;
    padding: 0.25rem 0.5rem;
    border: 0;
    border-radius: 10px;
    background: transparent;
    font-weight: 600;
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

  .holiday {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    font-size: 0.9375rem;
  }

  .holiday h3 {
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .holiday strong {
    flex: none;
    color: var(--accent);
  }

  .muted {
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .calendar-link {
    display: block;
    padding: 0.625rem;
    text-align: center;
    font-weight: 600;
  }
</style>
