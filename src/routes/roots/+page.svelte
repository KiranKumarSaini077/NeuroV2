<script lang="ts">
  import { appData } from '$lib/sync/store';
  import { PERFECT_SQUARES, PERFECT_CUBES, ROOT_SQ_RANGES, ROOT_POOL_SIZES } from '$lib/constants';
  import { rnd, shuffle, flash, flashCard, flashCardWrong } from '$lib/utils';

  let view = $state<'config' | 'practice'>('config');
  let rootModes = $state<string[]>(['sq-to-root']);
  let sqRanges = $state<string[]>(ROOT_SQ_RANGES.map(r => r.label));

  function getRootAllItems(mode: string) {
    const all = mode === 'sq-to-root' ? PERFECT_SQUARES.map(p => p.val)
              : mode === 'root-to-sq' ? PERFECT_SQUARES.map(p => p.n)
              : mode === 'cu-to-root' ? PERFECT_CUBES.map(p => p.val)
              : PERFECT_CUBES.map(p => p.n);
    if (mode !== 'sq-to-root' && mode !== 'root-to-sq') return all;
    return all.filter(v => {
      const n = mode === 'sq-to-root' ? Math.round(Math.sqrt(v)) : v;
      return sqRanges.some(r => {
        const rng = ROOT_SQ_RANGES.find(x => x.label === r);
        return rng && n >= rng.min && n <= rng.max;
      });
    });
  }

  function buildPool(mode: string) {
    const all = getRootAllItems(mode);
    const size = ROOT_POOL_SIZES[mode];
    const shuffled = shuffle([...all]);
    const items = shuffled.slice(0, Math.min(size, shuffled.length));
    const correctCount: Record<number, number> = {};
    items.forEach(v => { correctCount[v] = 0; });
    return { items, correctCount, masteredItems: [] as number[] };
  }

  let pools = $state<Record<string, { items: number[]; correctCount: Record<number, number>; masteredItems: number[] }>>({
    'sq-to-root': buildPool('sq-to-root'),
    'root-to-sq': buildPool('root-to-sq'),
    'cu-to-root': buildPool('cu-to-root'),
    'root-to-cu': buildPool('root-to-cu')
  });

  let mastered = $state(0);
  let score = $state(0);
  let correct = $state(0);
  let total = $state(0);
  let curItem: number | null = $state(null);
  let curMode = $state('');
  let answer: number | null = $state(null);
  let hint = $state('');
  let pending = $state(false);
  let streak = $state<number[]>([]);
  let qText = $state('');
  let timed = $state(false);
  let timeSelect = $state('60');
  let drillTimerInt: ReturnType<typeof setInterval> | null = null;
  let drillTimeLeft = $state(0);

  function toggleRootMode(m: string) {
    if (rootModes.includes(m)) {
      if (rootModes.length === 1) return;
      rootModes = rootModes.filter(x => x !== m);
    } else {
      rootModes = [...rootModes, m];
    }
  }

  function toggleSqRange(r: string) {
    if (sqRanges.includes(r)) {
      if (sqRanges.length === 1) return;
      sqRanges = sqRanges.filter(x => x !== r);
    } else {
      sqRanges = [...sqRanges, r];
    }
  }

  function poolSize() {
    return rootModes.reduce((sum, m) => sum + (pools[m] ? pools[m].items.length : 0), 0);
  }

  function getModeLabel(m: string): string {
    return { 'sq-to-root':'SQUARE ROOTS', 'root-to-sq':'ROOT → SQUARE', 'cu-to-root':'CUBE ROOTS', 'root-to-cu':'ROOT → CUBE' }[m] || m.toUpperCase();
  }

  function newQuestion() {
    const inp = document.getElementById('roots-ans') as HTMLInputElement;
    if (inp) { inp.value = ''; inp.className = 'answer-field'; inp.focus(); }
    const hintEl = document.getElementById('roots-hint');
    if (hintEl) { hintEl.textContent = 'Press Space for hint'; hintEl.className = 'hint-text'; }

    const mode = rootModes[Math.floor(Math.random() * rootModes.length)];
    curMode = mode;
    let pool = pools[mode];

    // Check if all items are mastered
    const allMastered = pool.items.every(v => pool.masteredItems.includes(v));
    if (allMastered && pool.items.length > 0) {
      // Reset pool with new items
      pools = { ...pools, [mode]: buildPool(mode) };
      pool = pools[mode];
      mastered = 0;
      qText = '🎉 ALL MASTERED! New pool loaded.';
      setTimeout(newQuestion, 1500);
      return;
    }

    // Pick from unmastered items
    const available = pool.items.filter(v => !pool.masteredItems.includes(v));
    const item = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : pool.items[0];
    curItem = item;

    const n = mode === 'sq-to-root' ? Math.round(Math.sqrt(item))
            : mode === 'root-to-sq' ? item
            : mode === 'cu-to-root' ? Math.round(Math.cbrt(item))
            : item;

    if (mode === 'sq-to-root') {
      answer = n; qText = `√${item} = ?`;
    } else if (mode === 'root-to-sq') {
      answer = item * item; qText = `${item}² = ?`;
    } else if (mode === 'cu-to-root') {
      answer = n; qText = `∛${item} = ?`;
    } else {
      answer = n * n * n; qText = `${item}³ = ?`;
    }
    hint = String(answer);
    pending = true;
    total++;
  }

  function checkAnswer() {
    const inp = document.getElementById('roots-ans') as HTMLInputElement;
    if (!inp || !inp.value.trim()) return;
    const val = inp.value.trim();
    if (String(answer) === val) {
      inp.className = 'answer-field correct';
      correct++; score += 10;
      pending = false;
      appData.update(d => ({ ...d, globalScore: d.globalScore + 10 }));
      streak = [...streak, 1];
      if (streak.length > 10) streak = streak.slice(-10);

      // Track mastery
      const pool = pools[curMode];
      if (pool && curItem !== null) {
        pool.correctCount[curItem] = (pool.correctCount[curItem] || 0) + 1;
        if (pool.correctCount[curItem] >= 5 && !pool.masteredItems.includes(curItem)) {
          pool.masteredItems = [...pool.masteredItems, curItem];
          mastered++;
        }
        pools = { ...pools, [curMode]: { ...pool } };
      }

      flash('✓');
      const card = document.getElementById('roots-card');
      if (card) flashCard(card);
      setTimeout(newQuestion, 300);
    } else {
      inp.className = 'answer-field wrong';
      const card = document.getElementById('roots-card');
      if (card) flashCardWrong(card);
      setTimeout(() => { inp.className = 'answer-field'; }, 500);
    }
  }

  function onInput() {
    const inp = document.getElementById('roots-ans') as HTMLInputElement;
    if (!inp) return;
    const val = inp.value.trim();
    if (!val || val.length < String(answer).length) return;
    if (String(answer) === val) checkAnswer();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); const inp = document.getElementById('roots-ans') as HTMLInputElement; if (inp && inp.value.trim()) checkAnswer(); }
    if (e.key === ' ') { e.preventDefault(); const el = document.getElementById('roots-hint'); if (el) { el.textContent = 'Hint: ' + hint; el.className = 'hint-text shown'; } }
  }

  function finishSession() {
    if (drillTimerInt) { clearInterval(drillTimerInt); drillTimerInt = null; }
    const finalTotal = pending ? total - 1 : total;
    const pct = finalTotal > 0 ? Math.round((correct / finalTotal) * 100) : 0;
    appData.update(d => ({
      ...d,
      globalScore: d.globalScore + score,
      streak: correct > 0 ? d.streak + 1 : 0,
      history: [...d.history, { score: pct, correct, total: finalTotal, time: 0, mode: 'Roots', diff: rootModes.join(',') }]
    }));
    view = 'config';
  }

  function startPractice() {
    // Rebuild pools from current ranges
    rootModes.forEach(m => { pools = { ...pools, [m]: buildPool(m) }; });
    mastered = 0; score = 0; correct = 0; total = 0; streak = []; pending = false;
    view = 'practice';
    if (timed) { drillTimeLeft = parseInt(timeSelect); startDrillTimer(); }
    newQuestion();
  }

  function goBack() {
    if (pending && total > 1 && !confirm('Leave session? Progress will be lost.')) return;
    if (drillTimerInt) { clearInterval(drillTimerInt); drillTimerInt = null; }
    view = 'config';
  }

  function startDrillTimer() {
    const duration = parseInt(timeSelect);
    drillTimeLeft = duration;
    const el = document.getElementById('roots-timer-display');
    if (el) el.style.display = 'flex';
    drillTimerInt = setInterval(() => {
      drillTimeLeft--;
      if (document.getElementById('roots-timer-num')) document.getElementById('roots-timer-num')!.textContent = String(drillTimeLeft);
      if (drillTimeLeft <= 0) finishSession();
    }, 1000);
  }
