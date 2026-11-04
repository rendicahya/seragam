<script lang="ts">
  type Theme = 'light' | 'dark';

  // Nama kunci ini juga dibaca skrip di index.html agar tema terpasang sebelum halaman tampil.
  const STORAGE_KEY = 'seragam:theme';
  const BAR_COLORS: Record<Theme, string> = { light: '#f6f4ef', dark: '#16171a' };

  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const systemTheme = (): Theme => (systemDark.matches ? 'dark' : 'light');

  const chosen = document.documentElement.dataset.theme as Theme | undefined;
  let theme = $state<Theme>(chosen ?? systemTheme());
  let followsSystem = !chosen;

  const nextLabel = $derived(theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');

  function toggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
    followsSystem = false;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Pilihan ini cukup berlaku untuk sesi sekarang jika penyimpanan diblokir.
    }
  }

  $effect(() => {
    const onSystemChange = () => {
      if (followsSystem) theme = systemTheme();
    };
    systemDark.addEventListener('change', onSystemChange);
    return () => systemDark.removeEventListener('change', onSystemChange);
  });

  $effect(() => {
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      meta.content = BAR_COLORS[theme];
    }
  });
</script>

<button onclick={toggle} aria-label={nextLabel} title={nextLabel}>
  {#if theme === 'dark'}
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  {:else}
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  {/if}
</button>

<style>
  button {
    flex: none;
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: var(--surface);
    cursor: pointer;
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
