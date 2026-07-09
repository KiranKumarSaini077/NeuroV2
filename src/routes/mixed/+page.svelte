<script lang="ts">
  import { appData } from '$lib/sync/store';
  import { rnd, flash, flashCard, flashCardWrong } from '$lib/utils';

  let view = $state<'config' | 'practice'>('config');
  let mode = $state('mixed-to-improper');
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

  function toggleMode(m: string) { mode = m; }

  function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

  function newQuestion() {
    const inp = document.getElementById('mixed-ans') as HTMLInputElement;
    if (inp) { inp.value = ''; inp.className = 'answer-field'; inp.focus(); }
    const hintEl = document.getElementById('mixed-hint');
    if (hintEl) { hintEl.textContent = 'Press Space for hint'; hintEl.className = 'hint-text'; }

    if (mode === 'mixed-to-improper') {
      const whole = rnd(12, 1);
      const num = rnd(12, 1);
      const den = rnd(12, 2);
      const g = gcd(num, den);
      const sn = num / g, sd = den / g;
      answer = `${whole * sd + sn}/${sd}`;
      const actual = `${whole * den + num}/${den}`;
      qHtml = `<span class="frac mixed"><span class="whole">${whole}</span><span class="num">${sn}</span><span class="den">${sd}</span></span> <span style="color:var(--text-dim)">= ?</span>`;
      hint = answer;
    } else {
      const den = rnd(12, 2);
      const numRaw = rnd(den * 5, den + 1);
      const whole = Math.floor(numRaw / den);
      const rem = numRaw % den;
      const g = gcd(rem, den);
      const sn = rem / g, sd = den / g;
      const displayNum = sn > 0 ? `<span class="num">${sn}</span><span class="den">${sd}</span>` : '';
      qHtml = `<span class="frac"><span class="num">${numRaw}</span><span class="den">${den}</span></span> <span style="color:var(--text-dim)">= ?</span>`;
      answer = sn > 0 ? `${whole}_${sn}/${sd}` : `${whole}`;
      hint = answer;
    }
    pending = true;
    total++;
  }

  function checkAnswer() {
    const inp = document.getElementById('mixed-ans') as HTMLInputElement;
    if (!inp || !inp.value.trim()) return;
    const val = inp.value.trim().replace(/\s+/g, '');
    const ans = String(answer).replace(/\s+/g, '');
    if (ans === val) {
      inp.className = 'answer-field correct';
      correct++; score += 10;
      pending = false;
      appData.update(d => ({ ...d, globalScore: d.globalScore + 10 }));
      streak = [...streak, 1];
      if (streak.length > 10) streak = streak.slice(-10);
      flash('✓');
      const card = document.getElementById('mixed-card');
      if (card) flashCard(card);
      setTimeout(newQuestion, 300);
    } else {
      inp.className = 'answer-field wrong';
      const card = document.getElementById('mixed-card');
      if (card) flashCardWrong(card);
      setTimeout(() => { inp.className = 'answer-field'; }, 500);
    }
  }

  function onInput() {
    const inp = document.getElementById('mixed-ans') as HTMLInputElement;
    if (!inp) return;
    const val = inp.value.trim().replace(/\s+/g, '');
    const ans = String(answer).replace(/\s+/g, '');
    if (!val || val.length < ans.length) return;
    if (ans === val) checkAnswer();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); const inp = document.getElementById('mixed-ans') as HTMLInputElement; if (inp && inp.value.trim()) checkAnswer(); }
    if (e.key === ' ') { e.preventDefault(); const el = document.getElementById('mixed-hint'); if (el) { el.textContent = 'Hint: ' + hint; el.className = 'hint-text shown'; } }
  }

  function startPractice() {
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
      history: [...d.history, { score: pct, correct, total: finalTotal, time: 0, mode: 'Mixed', diff: mode }]
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
    const el = document.getElementById('mixed-timer-display');
    if (el) el.style.display = 'flex';
    drillTimerInt = setInterval(() => {
      drillTimeLeft--;
      if (document.getElementById('mixed-timer-num')) document.getElementById('mixed-timer-num')!.textContent = String(drillTimeLeft);
      if (drillTimeLeft <= 0) finishSession();
    }, 1000);
  }
</script>

{#if view === 'config'}
  <div class="config-panel">
    <div class="config-panel-title">〰 Mixed Numbers</div>
    <div class="config-panel-sub">Convert between mixed numbers and improper fractions.</div>
    <div class="cfg-item" style="margin-bottom:20px;">
      <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:6px;">Select Mode</label>
      <div class="mode-grid">
        {#each ['mixed-to-improper','improper-to-mixed'] as m}
          <div class="mode-card" class:selected={mode === m} onclick={() => toggleMode(m)}>
            <div class="mode-card-icon">{m === 'mixed-to-improper' ? '→a/b' : 'a/b→'}</div>
            <div class="mode-card-name">{m === 'mixed-to-improper' ? 'Mixed → Improper' : 'Improper → Mixed'}</div>
            <div class="mode-card-desc">{m === 'mixed-to-improper' ? 'Convert to fraction' : 'Simplify to mixed'}</div>
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
  <div class="practice-card" id="mixed-card">
    <div class="drill-timer-wrap" id="mixed-timer-display" style="display:none;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;justify-content:center;">
        <span style="font-family:var(--mono);font-size:1.2rem;font-weight:700;color:var(--accent);" id="mixed-timer-num">{drillTimeLeft}</span>
      </div>
    </div>
    <div class="practice-mode-badge">{mode === 'mixed-to-improper' ? 'MIXED → IMPROPER' : 'IMPROPER → MIXED'}</div>
    <div class="question-text">{@html qHtml}</div>
    <input class="answer-field" id="mixed-ans" type="text" placeholder="?" autocomplete="off" inputmode="numeric" oninput={onInput} onkeydown={onKey} />
    <div style="font-family:var(--mono);font-size:0.65rem;color:var(--text-dim);text-align:center;margin-top:6px;">Answer: use underscore for mixed (e.g. 3_1/2)</div>
    <div class="hint-text" id="mixed-hint">Press Space for hint</div>
    <div class="practice-meta">
      <div class="practice-stat-chip">Score <span>{score}</span></div>
      <div class="practice-stat-chip">Correct <span>{correct}</span></div>
      <div class="practice-stat-chip">Questions <span>{total}</span></div>
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