</script>

{#if view === 'config'}
  <div class="config-panel">
    <div class="config-panel-title">√ Roots Practice</div>
    <div class="config-panel-sub">Progressive memorization — master a root 5 times to unlock a harder one.</div>

    <div class="cfg-item" style="margin-bottom:20px;">
      <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:6px;">Select Modes</label>
      <div class="mode-grid">
        {#each ['sq-to-root','root-to-sq','cu-to-root','root-to-cu'] as m}
          <div class="mode-card" class:selected={rootModes.includes(m)} onclick={() => toggleRootMode(m)}>
            <div class="mode-card-icon">{m === 'sq-to-root' ? '√' : m === 'root-to-sq' ? '²' : m === 'cu-to-root' ? '∛' : '³'}</div>
            <div class="mode-card-name">{m === 'sq-to-root' ? 'Square → Root' : m === 'root-to-sq' ? 'Root → Square' : m === 'cu-to-root' ? 'Cube → Root' : 'Root → Cube'}</div>
            <div class="mode-card-desc">{m === 'sq-to-root' ? '√196 = ?' : m === 'root-to-sq' ? '14² = ?' : m === 'cu-to-root' ? '∛343 = ?' : '7³ = ?'}</div>
          </div>
        {/each}
      </div>
    </div>

    <div class="cfg-item" style="margin-bottom:18px;">
      <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:6px;">Square Range</label>
      <div class="diff-row">
        {#each ROOT_SQ_RANGES as r}
          <div class="diff-btn sel-easy" class:sel-easy={sqRanges.includes(r.label)} onclick={() => toggleSqRange(r.label)}>{r.label}</div>
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
  <div class="practice-card" id="roots-card">
    <div class="drill-timer-wrap" id="roots-timer-display" style="display:none;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;justify-content:center;">
        <span style="font-family:var(--mono);font-size:1.2rem;font-weight:700;color:var(--accent);" id="roots-timer-num">{drillTimeLeft}</span>
      </div>
    </div>
    <div class="practice-mode-badge">{getModeLabel(curMode)}</div>
    <div class="question-text">{qText}</div>
    <input class="answer-field" id="roots-ans" type="text" placeholder="?" autocomplete="off" inputmode="numeric" oninput={onInput} onkeydown={onKey} />
    <div class="hint-text" id="roots-hint">Press Space for hint</div>
    <div class="practice-meta">
      <div class="practice-stat-chip">Score <span>{score}</span></div>
      <div class="practice-stat-chip">Mastered <span>{mastered}</span></div>
      <div class="practice-stat-chip">Pool Size <span>{poolSize()}</span></div>
    </div>
    <div class="streak-bar">
      {#each streak as s}<div class="streak-dot lit"></div>{/each}
      {#each Array(Math.max(0, 10 - streak.length)) as _}<div class="streak-dot"></div>{/each}
    </div>
  </div>
  {#if curMode}
    <div style="margin-top:14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 16px;">
      <div style="font-family:var(--mono);font-size:0.65rem;color:var(--text-dim);margin-bottom:8px;letter-spacing:2px;">CURRENT POOL</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        {#each (pools[curMode]?.items || []).map(v => ({ v, mastered: pools[curMode]?.masteredItems.includes(v) })) as item}
          <span style="font-family:var(--mono);font-size:0.72rem;padding:2px 8px;border-radius:4px;background:{item.mastered ? 'rgba(79,255,176,0.1)' : 'var(--surface3)'};color:{item.mastered ? 'var(--accent)' : 'var(--text-dim)'};">{item.v}</span>
        {/each}
      </div>
    </div>
  {/if}
  <div class="practice-actions">
    <button class="btn btn-ghost" onclick={goBack}>← Back to Config</button>
    <button class="btn btn-secondary" onclick={newQuestion}>Skip →</button>
  </div>
{/if}
