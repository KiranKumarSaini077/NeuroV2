<script lang="ts">
  import { appData } from '$lib/sync/store';

  let recentSessions = $derived.by(() => [...$appData.history].reverse().slice(0, 5));
  let level = $derived(Math.max(1, Math.floor(Math.sqrt($appData.globalScore / 50)) + 1));
</script>

<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:28px 32px;margin-bottom:24px;box-shadow:var(--shadow-sm);">
  <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
    <div style="font-size:3rem;line-height:1;flex-shrink:0;">🧠</div>
    <div style="flex:1;min-width:200px;">
      <div style="font-size:1.4rem;font-weight:800;margin-bottom:2px;">Welcome back!</div>
      <div style="color:var(--text-dim);font-size:0.85rem;">Select a mode below to start training.</div>
    </div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;">
      <div style="text-align:center;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 20px;min-width:80px;">
        <div style="font-family:var(--mono);font-size:1.5rem;font-weight:700;color:var(--accent);">{level}</div>
        <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;">Level</div>
      </div>
      <div style="text-align:center;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 20px;min-width:80px;">
        <div style="font-family:var(--mono);font-size:1.5rem;font-weight:700;color:var(--accent3);">{$appData.streak}</div>
        <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;">Streak</div>
      </div>
      <div style="text-align:center;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 20px;min-width:80px;">
        <div style="font-family:var(--mono);font-size:1.5rem;font-weight:700;color:var(--accent4);">{$appData.globalScore}</div>
        <div style="font-family:var(--mono);font-size:0.55rem;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;">XP</div>
      </div>
    </div>
  </div>
</div>

<div class="section-label">Quick Start</div>
<div class="dash-grid">
  <a href="/NeuroV2/arithmetic" class="dash-card green">
    <div class="dash-card-icon">🔢</div>
    <div class="dash-card-title">Arithmetic Drill</div>
    <div class="dash-card-sub">+, −, ×, ÷ speed practice</div>
    <div class="dash-card-arrow">›</div>
  </a>
  <a href="/NeuroV2/tables" class="dash-card blue">
    <div class="dash-card-icon">📊</div>
    <div class="dash-card-title">Tables Mastery</div>
    <div class="dash-card-sub">Learn ×1 to ×25 with spaced repetition</div>
    <div class="dash-card-arrow">›</div>
  </a>
  <a href="/NeuroV2/roots" class="dash-card yellow">
    <div class="dash-card-icon">√</div>
    <div class="dash-card-title">Square & Cube Roots</div>
    <div class="dash-card-sub">Progressive root memorization</div>
    <div class="dash-card-arrow">›</div>
  </a>
  <a href="/NeuroV2/fractions" class="dash-card purple">
    <div class="dash-card-icon">%</div>
    <div class="dash-card-title">Fractions ↔ Percentages</div>
    <div class="dash-card-sub">Conversion mastery</div>
    <div class="dash-card-arrow">›</div>
  </a>
  <a href="/NeuroV2/memory" class="dash-card" style="--card-accent:var(--accent5);">
    <div class="dash-card-icon">🧩</div>
    <div class="dash-card-title">Memory Calculation</div>
    <div class="dash-card-sub">Memorize sets, recall from memory</div>
    <div class="dash-card-arrow">›</div>
  </a>
  <a href="/NeuroV2/mixed-practice" class="dash-card" style="--card-accent:var(--accent2);">
    <div class="dash-card-icon">🎲</div>
    <div class="dash-card-title">Mixed Practice</div>
    <div class="dash-card-sub">Random challenge from all modes</div>
    <div class="dash-card-arrow">›</div>
  </a>
</div>

<div class="section-label">Recent Sessions</div>
{#if recentSessions.length === 0}
  <div class="empty-state">No sessions yet. Start practicing!</div>
{:else}
  <div class="hist-list">
    {#each recentSessions as s}
      <div class="hist-item">
        <span class="hist-score">{s.score}%</span>
        <span class="hist-mode">{s.mode} · {s.correct}/{s.total}</span>
        {#if s.date}<span class="hist-time">{s.date}</span>{/if}
      </div>
    {/each}
  </div>
{/if}
