<script lang="ts">
  import { appData } from '$lib/sync/store';
  import { rnd, flash, flashCard, flashCardWrong, dateStamp } from '$lib/utils';

  let view = $state<'config' | 'practice'>('config');
  let diff = $state(2);
  let timed = $state(false);
  let timeSelect = $state('60');
  let hint = $state('');
  let score = $state(0);
  let correct = $state(0);
  let total = $state(0);
  let streak = $state<number[]>([]);
  let pending = $state(false);
  let answer = $state(0);
  let qHtml = $state('');
  let drillTimerInt: ReturnType<typeof setInterval> | null = null;
  let drillTimeLeft = $state(0);

  let allOps = ['+', '−', '×', '÷'] as const;
  let opSymbols: Record<string, string> = { '+':'+', '-':'−', '*':'×', '/':'÷' };

  function genQuestion() {
    const op = allOps[rnd(3, 0)];
    const max = Math.pow(10, diff);
    const min = Math.pow(10, diff - 1);
    let a: number, b: number, ans: number, displayOp: string;

    if (op === '+') {
      a = rnd(max - 1, min); b = rnd(max - 1, min);
      ans = a + b; displayOp = '+';
    } else if (op === '−') {
      a = rnd(max - 1, min); b = rnd(a - 1, min);
      ans = a - b; displayOp = '−';
    } else if (op === '×') {
      a = rnd(diff <= 2 ? 25 : max - 1, 2); b = rnd(diff <= 2 ? 25 : diff === 3 ? 99 : max - 1, 2);
      ans = a * b; displayOp = '×';
    } else {
      b = rnd(max - 1, 2); const q = rnd(Math.min(25, max - 1), 2);
      a = b * q; ans = q; displayOp = '÷';
    }

    answer = ans; hint = String(ans);
    return `<span class="num">${a}</span><span class="op">${displayOp}</span><span class="num">${b}</span><span class="unk">= ?</span>`;
  }

  function newQuestion() {
    const inp = document.getElementById('mp-ans') as HTMLInputElement;
    if (inp) { inp.value = ''; inp.className = 'answer-field'; inp.focus(); }
    const hintEl = document.getElementById('mp-hint');
    if (hintEl) { hintEl.textContent = 'Press Space for hint'; hintEl.className = 'hint-text'; }
    qHtml = genQuestion();
    pending = true; total++;
  }

  function checkAnswer() {
    const inp = document.getElementById('mp-ans') as HTMLInputElement;
    if (!inp || !inp.value.trim()) return;
    const val = inp.value.trim();
    if (String(answer) === val) {
      inp.className = 'answer-field correct';
      correct++; score += 10; pending = false;
      appData.update(d => ({ ...d, globalScore: d.globalScore + 10 }));
      streak = [...streak, 1]; if (streak.length > 10) streak = streak.slice(-10);
      flash('✓');
      const card = document.getElementById('mp-card');
      if (card) flashCard(card);
      setTimeout(newQuestion, 300);
    } else {
      inp.className = 'answer-field wrong'; streak = [];
      const card = document.getElementById('mp-card');
      if (card) flashCardWrong(card);
      setTimeout(() => { inp.className = 'answer-field'; }, 500);
    }
  }

  function onInput() {
    const inp = document.getElementById('mp-ans') as HTMLInputElement;
    if (!inp) return;
    const val = inp.value.trim();
    if (!val || val.length < String(answer).length) return;
    if (String(answer) === val) checkAnswer();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); const inp = document.getElementById('mp-ans') as HTMLInputElement; if (inp && inp.value.trim()) checkAnswer(); }
    if (e.key === ' ') { e.preventDefault(); const el = document.getElementById('mp-hint'); if (el) { el.textContent = 'Hint: ' + hint; el.className = 'hint-text shown'; } }
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
      ...d, globalScore: d.globalScore + score,
      streak: correct > 0 ? d.streak + 1 : 0,
      history: [...d.history, { score: pct, correct, total: finalTotal, time: 0, mode: 'Mixed Practice', diff: String(diff), date: dateStamp() }]
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
    const el = document.getElementById('mp-timer-display');
    if (el) el.style.display = 'flex';
    drillTimerInt = setInterval(() => {
      drillTimeLeft--;
      if (document.getElementById('mp-timer-num')) document.getElementById('mp-timer-num')!.textContent = String(drillTimeLeft);
      const fillEl = document.getElementById('mp-timer-fill');
      if (fillEl) {
        const r = drillTimeLeft / duration;
        fillEl.style.strokeDashoffset = String(88 * (1 - r));
        fillEl.style.stroke = `hsl(${120 * r},80%,55%)`;
      }
      if (drillTimeLeft <= 0) finishSession();
    }, 1000);
  }
</script>

{#if view === 'config'}
  <div class="config-panel">
    <div class="config-panel-title">🎲 Mixed Practice</div>
    <div class="config-panel-sub">Random questions across + − × ÷ — everything at once.</div>
    <div class="cfg-item" style="margin-bottom:20px;">
      <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:6px;">Difficulty</label>
      <div class="diff-row">
        {#each [['Easy',1],['Medium',2],['Hard',3],['Expert',4]] as [lbl, d]}
          <div class="diff-btn" class:sel-easy={diff === d} onclick={() => diff = d as number}>{lbl}</div>
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
  <div class="practice-card" id="mp-card">
    <div class="drill-timer-wrap" id="mp-timer-display" style="display:none;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;justify-content:center;">
        <svg viewBox="0 0 32 32" width="36" height="36"><circle class="tr-track" cx="16" cy="16" r="14" stroke-width="2.5" fill="none" stroke="var(--border)"/><circle class="tr-fill" id="mp-timer-fill" cx="16" cy="16" r="14" stroke-width="2.5" stroke-dasharray="88" stroke-dashoffset="0" fill="none" stroke="var(--accent)"/></svg>
        <span style="font-family:var(--mono);font-size:1.2rem;font-weight:700;color:var(--accent);" id="mp-timer-num">{drillTimeLeft}</span>
      </div>
    </div>
    <div class="practice-mode-badge">MIXED PRACTICE</div>
    <div class="question-text">{@html qHtml}</div>
    <input class="answer-field" id="mp-ans" type="text" placeholder="?" autocomplete="off" inputmode="numeric" oninput={onInput} onkeydown={onKey} />
    <div class="hint-text" id="mp-hint">Press Space for hint</div>
    <div class="practice-meta">
      <div class="practice-stat-chip">Score <span>{score}</span></div>
      <div class="practice-stat-chip">Correct <span>{correct}</span></div>
      <div class="practice-stat-chip">Questions <span>{total}</span></div>
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
