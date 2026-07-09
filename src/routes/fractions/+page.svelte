<script lang="ts">
  import { appData } from '$lib/sync/store';
  import { FRACTIONS_TO_PERCENT, PERCENT_TO_FRACTIONS, DEFAULT_FRAC_SELECTED } from '$lib/constants';
  import { rnd, shuffle, flash, flashCard, flashCardWrong, confetti, dateStamp } from '$lib/utils';

  let view = $state<'config' | 'practice'>('config');
  let modes = $state<string[]>(['frac-pct']);
  let hint = $state('');
  let score = $state(0);
  let correct = $state(0);
  let total = $state(0);
  let streak = $state<number[]>([]);
  let pending = $state(false);
  let answer: string = $state('');
  let qHtml = $state('');
  let timed = $state(false);
  let timeSelect = $state('60');
  let drillTimerInt: ReturnType<typeof setInterval> | null = null;
  let drillTimeLeft = $state(0);

  let pool = $state<string[]>([...DEFAULT_FRAC_SELECTED]);
  let sessMastered = $state(0);
  let itemCorrectCount: Record<string, number> = {};
  let masteredItems: string[] = [];

  function toggleMode(m: string) {
    modes = [m];
  }

  function togglePoolItem(frac: string) {
    if (pool.includes(frac)) {
      if (pool.length <= 1) return;
      pool = pool.filter(f => f !== frac);
    } else {
      pool = [...pool, frac];
    }
  }

  function selectAllPool() {
    pool = Object.keys(FRACTIONS_TO_PERCENT);
  }

  function selectDefaultPool() {
    pool = [...DEFAULT_FRAC_SELECTED];
  }

  function isPercentAnswer(v: string): boolean {
    return v.includes('%');
  }

  function buildPool() {
    const items: { input: string; output: string }[] = [];
    for (const f of pool) {
      if (FRACTIONS_TO_PERCENT[f]) {
        items.push({ input: f, output: FRACTIONS_TO_PERCENT[f] });
      }
    }
    return shuffle(items);
  }

  let sessPool: { input: string; output: string }[] = [];

  function newQuestion() {
    const inp = document.getElementById('frac-ans') as HTMLInputElement;
    if (inp) { inp.value = ''; inp.className = 'answer-field'; inp.focus(); }
    const hintEl = document.getElementById('frac-hint');
    if (hintEl) { hintEl.textContent = 'Press Space for hint'; hintEl.className = 'hint-text'; }

    const mode = modes[0];

    if (mode === 'frac-mem') {
      if (sessPool.length === 0) {
        sessPool = buildPool();
        masteredItems = []; itemCorrectCount = {};
      }
      const avail = sessPool.filter(i => !masteredItems.includes(i.input));
      if (avail.length === 0) {
        if (masteredItems.length === sessPool.length && sessPool.length > 0) {
          confetti();
          qHtml = `🎉 ALL ${sessPool.length} MASTERED!`;
          setTimeout(() => { sessPool = buildPool(); masteredItems = []; itemCorrectCount = {}; newQuestion(); }, 2000);
          return;
        }
        sessPool = buildPool(); masteredItems = []; itemCorrectCount = {};
      }
      const item = sessPool.filter(i => !masteredItems.includes(i.input))[rnd(sessPool.filter(i => !masteredItems.includes(i.input)).length - 1, 0)];
      if (!item && sessPool.length > 0) {
        const fallback = sessPool[0];
        const [n, d] = fallback.input.split('/');
        answer = fallback.output;
        hint = answer;
        qHtml = `<span class="frac"><span class="num">${n}</span><span class="den">${d}</span></span> = ?%`;
        pending = true; total++;
        return;
      }
      const [n, d] = item.input.split('/');
      answer = item.output;
      hint = answer;
      qHtml = `<span class="frac"><span class="num">${n}</span><span class="den">${d}</span></span> = ?%`;
      pending = true; total++;
      return;
    }

    // F→%, %→F, or Mixed
    const poolItems = pool.filter(f => FRACTIONS_TO_PERCENT[f]);
    if (poolItems.length === 0) {
      qHtml = '⚠ No fractions selected'; pending = false; return;
    }

    let isFwd: boolean;
    if (mode === 'mixed') {
      isFwd = Math.random() < 0.5;
    } else {
      isFwd = mode === 'frac-pct';
    }

    const frac = poolItems[rnd(poolItems.length - 1, 0)];
    const pct = FRACTIONS_TO_PERCENT[frac];
    const [n, d] = frac.split('/');

    if (isFwd) {
      answer = pct;
      hint = pct;
      qHtml = `<span class="frac"><span class="num">${n}</span><span class="den">${d}</span></span> = ?%`;
    } else {
      answer = frac;
      hint = frac;
      qHtml = `<span style="color:var(--text-dim);font-size:1.1rem;font-weight:600;">${pct}</span> = ? (as fraction)`;
    }
    pending = true;
    total++;
  }

  function checkAnswer() {
    const inp = document.getElementById('frac-ans') as HTMLInputElement;
    if (!inp || !inp.value.trim()) return;
    const val = inp.value.trim();
    const ans = String(answer).trim();

    const normAns = ans.replace('%', '').trim();
    const normVal = val.replace('%', '').trim();

    if (normAns === normVal) {
      inp.className = 'answer-field correct';
      correct++; score += 10; pending = false;
      appData.update(d => ({ ...d, globalScore: d.globalScore + 10 }));
      streak = [...streak, 1];
      if (streak.length > 10) streak = streak.slice(-10);

      if (modes[0] === 'frac-mem') {
        if (sessPool.length > 0) {
          const key = sessPool.find(i => i.output === answer || i.input === answer)?.input || answer;
          itemCorrectCount[key] = (itemCorrectCount[key] || 0) + 1;
          if (itemCorrectCount[key] >= 5 && !masteredItems.includes(key)) {
            masteredItems = [...masteredItems, key];
            sessMastered++;
            if (masteredItems.length === sessPool.length) confetti();
          }
        }
      }

      flash('✓');
      const card = document.getElementById('frac-card');
      if (card) flashCard(card);
      setTimeout(newQuestion, 300);
    } else {
      inp.className = 'answer-field wrong';
      streak = [];
      const card = document.getElementById('frac-card');
      if (card) flashCardWrong(card);
      setTimeout(() => { inp.className = 'answer-field'; }, 500);
    }
  }

  function onInput() {
    const inp = document.getElementById('frac-ans') as HTMLInputElement;
    if (!inp) return;
    const val = inp.value.trim().replace('%','');
    const ans = String(answer).replace('%','');
    if (!val || val.length < ans.length) return;
    if (ans === val) checkAnswer();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); const inp = document.getElementById('frac-ans') as HTMLInputElement; if (inp && inp.value.trim()) checkAnswer(); }
    if (e.key === ' ') { e.preventDefault(); const el = document.getElementById('frac-hint'); if (el) { el.textContent = 'Hint: ' + hint; el.className = 'hint-text shown'; } }
  }

  function startPractice() {
    sessMastered = 0; sessPool = buildPool();
    masteredItems = []; itemCorrectCount = {};
    score = 0; correct = 0; total = 0; streak = []; pending = false;
    view = 'practice';
    if (timed) { drillTimeLeft = parseInt(timeSelect); startDrillTimer(); }
    newQuestion();
  }

  function finishSession() {
    if (drillTimerInt) { clearInterval(drillTimerInt); drillTimerInt = null; }
    const finalTotal = pending ? total - 1 : total;
    const pct = finalTotal > 0 ? Math.round((correct / finalTotal) * 100) : 0;
    appData.update(d => ({
      ...d, globalScore: d.globalScore + score,
      streak: correct > 0 ? d.streak + 1 : 0,
      history: [...d.history, { score: pct, correct, total: finalTotal, time: 0, mode: 'Fractions', diff: modes[0], date: dateStamp() }]
    }));
    view = 'config';
  }

  function goBack() {
    if (pending && total > 1 && !confirm('Leave session? Progress will be lost.')) return;
    if (drillTimerInt) { clearInterval(drillTimerInt); drillTimerInt = null; }
    view = 'config';
  }

  function startDrillTimer() {
    const duration = parseInt(timeSelect);
    drillTimeLeft = duration;
    const el = document.getElementById('frac-timer-display');
    if (el) el.style.display = 'flex';
    drillTimerInt = setInterval(() => {
      drillTimeLeft--;
      if (document.getElementById('frac-timer-num')) document.getElementById('frac-timer-num')!.textContent = String(drillTimeLeft);
      const fillEl = document.getElementById('frac-timer-fill');
      if (fillEl) {
        const r = drillTimeLeft / duration;
        fillEl.style.strokeDashoffset = String(88 * (1 - r));
        fillEl.style.stroke = `hsl(${120 * r},80%,55%)`;
      }
      if (drillTimeLeft <= 0) finishSession();
    }, 1000);
  }

  let poolCount = $derived(pool.length);
  let allCount = $derived(Object.keys(FRACTIONS_TO_PERCENT).length);
