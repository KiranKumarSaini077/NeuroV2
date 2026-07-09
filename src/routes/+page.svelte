<script lang="ts">
  import { appData } from '$lib/sync/store';
  import { onMount } from 'svelte';

  let recentSessions = $derived.by(() => [...$appData.history].reverse().slice(0, 5));
</script>

<div class="config-panel">
  <div class="config-panel-title">⊞ Dashboard</div>
  <div class="config-panel-sub">Your training hub — pick a mode from the sidebar to begin.</div>

  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-top:16px;">
    <a href="/NeuroV2/arithmetic" class="dash-card">
      <div class="dash-card-icon">🔢</div>
      <div class="dash-card-title">Arithmetic</div>
      <div class="dash-card-sub">Speed calculation</div>
    </a>
    <a href="/NeuroV2/roots" class="dash-card">
      <div class="dash-card-icon">√</div>
      <div class="dash-card-title">Roots</div>
      <div class="dash-card-sub">Squares & cubes</div>
    </a>
    <a href="/NeuroV2/fractions" class="dash-card">
      <div class="dash-card-icon">%</div>
      <div class="dash-card-title">Fractions</div>
      <div class="dash-card-sub">↔ Percentages</div>
    </a>
    <a href="/NeuroV2/mixed" class="dash-card">
      <div class="dash-card-icon">🎲</div>
      <div class="dash-card-title">Mixed</div>
      <div class="dash-card-sub">Everything at once</div>
    </a>
    <a href="/NeuroV2/memory" class="dash-card">
      <div class="dash-card-icon">🧩</div>
      <div class="dash-card-title">Memory</div>
      <div class="dash-card-sub">Recall mode</div>
    </a>
    <a href="/NeuroV2/tables" class="dash-card">
      <div class="dash-card-icon">📊</div>
      <div class="dash-card-title">Tables</div>
      <div class="dash-card-sub">×1 to ×25</div>
    </a>
  </div>
</div>

<div class="config-panel">
  <div class="config-panel-title">📋 Recent Sessions</div>
  {#if recentSessions.length === 0}
    <div style="color:var(--text-dim);font-size:0.85rem;">No sessions yet. Start practicing!</div>
  {:else}
    {#each recentSessions as s}
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:0.75rem;">
        <span style="color:var(--text-mid);">{s.mode}</span>
        <span>{s.correct}/{s.total} · {s.score}%</span>
      </div>
    {/each}
  {/if}
</div>

<style>
  .dash-card {
    background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 20px; text-align: center; cursor: pointer; transition: var(--transition);
    text-decoration: none; color: inherit; display: block;
  }
  .dash-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: var(--shadow); }
  .dash-card-icon { font-size: 1.8rem; margin-bottom: 8px; }
  .dash-card-title { font-weight: 700; font-size: 0.95rem; }
  .dash-card-sub { font-size: 0.72rem; color: var(--text-dim); margin-top: 2px; }
</style>
