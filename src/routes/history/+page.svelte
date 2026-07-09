<script lang="ts">
  import { appData } from '$lib/sync/store';

  let sessions = $derived.by(() => [...$appData.history].reverse());
  let avgScore = $derived.by(() => {
    if (sessions.length === 0) return 0;
    return Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length);
  });
  let correct = $derived(sessions.reduce((a, s) => a + s.correct, 0));
  let total = $derived(sessions.reduce((a, s) => a + s.total, 0));

  function clearHistory() {
    if (!confirm('Clear all session history?')) return;
    appData.update(d => ({ ...d, history: [] }));
  }
</script>

<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
  <div style="flex:1;" class="section-label">Session History</div>
  <button class="btn btn-ghost" style="padding:8px 14px;font-size:0.8rem;" onclick={clearHistory}>🗑 Clear</button>
</div>

<div class="res-grid" style="margin-bottom:24px;">
  <div class="res-stat"><div class="res-stat-val">{sessions.length}</div><div class="res-stat-lbl">Sessions</div></div>
  <div class="res-stat"><div class="res-stat-val">{avgScore}%</div><div class="res-stat-lbl">Average</div></div>
  <div class="res-stat"><div class="res-stat-val">{correct}</div><div class="res-stat-lbl">Correct</div></div>
  <div class="res-stat"><div class="res-stat-val">{total}</div><div class="res-stat-lbl">Total</div></div>
</div>

{#if sessions.length === 0}
  <div class="empty-state">No sessions recorded yet.</div>
{:else}
  <div class="hist-list">
    {#each sessions as s}
      <div class="hist-item">
        <span class="hist-score">{s.score}%</span>
        <span class="hist-mode">{s.mode} · {s.correct}/{s.total}</span>
        {#if s.diff}<span class="badge badge-{['easy','medium','hard','mastered'].includes(s.diff) ? s.diff : 'math'}">{s.diff}</span>{/if}
        {#if s.time}<span class="hist-time">{s.time}s</span>{/if}
        {#if s.date}<span class="hist-time">{s.date}</span>{/if}
      </div>
    {/each}
  </div>
{/if}