</script>

{#if view === 'config'}
  <div class="config-panel">
    <div class="config-panel-title">〰 Fractions Practice</div>
    <div class="config-panel-sub">Memorize fraction ↔ percent conversions.</div>

    <div class="cfg-item" style="margin-bottom:20px;">
      <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:6px;">Select Mode</label>
      <div class="mode-grid">
        {#each ['frac-pct', 'pct-frac', 'mixed', 'frac-mem'] as m}
          <div class="mode-card" class:selected={modes[0] === m} onclick={() => toggleMode(m)}>
            <div class="mode-card-icon">{m === 'frac-pct' ? '→%' : m === 'pct-frac' ? '%→' : m === 'mixed' ? '↔' : '🧠'}</div>
            <div class="mode-card-name">{m === 'frac-pct' ? 'F → %' : m === 'pct-frac' ? '% → F' : m === 'mixed' ? 'Mixed' : 'Mastery'}</div>
            <div class="mode-card-desc">{m === 'frac-pct' ? '1/2 → 50%' : m === 'pct-frac' ? '50% → 1/2' : m === 'mixed' ? 'Both directions' : '5× correct = mastered'}</div>
          </div>
        {/each}
      </div>
    </div>

    <div class="cfg-item" style="margin-bottom:18px;">
      <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:6px;">Fraction Pool <span style="color:var(--text-dim);font-size:0.7rem;font-family:var(--mono);">({poolCount}/{allCount} selected)</span></label>
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        <button class="btn btn-ghost" onclick={selectAllPool} style="padding:4px 10px;font-size:0.72rem;">Select All</button>
        <button class="btn btn-ghost" onclick={selectDefaultPool} style="padding:4px 10px;font-size:0.72rem;">Defaults</button>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;max-height:200px;overflow-y:auto;padding:6px;background:var(--surface3);border-radius:var(--radius-sm);">
        {#each Object.keys(FRACTIONS_TO_PERCENT) as frac}
          <label style="display:flex;align-items:center;gap:4px;font-size:0.72rem;font-family:var(--mono);cursor:pointer;padding:3px 6px;background:{pool.includes(frac) ? 'var(--accent-dim)' : 'var(--surface2)'};border-radius:4px;">
            <input type="checkbox" checked={pool.includes(frac)} onchange={() => togglePoolItem(frac)} style="accent-color:var(--accent);width:14px;height:14px;">
            {frac}
          </label>
        {/each}
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-primary" onclick={startPractice}>▶ Start Practice</button>
      <a href="/NeuroV2/" class="btn btn-ghost">← Back</a>
    </div>

    <div class="timed-toggle-wrap" style="margin-top:16px;">
      <div class="timed-label">⏱ Timed Challenge</div>
      <div class="timed-controls">
        <select bind:value={timeSelect} style="background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:4px 8px;color:var(--text);font-family:var(--mono);font-size:0.75rem;outline:none;">
          <option value="30">30s</option>
          <option value="60">60s</option>
          <option value="120">120s</option>
        </select>
        <label class="switch"><input type="checkbox" bind:checked={timed}><span class="slider"></span></label>
      </div>
    </div>
  </div>
{:else}
  <div class="practice-card" id="frac-card">
    <div class="drill-timer-wrap" id="frac-timer-display" style="display:none;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;justify-content:center;">
        <svg viewBox="0 0 32 32" width="36" height="36"><circle class="tr-track" cx="16" cy="16" r="14" stroke-width="2.5" fill="none" stroke="var(--border)"/><circle class="tr-fill" id="frac-timer-fill" cx="16" cy="16" r="14" stroke-width="2.5" stroke-dasharray="88" stroke-dashoffset="0" fill="none" stroke="var(--accent)"/></svg>
        <span style="font-family:var(--mono);font-size:1.2rem;font-weight:700;color:var(--accent);" id="frac-timer-num">{drillTimeLeft}</span>
      </div>
    </div>
    <div class="practice-mode-badge">{modes[0] === 'frac-pct' ? 'F → %' : modes[0] === 'pct-frac' ? '% → F' : modes[0] === 'mixed' ? 'MIXED' : 'MASTERY'}</div>
    <div class="question-text">{@html qHtml}</div>
    <input class="answer-field" id="frac-ans" type="text" placeholder="?" autocomplete="off" inputmode="text" oninput={onInput} onkeydown={onKey} />
    <div class="hint-text" id="frac-hint">Press Space for hint</div>
    <div class="practice-meta">
      <div class="practice-stat-chip">Score <span>{score}</span></div>
      <div class="practice-stat-chip">Correct <span>{correct}</span></div>
      {#if modes[0] === 'frac-mem'}
        <div class="practice-stat-chip">Mastered <span>{sessMastered}</span></div>
      {/if}
    </div>
    <div class="streak-bar">
      {#each streak as s}<div class="streak-dot lit"></div>{/each}
      {#each Array(Math.max(0, 10 - streak.length)) as _}<div class="streak-dot"></div>{/each}
      {#if streak.length > 0}<span class="streak-count">{streak.length}</span>{/if}
    </div>
  </div>
  <div class="practice-actions">
    <button class="btn btn-ghost" onclick={goBack}>← Back</button>
    <button class="btn btn-secondary" onclick={newQuestion}>Skip →</button>
  </div>
{/if}
