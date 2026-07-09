<script lang="ts">
  import { appData } from '$lib/sync/store';
  import { rnd, evalBODMAS, flash, flashCard, flashCardWrong } from '$lib/utils';
  import { onMount, onDestroy } from 'svelte';

  // State
  let view = $state<'config' | 'practice'>('config');
  let modes = $state<string[]>([]);
  let opCount = $state(2);
  let digits = $state({ first: 2, second: 2, num: 2, den: 1 });
  let timed = $state(false);
  let timeSelect = $state('60');

  let answer = $state<number | null>(null);
  let hint = $state('');
  let score = $state(0);
  let correct = $state(0);
  let total = $state(0);
  let streak = $state<number[]>([]);
  let pending = $state(false);
  let qHtml = $state('');
  let sessionStart = $state(0);
  let qStart = $state(0);
  let sessionTime = $state('00:00');
  let qTime = $state('00.0s');
  let timerInt: ReturnType<typeof setInterval> | null = null;

  // Config
  let allModes = ['Addition','Subtraction','Carry Subtraction','Multiplication','Division','100-n'];
  let symMap: Record<string,string> = { Addition:'+', Subtraction:'−', 'Carry Subtraction':'−', Multiplication:'×', Division:'÷', '100-n':'−' };

  // Timed challenge (countdown)
  let drillTimerInt: ReturnType<typeof setInterval> | null = null;
  let drillTimeLeft = $state(0);

  function toggleMode(m: string) {
    if (modes.includes(m)) {
      if (modes.length === 1) return;
      modes = modes.filter(x => x !== m);
    } else {
      modes = [...modes, m];
    }
  }

  function updateTimers() {
    const now = Date.now();
    const sec = Math.floor((now - sessionStart) / 1000);
    sessionTime = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    qTime = ((now - qStart) / 1000).toFixed(1) + 's';
  }

  function startDrillTimer(duration: number, onEnd: () => void) {
    drillTimeLeft = duration;
    const el = document.getElementById('arith-timer-display');
    const numEl = document.getElementById('arith-timer-num');
    const fillEl = document.getElementById('arith-timer-fill');
    if (el) el.style.display = 'flex';
    drillTimerInt = setInterval(() => {
      drillTimeLeft--;
      if (numEl) numEl.textContent = String(drillTimeLeft);
      if (fillEl) {
        const r = drillTimeLeft / duration;
        fillEl.style.strokeDashoffset = String(88 * (1 - r));
      }
      if (drillTimeLeft <= 0) {
        if (drillTimerInt) clearInterval(drillTimerInt);
        onEnd();
      }
    }, 1000);
  }

  function stopDrillTimer() {
    if (drillTimerInt) { clearInterval(drillTimerInt); drillTimerInt = null; }
    const el = document.getElementById('arith-timer-display');
    if (el) el.style.display = 'none';
  }

  function finishSession() {
    stopDrillTimer();
    if (timerInt) { clearInterval(timerInt); timerInt = null; }
    const finalTotal = pending ? total - 1 : total;
    const pct = finalTotal > 0 ? Math.round((correct / finalTotal) * 100) : 0;
    appData.update(d => ({
      ...d,
      globalScore: d.globalScore + score,
      streak: correct > 0 ? d.streak + 1 : 0,
      history: [...d.history, { score: pct, correct, total: finalTotal, time: 0, mode: 'Arithmetic', diff: opCount + 'nums' }]
    }));
    view = 'config';
  }

  function startPractice() {
    if (modes.length === 0) modes = ['Addition'];
    answer = null; hint = ''; score = 0; correct = 0; total = 0; streak = []; pending = false;
    view = 'practice';
    sessionStart = Date.now(); qStart = Date.now();
    if (timerInt) clearInterval(timerInt);
    timerInt = setInterval(updateTimers, 100);
    if (timed) {
      const dur = parseInt(timeSelect);
      startDrillTimer(dur, finishSession);
    }
    newQuestion();
  }

  function newQuestion() {
    qStart = Date.now();
    const inp = document.getElementById('arith-ans') as HTMLInputElement;
    if (inp) { inp.value = ''; inp.className = 'answer-field'; inp.focus(); }
    const hintEl = document.getElementById('arith-hint');
    if (hintEl) { hintEl.textContent = 'Press Space for hint'; hintEl.className = 'hint-text'; }

    // Handle 100-n mode
    if (modes.includes('100-n') && (modes.length === 1 || Math.random() < 1 / modes.length)) {
      const n = rnd(100, 1);
      answer = 100 - n;
      hint = String(answer);
      pending = true;
      qHtml = `<span class="num">100</span><span class="op">−</span><span class="num">${n}</span><span class="unk">= ?</span>`;
      total++;
      return;
    }

    const pool = modes.filter(m => m !== '100-n');
    const count = opCount;
    const ops = Array.from({ length: count - 1 }, () => {
      const m = pool[Math.floor(Math.random() * pool.length)];
      return symMap[m];
    });

    let nums: number[] = [], ans: number | null = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      nums = [];
      for (let i = 0; i < count; i++) {
        const isDiv = i > 0 && ops[i - 1] === '÷';
        const d = isDiv ? digits.den : (count === 2 && i === 1 ? digits.second : digits.first);
        nums.push(rnd(Math.max(10 ** d - 1, 1), 10 ** (d - 1)));
      }
      for (let i = 0; i < ops.length; i++) {
        if (ops[i] === '÷') {
          const divisor = nums[i + 1] < 1 ? 1 : nums[i + 1];
          nums[i + 1] = divisor;
          const maxQ = digits.first <= 2 ? 25 : 9;
          nums[i] = divisor * rnd(maxQ, 2);
        }
      }
      const res = evalBODMAS(nums, ops);
      if (Number.isInteger(res) && res >= 0 && res <= 999999) { ans = res; break; }
    }
    if (ans === null) {
      const a = rnd(99, 10), b = rnd(99, 10);
      nums = [a, b]; ops.length = 0; ops.push('+'); ans = a + b;
    }
    answer = ans; hint = String(ans); pending = true;
    let html = '';
    for (let i = 0; i < nums.length; i++) {
      html += `<span class="num">${nums[i]}</span>`;
      if (i < ops.length) html += `<span class="op">${ops[i]}</span>`;
    }
    html += `<span class="unk">= ?</span>`;
    qHtml = html;
    total++;
  }

  function checkAnswer() {
    const inp = document.getElementById('arith-ans') as HTMLInputElement;
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
      const card = document.getElementById('arith-card');
      if (card) flashCard(card);
      setTimeout(newQuestion, 300);
    } else {
      inp.className = 'answer-field wrong';
      const card = document.getElementById('arith-card');
      if (card) flashCardWrong(card);
      setTimeout(() => { inp.className = 'answer-field'; }, 500);
    }
  }

  function onInput() {
    const inp = document.getElementById('arith-ans') as HTMLInputElement;
    if (!inp) return;
    const val = inp.value.trim();
    if (!val || val.length < String(answer).length) return;
    if (String(answer) === val) checkAnswer();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inp = document.getElementById('arith-ans') as HTMLInputElement;
      if (inp && inp.value.trim()) checkAnswer();
    }
    if (e.key === ' ') {
      e.preventDefault();
      const el = document.getElementById('arith-hint');
      if (el) { el.textContent = 'Hint: ' + hint; el.className = 'hint-text shown'; }
    }
  }

  function goBack() {
    if (pending && total > 1 && !confirm('Leave session? Progress will be lost.')) return;
    if (timerInt) { clearInterval(timerInt); timerInt = null; }
    stopDrillTimer();
    view = 'config';
  }

  onDestroy(() => {
    if (timerInt) clearInterval(timerInt);
    stopDrillTimer();
  });
