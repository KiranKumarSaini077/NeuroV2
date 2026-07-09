<script lang="ts">
  import { appData } from '$lib/sync/store';

  let sessions = $derived.by(() => [...$appData.history].reverse());
  let score = $derived.by(() => {
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
  <div style="flex:1;font-family:var(--mono);font-size:0.65rem;letter-spacing:3px;color:var(--text-dim);text-transform:uppercase;">Session History</div>
  <button class="btn btn-ghost" style="padding:8px 14px;font-size:0.8rem;" onclick={clearHistory}>🗑 Clear</button>
</div>

<div class="res-grid" style="margin-bottom:24px;">
  <div class="res-stat"><div class="res-stat-val">{sessions.length}</div><div class="res-stat-lbl">Sessions</div></div>
  <div class="res-stat"><div class="res-stat-val">{score}%</div><div class="res-stat-lbl">Average</div></div>
  <div class="res-stat"><div class="res-stat-val">{correct}</div><div class="res-stat-lbl">Correct</div></div>
  <div class="res-stat"><div class="res-stat-val">{total}</div><div class="res-stat-lbl">Total</div></div>
</div>

{#if sessions.length === 0}
  <div style="color:var(--text-dim);font-size:0.9rem;text-align:center;padding:40px 0;">No sessions recorded yet.</div>
{:else}
  {#each sessions as s}
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:0.75rem;">
      <div>
        <div style="font-weight:600;color:var(--text);">{s.mode}</div>
        <div style="color:var(--text-dim);font-size:0.65rem;">{s.diff} · {s.time}s</div>
      </div>
      <div style="text-align:right;">
        <div style="color:var(--accent);font-weight:700;">{s.score}%</div>
        <div style="color:var(--text-dim);font-size:0.65rem;">{s.correct}/{s.total}</div>
      </div>
    </div>
  {/each}
{/if}
