<script lang="ts">
  import '../app.css';
  import { appData } from '$lib/sync/store';
  import { page } from '$app/stores';

  let { children } = $props();

  let sidebarOpen = $state(false);

  let level = $derived(Math.max(1, Math.floor(Math.sqrt($appData.globalScore / 50)) + 1));
  let levelProgress = $derived.by(() => {
    const lvl = level;
    const cur = 50 * (lvl - 1) ** 2;
    const next = 50 * lvl ** 2;
    return ($appData.globalScore - cur) / (next - cur);
  });

  function pathMatch(id: string): boolean {
    if (id === 'dashboard') return $page.url.pathname === '/NeuroV2/' || $page.url.pathname === '/NeuroV2';
    return $page.url.pathname === '/NeuroV2/' + id;
  }

  const refs = [
    { id:'references/fractions', icon:'📘', label:'Fraction → %' },
    { id:'references/squares', icon:'📗', label:'Squares' },
    { id:'references/cubes', icon:'📙', label:'Cubes' },
  ];

  function topbarTitle(): string {
    const p = $page.url.pathname;
    if (p === '/NeuroV2/' || p === '/NeuroV2') return 'Dashboard';
    if (p.startsWith('/NeuroV2/references/')) return p.split('/').pop()!.replace(/^\w/, c => c.toUpperCase());
    if (p === '/NeuroV2/history') return 'Session History';
    if (p === '/NeuroV2/data') return 'Data Management';
    return p.replace('/NeuroV2/', '').replace(/^\w/, c => c.toUpperCase());
  }
</script>

<div class="bg-grid"></div>
<div class="bg-glow1"></div>
<div class="bg-glow2"></div>
<div class="app">
  <nav class="sidebar" class:open={sidebarOpen}>
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon">🧠</div>
        <div>
          <div class="logo-text">NeuroCalc</div>
          <div class="logo-sub">MATH BRAIN TRAINER</div>
        </div>
      </div>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-label">Overview</div>
      <a href="/NeuroV2/" class="nav-item" class:active={pathMatch('dashboard')}>
        <span class="nav-icon">⊞</span> Dashboard
      </a>
      <a href="/NeuroV2/history" class="nav-item" class:active={pathMatch('history')}>
        <span class="nav-icon">📋</span> History
      </a>
      <a href="/NeuroV2/data" class="nav-item" class:active={pathMatch('data')}>
        <span class="nav-icon">💾</span> Data
      </a>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-label">Practice</div>
      <a href="/NeuroV2/arithmetic" class="nav-item" class:active={pathMatch('arithmetic')}>
        <span class="nav-icon">🔢</span> Arithmetic
      </a>
      <a href="/NeuroV2/roots" class="nav-item" class:active={pathMatch('roots')}>
        <span class="nav-icon">√</span> Roots
      </a>
      <a href="/NeuroV2/fractions" class="nav-item" class:active={pathMatch('fractions')}>
        <span class="nav-icon">%</span> Fractions
      </a>
      <a href="/NeuroV2/mixed" class="nav-item" class:active={pathMatch('mixed')}>
        <span class="nav-icon">🎲</span> Mixed
      </a>
      <a href="/NeuroV2/memory" class="nav-item" class:active={pathMatch('memory')}>
        <span class="nav-icon">🧩</span> Memory
      </a>
      <a href="/NeuroV2/tables" class="nav-item" class:active={pathMatch('tables')}>
        <span class="nav-icon">📊</span> Tables
      </a>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-label">References</div>
      {#each refs as r}
        <a href="/NeuroV2/{r.id}" class="nav-item" class:active={pathMatch(r.id)}>
          <span class="nav-icon">{r.icon}</span> {r.label}
        </a>
      {/each}
    </div>
    <div class="sidebar-footer">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="font-size:1.6rem;">🏆</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-family:var(--mono);font-size:0.6rem;color:var(--text-dim);">LEVEL</span>
            <span style="font-family:var(--mono);font-size:0.85rem;font-weight:700;color:var(--accent);">{level}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
            <div style="flex:1;height:3px;background:var(--border);border-radius:2px;overflow:hidden;">
              <div style="height:100%;background:linear-gradient(90deg,var(--accent5),var(--accent));border-radius:2px;width:{Math.round(levelProgress * 100)}%;transition:width .5s;"></div>
            </div>
            <span style="font-family:var(--mono);font-size:0.55rem;color:var(--text-dim);">{$appData.globalScore} XP</span>
          </div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:10px;font-family:var(--mono);font-size:0.6rem;color:var(--text-dim);">
        <span>Sessions: <strong style="color:var(--accent);">{$appData.history.length}</strong></span>
        <span>Streak: <strong style="color:var(--accent3);">{$appData.streak}🔥</strong></span>
      </div>
    </div>
  </nav>
  <div class="main">
    <header class="topbar">
      <button onclick={() => sidebarOpen = !sidebarOpen} style="background:none;border:none;color:var(--text);font-size:1.5rem;cursor:pointer;margin-right:16px;display:flex;flex-direction:column;gap:4px;padding:4px;">
        <span style="display:block;width:22px;height:2px;background:var(--text);border-radius:1px;"></span>
        <span style="display:block;width:22px;height:2px;background:var(--text);border-radius:1px;"></span>
        <span style="display:block;width:22px;height:2px;background:var(--text);border-radius:1px;"></span>
      </button>
      <div>
        <div class="topbar-title">{topbarTitle()}</div>
        <div class="topbar-sub">Your training hub</div>
      </div>
    </header>
    <div class="content">
      {@render children()}
    </div>
  </div>
</div>

<style>
  @media(max-width:768px){
    .sidebar{display:none;position:fixed;z-index:100;width:280px;height:100dvh;}
    .sidebar.open{display:flex;}
    .sidebar.open ~ .main .content { filter: brightness(0.7); }
  }
</style>