</script>

<!-- Config -->
{#if view === 'config'}
  <div class="config-panel">
    <div class="config-panel-title">🔢 Arithmetic Drill</div>
    <div class="config-panel-sub">Speed practice for all arithmetic operations.</div>

    <div class="cfg-item" style="margin-bottom:18px;">
      <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:6px;">Select Modes <span style="color:var(--text-dim);font-size:0.7rem;font-family:var(--mono);">(tap to toggle multiple)</span></label>
      <div class="mode-grid">
        {#each allModes as m}
          <div class="mode-card" class:selected={modes.includes(m)} onclick={() => toggleMode(m)}>
            <div class="mode-card-icon">{m === '100-n' ? '𝟭𝟬𝟬' : symMap[m]}</div>
            <div class="mode-card-name">{m}</div>
            <div class="mode-card-desc">{m === '100-n' ? 'Subtract from 100' : m + ' practice'}</div>
          </div>
        {/each}
      </div>
    </div>

    {#if !(modes.length === 1 && modes[0] === '100-n')}
      <div class="config-grid" style="margin-bottom:16px;">
        <div class="cfg-item">
          <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:6px;">Numbers per Question</label>
          <div class="diff-row">
            {#each [2,3,4,5] as n}
              <div class="diff-btn" class:sel-easy={opCount === n} onclick={() => opCount = n}>{n}</div>
            {/each}
          </div>
        </div>
      </div>
      <div class="config-grid" style="margin-bottom:16px;">
        <div class="cfg-item">
          <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:6px;">Digit Size</label>
          <div class="diff-row">
            {#each [1,2,3,4] as d}
              <div class="diff-btn" class:sel-easy={digits.first === d} onclick={() => digits = { ...digits, first: d }}>{d}d</div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <div class="timed-toggle-wrap">
      <div class="timed-label">⏱ Timed Challenge</div>
      <div class="timed-controls">
        <select bind:value={timeSelect} style="background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:4px 8px;color:var(--text);font-family:var(--mono);font-size:0.75rem;outline:none;">
          <option value="30">30s</option>
          <option value="60">60s</option>
          <option value="120">120s</option>
        </select>
        <label class="switch">
          <input type="checkbox" bind:checked={timed}>
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <div class="btn-row" style="margin-top:20px;">
      <button class="btn btn-primary" onclick={startPractice}>▶ Start Drill</button>
      <a href="/NeuroV2/" class="btn btn-ghost">← Back</a>
    </div>
  </div>
{:else}
  <!-- Practice -->
  <div class="practice-card" id="arith-card">
    <div class="drill-timer-wrap" id="arith-timer-display" style="display:none;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;justify-content:center;">
        <svg viewBox="0 0 32 32" width="36" height="36"><circle class="tr-track" cx="16" cy="16" r="14" stroke-width="2.5" fill="none" stroke="var(--border)"/><circle class="tr-fill" id="arith-timer-fill" cx="16" cy="16" r="14" stroke-width="2.5" stroke-dasharray="88" stroke-dashoffset="0" fill="none" stroke="var(--accent)"/></svg>
        <span style="font-family:var(--mono);font-size:1.2rem;font-weight:700;color:var(--accent);" id="arith-timer-num">{drillTimeLeft}</span>
      </div>
    </div>
    <div class="practice-mode-badge">{modes.join(' + ').toUpperCase()}</div>
    <div class="practice-timers">
      <div class="timer-chip"><span class="timer-label">SESSION</span><span class="timer-val">{sessionTime}</span></div>
      <div class="timer-chip"><span class="timer-label">QUESTION</span><span class="timer-val">{qTime}</span></div>
    </div>
    <div class="question-text">{@html qHtml}</div>
    <input class="answer-field" id="arith-ans" type="text" placeholder="?" autocomplete="off" inputmode="numeric" oninput={onInput} onkeydown={onKey} />
    <div class="hint-text" id="arith-hint">Press Space for hint</div>
    <div class="practice-meta">
      <div class="practice-stat-chip">Score <span>{score}</span></div>
      <div class="practice-stat-chip">Correct <span>{correct}</span></div>
      <div class="practice-stat-chip">Questions <span>{total}</span></div>
    </div>
    <div class="streak-bar">
      {#each streak as s}
        <div class="streak-dot lit"></div>
      {/each}
      {#each Array(Math.max(0, 10 - streak.length)) as _}
        <div class="streak-dot"></div>
      {/each}
    </div>
  </div>
  <div class="practice-actions">
    <button class="btn btn-ghost" onclick={goBack}>← Back to Config</button>
    <button class="btn btn-secondary" onclick={newQuestion}>Skip →</button>
  </div>
{/if}

<style>
  .cfg-item label { font-size:0.82rem;font-weight:600;display:block;margin-bottom:6px; }
</style>
