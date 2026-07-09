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
  let bestScore = $derived.by(() => {
    const scores = $appData.history.map(h => h.score).filter(s => s > 0);
    return scores.length ? Math.max(...scores) + '%' : '—';
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
    if (p === '/NeuroV2/mixed-numbers') return 'Mixed Numbers';
    if (p === '/NeuroV2/mixed-practice') return 'Mixed Practice';
    return p.replace('/NeuroV2/', '').replace(/^\w/, c => c.toUpperCase());
  }

  function topbarSub(): string {
    const p = $page.url.pathname;
    const subs: Record<string,string> = {
      'dashboard': 'Your training hub',
      'arithmetic': 'Speed calculation practice',
      'tables': 'Learn ×1 to ×25 with spaced repetition',
      'roots': 'Squares & cubes',
      'fractions': 'Conversion mastery',
      'memory': 'Memorize → Recall mode',
      'mixed-numbers': 'Improper fraction conversion',
      'mixed-practice': 'Everything at once',
      'history': 'All past sessions',
      'data': 'Export / Import your progress',
    };
    const key = p.replace('/NeuroV2/', '') || 'dashboard';
    return subs[key] || 'Your training hub';
  }

  function closeSidebar() { sidebarOpen = false; }
</script>

<div class="sidebar-overlay" class:show={sidebarOpen} onclick={closeSidebar}></div>
<div class="bg-grid"></div>
<div class="bg-glow1"></div>
<div class="bg-glow2"></div>
<div class="app">
  <nav class="sidebar" class:open={sidebarOpen}>
    <button class="sidebar-close" onclick={closeSidebar}>✕</button>
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
      <a href="/NeuroV2/" class="nav-item" class:active={pathMatch('dashboard')} onclick={closeSidebar}>
        <span class="nav-icon">⊞</span> Dashboard
      </a>
      <a href="/NeuroV2/history" class="nav-item" class:active={pathMatch('history')} onclick={closeSidebar}>
        <span class="nav-icon">📋</span> History
      </a>
      <a href="/NeuroV2/data" class="nav-item" class:active={pathMatch('data')} onclick={closeSidebar}>
        <span class="nav-icon">💾</span> Data
      </a>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-label">Practice</div>
      <a href="/NeuroV2/arithmetic" class="nav-item" class:active={pathMatch('arithmetic')} onclick={closeSidebar}>
        <span class="nav-icon">🔢</span> Arithmetic
      </a>
      <a href="/NeuroV2/tables" class="nav-item" class:active={pathMatch('tables')} onclick={closeSidebar}>
        <span class="nav-icon">📊</span> Tables <span class="nav-badge">1-25</span>
      </a>
      <a href="/NeuroV2/roots" class="nav-item" class:active={pathMatch('roots')} onclick={closeSidebar}>
        <span class="nav-icon">√</span> Roots
      </a>
      <a href="/NeuroV2/fractions" class="nav-item" class:active={pathMatch('fractions')} onclick={closeSidebar}>
        <span class="nav-icon">%</span> Fractions
      </a>
      <a href="/NeuroV2/memory" class="nav-item" class:active={pathMatch('memory')} onclick={closeSidebar}>
        <span class="nav-icon">🧩</span> Memory
      </a>
      <a href="/NeuroV2/mixed-practice" class="nav-item" class:active={pathMatch('mixed-practice')} onclick={closeSidebar}>
        <span class="nav-icon">🎲</span> Mixed Practice
      </a>
      <a href="/NeuroV2/mixed-numbers" class="nav-item" class:active={pathMatch('mixed-numbers')} onclick={closeSidebar}>
        <span class="nav-icon">🔀</span> Mixed Numbers
      </a>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-label">References</div>
      {#each refs as r}
        <a href="/NeuroV2/{r.id}" class="nav-item" class:active={pathMatch(r.id)} onclick={closeSidebar}>
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
      <button onclick={() => sidebarOpen = !sidebarOpen} class="hamburger" class:open={sidebarOpen}>
        <span></span><span></span><span></span>
      </button>
      <div style="flex:1;min-width:0;">
        <div class="topbar-title">{topbarTitle()}</div>
        <div class="topbar-sub">{topbarSub()}</div>
      </div>
      <div class="stats-row">
        <div class="mini-stat">Sessions <span class="mini-stat-val">{$appData.history.length}</span></div>
        <div class="mini-stat">Best <span class="mini-stat-val">{bestScore}</span></div>
        <div class="mini-stat">Streak <span class="mini-stat-val">{$appData.streak}</span></div>
        <div class="mini-stat">XP <span class="mini-stat-val">{$appData.globalScore}</span></div>
        <div class="mini-stat">Lv. <span class="mini-stat-val">{level}</span></div>
      </div>
    </header>
    <div class="content">
      {@render children()}
    </div>
  </div>
</div>

<nav class="bottom-nav">
  <div class="bottom-nav-inner">
    <a href="/NeuroV2/" class="b-nav-item" class:active={pathMatch('dashboard')}>
      <span class="b-nav-icon">⊞</span>
      <span class="b-nav-label">Home</span>
    </a>
    <a href="/NeuroV2/arithmetic" class="b-nav-item" class:active={pathMatch('arithmetic')}>
      <span class="b-nav-icon">🔢</span>
      <span class="b-nav-label">Math</span>
    </a>
    <a href="/NeuroV2/tables" class="b-nav-item" class:active={pathMatch('tables')}>
      <span class="b-nav-icon">📊</span>
      <span class="b-nav-label">Tables</span>
    </a>
    <a href="/NeuroV2/roots" class="b-nav-item" class:active={pathMatch('roots')}>
      <span class="b-nav-icon">√</span>
      <span class="b-nav-label">Roots</span>
    </a>
    <a href="/NeuroV2/mixed-practice" class="b-nav-item" class:active={pathMatch('mixed-practice')}>
      <span class="b-nav-icon">🎲</span>
      <span class="b-nav-label">Mixed</span>
    </a>
  </div>
</nav>

<style>
  .hamburger{background:none;border:none;color:var(--text);cursor:pointer;padding:8px;width:44px;height:44px;display:flex;flex-direction:column;justify-content:center;gap:5px;flex-shrink:0;}
  .hamburger span{display:block;width:24px;height:2px;background:var(--text);border-radius:2px;transition:0.3s;}
  .hamburger.open span:nth-child(1){transform:translateY(7px) rotate(45deg);}
  .hamburger.open span:nth-child(2){opacity:0;}
  .hamburger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg);}
</style>
