<script lang="ts">
  import data from '../data/kalender-genap-2025-2026.json';
  import { formatDate } from '../lib/date';

  interface CalendarEvent {
    id: string;
    nama_kegiatan: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    keterangan?: string | null;
    deskripsi?: string;
    sub_kegiatan?: string[];
  }

  let { today }: { today: string } = $props();

  const byEndDate = (events: CalendarEvent[]) =>
    [...events].sort((a, b) => a.tanggal_selesai.localeCompare(b.tanggal_selesai));

  const sections = [
    { title: 'Kegiatan Proses Belajar Mengajar', events: byEndDate(data.kegiatan_perkuliahan) },
    { title: 'PKL, Capstone, dan Magang Berdampak', events: byEndDate(data.kegiatan_pkl_capstone_magang) },
    { title: 'Skripsi', events: byEndDate(data.kegiatan_skripsi) },
    { title: 'Tesis', events: byEndDate(data.kegiatan_tesis) },
  ];

  const allEvents = sections.flatMap((section) => section.events);
  const semesterEnd = allEvents.reduce((end, event) => (event.tanggal_selesai > end ? event.tanggal_selesai : end), '');

  const isCurrent = (event: CalendarEvent) => event.tanggal_mulai <= today && today <= event.tanggal_selesai;
  const hasCurrent = $derived(allEvents.some(isCurrent));
  const finished = $derived(today > semesterEnd);

  const fullDate = (date: string) => formatDate(date, { day: 'numeric', month: 'short', year: 'numeric' });

  function dateRange(event: CalendarEvent) {
    return event.tanggal_mulai === event.tanggal_selesai
      ? fullDate(event.tanggal_mulai)
      : `${fullDate(event.tanggal_mulai)} – ${fullDate(event.tanggal_selesai)}`;
  }

  function scrollToCurrent() {
    document.querySelector('.current')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  $effect(() => {
    if (hasCurrent) scrollToCurrent();
  });
</script>

<header>
  <a href="#/">← Kembali</a>
  <h1>{data.metadata.judul}</h1>
  <p>{data.metadata.fakultas}, {data.metadata.universitas}</p>
</header>

{#if finished}
  <p class="notice">
    Semester ini sudah berakhir pada {fullDate(semesterEnd)}. Kalender semester berikutnya belum tersedia.
  </p>
{:else if hasCurrent}
  <button class="jump" onclick={scrollToCurrent}>Lompat ke hari ini 📍</button>
{/if}

<main>
  {#each sections as section, index}
    <section>
      <h2>{index + 1}. {section.title}</h2>
      <ol>
        {#each section.events as event (event.id)}
          <li class:current={isCurrent(event)}>
            <p class="event-name">{event.nama_kegiatan}</p>
            <p class="event-date">{dateRange(event)}</p>
            {#if event.sub_kegiatan}
              <p class="event-note">{event.sub_kegiatan.join(' · ')}</p>
            {/if}
            {#if event.deskripsi}
              <p class="event-note">{event.deskripsi}</p>
            {/if}
            {#if event.keterangan}
              <p class="event-note">{event.keterangan}</p>
            {/if}
          </li>
        {/each}
      </ol>
    </section>
  {/each}

  <section>
    <h2>{sections.length + 1}. Ketentuan Umum</h2>
    <div class="rules">
      <h3>Jumlah Pertemuan</h3>
      <p>
        Setiap mata kuliah wajib dilaksanakan 16 pertemuan per semester, secara umum terdiri atas 14 kali perkuliahan,
        Ujian Tengah Semester (UTS), dan Ujian Akhir Semester (UAS).
      </p>
      <h3>Perkuliahan Pengganti</h3>
      <p>
        Perkuliahan pengganti dapat dilaksanakan maksimal tiga kali dalam bentuk pembelajaran daring (sinkron atau
        asinkron) untuk setiap mata kuliah. Beban pertemuan pengganti harus sesuai jumlah SKS mata kuliah dan merujuk
        Pedoman Akademik UB 2024/2025.
      </p>
      <h3>Perkuliahan dalam Bentuk Pembelajaran Daring</h3>
      <ul>
        <li><b>Daring Sinkron:</b> menggunakan Zoom/Gmeet dengan anjuran durasi maksimal ±60 menit/sesi</li>
        <li><b>Daring Asinkron:</b> menggunakan LMS BRONE dalam bentuk modul, video, forum, atau penugasan</li>
      </ul>
      <h3>Presensi</h3>
      <ul>
        <li>Pelaksanaan perkuliahan daring sinkron dan/atau asinkron wajib dicatat melalui SIADO</li>
        <li>Aktivitas asinkron wajib dibuktikan dengan penugasan/tugas di LMS BRONE</li>
      </ul>
    </div>
  </section>
</main>

<style>
  header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  header a {
    align-self: flex-start;
    padding: 0.5rem 0;
    font-weight: 600;
  }

  h1 {
    font-size: 1.375rem;
    line-height: 1.25;
  }

  header p {
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .jump {
    min-height: 2.75rem;
    border: 0;
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 600;
    cursor: pointer;
  }

  main {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  h2 {
    margin-bottom: 0.625rem;
    font-size: 1.0625rem;
  }

  ol {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  ol > li {
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
  }

  ol > li.current {
    border-color: var(--accent);
    background: var(--current-bg);
  }

  .event-name {
    font-weight: 600;
    font-size: 0.9375rem;
  }

  .event-date,
  .event-note {
    margin-top: 0.125rem;
    font-size: 0.8125rem;
    color: var(--text-muted);
  }

  .rules {
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    font-size: 0.875rem;
  }

  .rules h3 {
    margin: 1rem 0 0.25rem;
    font-size: 0.9375rem;
  }

  .rules h3:first-child {
    margin-top: 0;
  }

  .rules ul {
    margin: 0;
    padding-left: 1.25rem;
  }
</style>
