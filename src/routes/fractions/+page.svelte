<script lang="ts">
  import { appData } from '$lib/sync/store';
  import { FRACTIONS_TO_PERCENT } from '$lib/constants';
  import { rnd, shuffle, flash, flashCard, flashCardWrong } from '$lib/utils';

  let view = $state<'config' | 'practice'>('config');
  let modes = $state<string[]>(['frac-mem']);
  let hint = $state('');
  let score = $state(0);
  let correct = $state(0);
  let total = $state(0);
  let streak = $state<number[]>([]);
  let pending = $state(false);
  let answer: number | string = $state('');
  let qHtml = $state('');
  let timed = $state(false);
  let timeSelect = $state('60');
  let drillTimerInt: ReturnType<typeof setInterval> | null = null;
  let drillTimeLeft = $state(0);

  let fracItems: { input: string; output: string }[] = [];
  let sessMastered = $state(0);
  let sessPool = $state<{ input: string; output: string }[]>([]);
  let itemCorrectCount: Record<string, number> = {};
  let masteredItems: string[] = [];

  function buildFracPool(): { input: string; output: string }[] {
    return shuffle(Object.entries(FRACTIONS_TO_PERCENT).map(([k, v]) => ({ input: k, output: v })));
  }

  function toggleMode(m: string) {
    modes = [m];
  }

  function newQuestion() {
    const inp = document.getElementById('frac-ans') as HTMLInputElement;
    if (inp) { inp.value = ''; inp.className = 'answer-field'; inp.focus(); }
    const hintEl = document.getElementById('frac-hint');
    if (hintEl) { hintEl.textContent = 'Press Space for hint'; hintEl.className = 'hint-text'; }

    const fracEntries = Object.entries(FRACTIONS_TO_PERCENT);
    const idx = rnd(fracEntries.length - 1, 0);
    const [key, val] = fracEntries[idx];
    const [num, den] = key.split('/');

    if (modes[0] === 'frac-mem' || modes[0] === 'frac-pct') {
      if (modes[0] === 'frac-mem') {
        if (sessPool.length === 0) {
          sessPool = buildFracPool();
          masteredItems = [];
          itemCorrectCount = {};
        }
        const avail = sessPool.filter(i => !masteredItems.includes(i.input));
        if (avail.length === 0) {
          qHtml = `🎉 ALL MASTERED!`;
          setTimeout(newQuestion, 1500);
          sessPool = buildFracPool();
          masteredItems = [];
          itemCorrectCount = {};
          return;
        }
        const item = avail[rnd(avail.length - 1, 0)];
        fracItems = [item];
        const [n, d] = item.input.split('/');
        answer = item.output;
        hint = answer;
        qHtml = `<span class="frac"><span class="num">${n}</span><span class="den">${d}</span></span> <span style="color:var(--text-dim)">= ?%</span>`;
      } else {
        answer = val;
        hint = answer;
        qHtml = `<span class="frac"><span class="num">${num}</span><span class="den">${den}</span></span> <span style="color:var(--text-dim)">= ?%</span>`;
      }
    } else {
      answer = key;
      hint = answer;
      qHtml = `<span style="color:var(--text-dim)">${val}</span> <span style="color:var(--text-dim)">= ?</span>`;
    }
    pending = true;
    total++;
  }

  function checkAnswer() {
    const inp = document.getElementById('frac-ans') as HTMLInputElement;
    if (!inp || !inp.value.trim()) return;
    const val = inp.value.trim().replace('%','');
    const ans = String(answer).replace('%','');
    if (ans === val) {
      inp.className = 'answer-field correct';
      correct++; score += 10;
      pending = false;
      appData.update(d => ({ ...d, globalScore: d.globalScore + 10 }));
      streak = [...streak, 1];
      if (streak.length > 10) streak = streak.slice(-10);
      if (modes[0] === 'frac-mem' && fracItems[0]) {
        const key = fracItems[0].input;
        itemCorrectCount[key] = (itemCorrectCount[key] || 0) + 1;
        if (itemCorrectCount[key] >= 5 && !masteredItems.includes(key)) {
          masteredItems = [...masteredItems, key];
          sessMastered++;
        }
      }
      flash('✓');
      const card = document.getElementById('frac-card');
      if (card) flashCard(card);
      setTimeout(newQuestion, 300);
    } else {
      inp.className = 'answer-field wrong';
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
    sessMastered = 0;
    sessPool = buildFracPool();
    masteredItems = [];
    itemCorrectCount = {};
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
      ...d,
      globalScore: d.globalScore + score,
      streak: correct > 0 ? d.streak + 1 : 0,
      history: [...d.history, { score: pct, correct, total: finalTotal, time: 0, mode: 'Fractions', diff: modes[0] }]
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
      if (drillTimeLeft <= 0) finishSession();
    }, 1000);
  }
</script>

{#if view === 'config'}
  <div class="config-panel">
    <div class="config-panel-title">〰 Fractions Practice</div>
    <div class="config-panel-sub">Memorize common fraction → percent conversions.</div>
    <div class="cfg-item" style="margin-bottom:20px;">
      <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:6px;">Select Mode</label>
      <div class="mode-grid">
        {#each ['frac-mem','frac-pct','pct-frac'] as m}
          <div class="mode-card" class:selected={modes[0] === m} onclick={() => toggleMode(m)}>
            <div class="mode-card-icon">{m === 'frac-mem' ? '🧠' : m === 'frac-pct' ? '→%' : '%→'}</div>
            <div class="mode-card-name">{m === 'frac-mem' ? 'Mastery' : m === 'frac-pct' ? 'Fraction → %' : '% → Fraction'}</div>
            <div class="mode-card-desc">{m === 'frac-mem' ? '5x correct = mastered' : m === 'frac-pct' ? '1/2 = ?%' : '50% = ?'}</div>
          </div>
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
        <span style="font-family:var(--mono);font-size:1.2rem;font-weight:700;color:var(--accent);" id="frac-timer-num">{drillTimeLeft}</span>
      </div>
    </div>
    <div class="practice-mode-badge">{modes[0] === 'frac-mem' ? 'MASTERY' : modes[0] === 'frac-pct' ? 'FRACTION → %' : '% → FRACTION'}</div>
    <div class="question-text">{@html qHtml}</div>
    <input class="answer-field" id="frac-ans" type="text" placeholder="?" autocomplete="off" inputmode="numeric" oninput={onInput} onkeydown={onKey} />
    <div class="hint-text" id="frac-hint">Press Space for hint</div>
    <div class="practice-meta">
      <div class="practice-stat-chip">Score <span>{score}</span></div>
      <div class="practice-stat-chip">Correct <span>{correct}</span></div>
      <div class="practice-stat-chip">Mastered <span>{sessMastered}</span></div>
    </div>
    <div class="streak-bar">
      {#each streak as s}<div class="streak-dot lit"></div>{/each}
      {#each Array(Math.max(0, 10 - streak.length)) as _}<div class="streak-dot"></div>{/each}
    </div>
  </div>
  <div class="practice-actions">
    <button class="btn btn-ghost" onclick={goBack}>← Back to Config</button>
    <button class="btn btn-secondary" onclick={newQuestion}>Skip →</button>
  </div>
{/if}
