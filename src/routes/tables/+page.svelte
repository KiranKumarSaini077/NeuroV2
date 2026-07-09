<script lang="ts">
  import { appData } from '$lib/sync/store';
  import { rnd, flash, flashCard, flashCardWrong } from '$lib/utils';

  let view = $state<'config' | 'practice'>('config');
  let selectedNums = $state<number[]>([2]);
  let mode = $state<'table' | 'reverse'>('table');
  let timed = $state(false);
  let timeSelect = $state('60');
  let drillTimerInt: ReturnType<typeof setInterval> | null = null;
  let drillTimeLeft = $state(0);

  let score = $state(0);
  let correct = $state(0);
  let total = $state(0);
  let streak = $state<number[]>([]);
  let pending = $state(false);
  let answer: number | null = $state(null);
  let hint = $state('');
  let qHtml = $state('');
  let curNum = $state(0);
  let curMult = $state(0);

  function toggleNum(n: number) {
    if (selectedNums.includes(n)) {
      if (selectedNums.length === 1) return;
      selectedNums = selectedNums.filter(x => x !== n);
    } else {
      selectedNums = [...selectedNums, n].sort((a, b) => a - b);
    }
  }

  function toggleMode(m: 'table' | 'reverse') { mode = m; }

  function newQuestion() {
    const inp = document.getElementById('tbl-ans') as HTMLInputElement;
    if (inp) { inp.value = ''; inp.className = 'answer-field'; inp.focus(); }
    const hintEl = document.getElementById('tbl-hint');
    if (hintEl) { hintEl.textContent = 'Press Space for hint'; hintEl.className = 'hint-text'; }

    curNum = selectedNums[rnd(selectedNums.length - 1, 0)];
    curMult = rnd(12, 1);
    if (mode === 'table') {
      answer = curNum * curMult;
      qHtml = `<span class="num">${curNum}</span><span class="op">×</span><span class="num">${curMult}</span><span class="unk">= ?</span>`;
    } else {
      answer = curNum;
      const prod = curNum * curMult;
      qHtml = `<span class="num">${prod}</span><span class="op">÷</span><span class="num">${curMult}</span><span class="unk">= ?</span>`;
    }
    hint = String(answer);
    pending = true;
    total++;
  }

  function checkAnswer() {
    const inp = document.getElementById('tbl-ans') as HTMLInputElement;
    if (!inp || !inp.value.trim()) return;
    const val = inp.value.trim();
    if (String(answer) === val) {
      inp.className = 'answer-field correct';
      correct++; score += 10;
      pending = false;
      appData.update(d => ({ ...d, globalScore: d.globalScore + 10 }));
      streak = [...streak, 1];
      if (streak.length > 10) streak = streak.slice(-10);
      flash('✓');
      const card = document.getElementById('tbl-card');
      if (card) flashCard(card);
      setTimeout(newQuestion, 300);
    } else {
      inp.className = 'answer-field wrong';
      const card = document.getElementById('tbl-card');
      if (card) flashCardWrong(card);
      setTimeout(() => { inp.className = 'answer-field'; }, 500);
    }
  }

  function onInput() {
    const inp = document.getElementById('tbl-ans') as HTMLInputElement;
    if (!inp) return;
    const val = inp.value.trim();
    if (!val || val.length < String(answer).length) return;
    if (String(answer) === val) checkAnswer();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); const inp = document.getElementById('tbl-ans') as HTMLInputElement; if (inp && inp.value.trim()) checkAnswer(); }
    if (e.key === ' ') { e.preventDefault(); const el = document.getElementById('tbl-hint'); if (el) { el.textContent = 'Hint: ' + hint; el.className = 'hint-text shown'; } }
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
      history: [...d.history, { score: pct, correct, total: finalTotal, time: 0, mode: 'Tables', diff: selectedNums.join(',') }]
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
    const el = document.getElementById('tbl-timer-display');
    if (el) el.style.display = 'flex';
    drillTimerInt = setInterval(() => {
      drillTimeLeft--;
      if (document.getElementById('tbl-timer-num')) document.getElementById('tbl-timer-num')!.textContent = String(drillTimeLeft);
      if (drillTimeLeft <= 0) finishSession();
    }, 1000);
  }
</script>

{#if view === 'config'}
  <div class="config-panel">
    <div class="config-panel-title">✕ Tables Practice</div>
    <div class="config-panel-sub">Master multiplication and division tables from 2 to 20.</div>

    <div class="cfg-item" style="margin-bottom:16px;">
      <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:6px;">Select Tables <span style="color:var(--text-dim);font-size:0.7rem;font-family:var(--mono);">(tap to toggle multiple)</span></label>
      <div class="diff-row" style="flex-wrap:wrap;gap:4px;">
        {#each [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20] as n}
          <div class="diff-btn sel-easy" class:sel-easy={selectedNums.includes(n)} onclick={() => toggleNum(n)} style="min-width:28px;text-align:center;">{n}</div>
        {/each}
      </div>
    </div>

    <div class="cfg-item" style="margin-bottom:20px;">
      <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:6px;">Mode</label>
      <div class="mode-grid">
        {#each [{ id:'table', label:'Multiplication', desc:'2 × 7 = ?' }, { id:'reverse', label:'Division (Reverse)', desc:'14 ÷ 7 = ?' }] as m}
          <div class="mode-card" class:selected={mode === m.id} onclick={() => toggleMode(m.id)}>
            <div class="mode-card-icon">{m.id === 'table' ? '×' : '÷'}</div>
            <div class="mode-card-name">{m.label}</div>
            <div class="mode-card-desc">{m.desc}</div>
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
  <div class="practice-card" id="tbl-card">
    <div class="drill-timer-wrap" id="tbl-timer-display" style="display:none;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;justify-content:center;">
        <span style="font-family:var(--mono);font-size:1.2rem;font-weight:700;color:var(--accent);" id="tbl-timer-num">{drillTimeLeft}</span>
      </div>
    </div>
    <div class="practice-mode-badge">{mode === 'table' ? 'TABLE' : 'DIVISION'}</div>
    <div class="question-text">{@html qHtml}</div>
    <input class="answer-field" id="tbl-ans" type="text" placeholder="?" autocomplete="off" inputmode="numeric" oninput={onInput} onkeydown={onKey} />
    <div class="hint-text" id="tbl-hint">Press Space for hint</div>
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
