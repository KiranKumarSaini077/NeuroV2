<script lang="ts">
  import { appData } from '$lib/sync/store';
  import { rnd, flash } from '$lib/utils';
  import { onMount, onDestroy } from 'svelte';

  type MemSet = { nums: number[]; ops: string[]; result: number };

  let view = $state<'config' | 'memorize' | 'recall' | 'result'>('config');

  // Config
  let sets = $state(3);
  let perSet = $state(2);
  let memTime = $state(30);
  let ops = $state<string[]>(['+']);
  let diff = $state('easy');
  const DIFF_MAX: Record<string, number> = { easy: 9, medium: 50, hard: 99 };

  // Session
  let memSets: MemSet[] = [];
  let peeked = $state(false);
  let sessionStart = $state(0);
  let timeLeft = $state(30);
  let timerInt: ReturnType<typeof setInterval> | null = null;
  let correct = $state(0);
  let total = $state(0);
  let score = $state(0);
  let elapsed = $state(0);
  let submitted = $state(false);
  let userAnswers: (number | null)[] = [];

  function genMemSets(): MemSet[] {
    const max = DIFF_MAX[diff];
    return Array.from({ length: sets }, () => {
      let nums: number[], opsArr: string[], result: number;
      for (let a = 0; a < 20; a++) {
        nums = Array.from({ length: perSet }, () => rnd(max));
        opsArr = Array.from({ length: perSet - 1 }, () => ops[Math.floor(Math.random() * ops.length)]);
        result = nums[0];
        opsArr.forEach((op, i) => {
          if (op === '+') result += nums[i + 1];
          else if (op === '-') result -= nums[i + 1];
          else if (op === '×') result *= nums[i + 1];
        });
        if (Number.isInteger(result) && result >= 0 && result <= 999999) break;
      }
      return { nums: nums!, ops: opsArr!, result: result! };
    });
  }

  function stepper(key: 'sets' | 'perSet' | 'memTime', delta: number) {
    const cfg = { sets: { min: 1, max: 10 }, perSet: { min: 2, max: 5 }, memTime: { min: 1, max: 300 } };
    const c = cfg[key];
    const val = key === 'sets' ? sets : key === 'perSet' ? perSet : memTime;
    const nv = Math.max(c.min, Math.min(c.max, val + delta));
    if (key === 'sets') sets = nv;
    else if (key === 'perSet') perSet = nv;
    else memTime = nv;
  }

  function toggleOp(op: string) {
    if (ops.includes(op)) {
      if (ops.length === 1) return;
      ops = ops.filter(o => o !== op);
    } else {
      ops = [...ops, op];
    }
  }

  function setDiff(d: string) { diff = d; }

  function startSession() {
    memSets = genMemSets();
    peeked = false;
    sessionStart = Date.now();
    timeLeft = memTime;
    correct = 0;
    total = memSets.length;
    score = 0;
    elapsed = 0;
    submitted = false;
    view = 'memorize';
    startMemTimer();
  }

  function startMemTimer() {
    clearInterval(timerInt!);
    timeLeft = memTime;
    const tick = () => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(timerInt!);
        goRecall();
        return;
      }
    };
    tick();
    timerInt = setInterval(tick, 1000);
  }

  function goRecall() {
    clearInterval(timerInt!);
    elapsed = Math.round((Date.now() - sessionStart) / 1000);
    view = 'recall';
    // Focus first input after render
    setTimeout(() => {
      const el = document.getElementById('ai0') as HTMLInputElement;
      if (el) el.focus();
    }, 100);
  }

  function cancel() {
    clearInterval(timerInt!);
    view = 'config';
  }

  function submitAnswers() {
    if (submitted) return;
    submitted = true;
    clearInterval(timerInt!);
    elapsed = Math.round((Date.now() - sessionStart) / 1000);
    let c = 0;
    userAnswers = [];
    memSets.forEach((_, i) => {
      const inp = document.getElementById('ai' + i) as HTMLInputElement;
      const row = document.getElementById('ar' + i);
      if (!inp || !row) return;
      const val = parseInt(inp.value);
      const ans = isNaN(val) ? null : val;
      userAnswers.push(ans);
      const ok = ans === memSets[i].result;
      if (ok) c++;
      row.className = 'ans-row ' + (ok ? 'correct' : 'wrong');
      inp.disabled = true;
      const badge = document.createElement('span');
      badge.className = 'ans-badge ' + (ok ? 'correct' : 'wrong');
      badge.textContent = ok ? '✓' : '✗ ' + memSets[i].result;
      row.appendChild(badge);
    });
    correct = c;
    let pct = Math.round((c / memSets.length) * 100);
    if (peeked) pct = Math.max(0, pct - 10);
    score = pct;

    appData.update(d => ({
      ...d,
      globalScore: d.globalScore + c * 10,
      streak: pct === 100 ? d.streak + 1 : 0,
      history: [...d.history, { score: pct, correct: c, total: memSets.length, time: elapsed, mode: 'Memory', diff }]
    }));

    setTimeout(() => view = 'result', 500);
  }

  function peek() {
    peeked = true;
    const overlay = document.createElement('div');
    overlay.className = 'peek-overlay';
    overlay.innerHTML = memSets.map((s, i) => {
      const eq = s.nums.map((n, ni) =>
        `<span class="peek-n">${n}</span>${ni < s.ops.length ? ` <span class="peek-o">${s.ops[ni]}</span> ` : ''}`
      ).join('');
      return `<div class="peek-row"><span class="peek-idx">SET ${i + 1}</span>${eq}</div>`;
    }).join('') + `<button class="btn btn-secondary peek-close" onclick="this.parentElement.remove()">✕ Close</button>`;
    document.body.appendChild(overlay);
  }

  function onKeyRecall(e: KeyboardEvent) {
    if (e.key === 'Enter' && !submitted) {
      submitAnswers();
    }
  }

  onDestroy(() => { clearInterval(timerInt!); });
</script>

{#if view === 'config'}
  <div class="config-panel">
    <div class="config-panel-title">🧩 Memory Calculation</div>
    <div class="config-panel-sub">Memorize multiple calculation sets, then recall all answers from memory.</div>

    <div class="config-grid">
      <div class="cfg-item">
        <label>Number of Sets</label>
        <div class="stepper">
          <button onclick={() => stepper('sets', -1)}>−</button>
          <span style="text-align:center;color:var(--text);font-family:var(--mono);font-size:1rem;min-width:48px;">{sets}</span>
          <button onclick={() => stepper('sets', 1)}>+</button>
        </div>
      </div>
      <div class="cfg-item">
        <label>Numbers per Set</label>
        <div class="stepper">
          <button onclick={() => stepper('perSet', -1)}>−</button>
          <span style="text-align:center;color:var(--text);font-family:var(--mono);font-size:1rem;min-width:48px;">{perSet}</span>
          <button onclick={() => stepper('perSet', 1)}>+</button>
        </div>
      </div>
      <div class="cfg-item">
        <label>Memorize Time (sec)</label>
        <div class="stepper">
          <button onclick={() => stepper('memTime', -1)}>−</button>
          <span style="text-align:center;color:var(--text);font-family:var(--mono);font-size:1rem;min-width:48px;">{memTime}</span>
          <button onclick={() => stepper('memTime', 1)}>+</button>
        </div>
      </div>
    </div>

    <div class="cfg-item" style="margin-bottom:18px;">
      <label>Operations</label>
      <div class="op-pills">
        {#each ['+', '-', '×'] as op}
          <div class="op-pill" class:selected={ops.includes(op)} onclick={() => toggleOp(op)} data-op={op}>
            {op === '+' ? '＋ Add' : op === '-' ? '－ Sub' : '× Mul'}
          </div>
        {/each}
      </div>
    </div>

    <div class="cfg-item" style="margin-bottom:24px;">
      <label>Difficulty</label>
      <div class="diff-row">
        {#each ['easy', 'medium', 'hard'] as d}
          <div class="diff-btn" class:sel-easy={diff === d} onclick={() => setDiff(d)}>
            {d === 'easy' ? 'Easy' : d === 'medium' ? 'Medium' : 'Hard'}<br><small>{d === 'easy' ? '1–9' : d === 'medium' ? '1–50' : '1–99'}</small>
          </div>
        {/each}
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-primary" onclick={startSession}>▶ Start Memory Training</button>
      <a href="/NeuroV2/" class="btn btn-ghost">← Back</a>
    </div>
  </div>

{:else if view === 'memorize'}
  <div class="config-panel" style="padding:28px;">
    <div class="timer-row">
      <div class="timer-ring-wrap">
        <svg viewBox="0 0 68 68" width="68" height="68">
          <circle class="tr-track" cx="34" cy="34" r="28" stroke-width="4" fill="none" stroke="var(--border2)"/>
          <circle class="tr-fill" id="mem-ring" cx="34" cy="34" r="28"
                  stroke-dasharray="176" stroke-dashoffset="0" stroke-width="4" fill="none" stroke="var(--accent)" stroke-linecap="round"/>
        </svg>
        <div class="timer-num" id="mem-timer-num">{timeLeft}</div>
      </div>
      <div class="timer-info">
        <div class="timer-lbl">Time Remaining</div>
        <div class="timer-desc">Memorize all sets carefully</div>
      </div>
    </div>
    <div class="prog-wrap">
      <div class="prog-fill" style="width:{(timeLeft / memTime) * 100}%"></div>
    </div>
    <div class="mem-sets-wrap">
      {#each memSets as s, i}
        <div class="mem-set-card" style="animation-delay:{i * 0.07}s">
          <span class="mem-set-idx">SET {i + 1}</span>
          <div class="mem-eq">
            {#each s.nums as n, ni}
              <span class="n">{n}</span>
              {#if ni < s.ops.length}
                <span class="o">{s.ops[ni]}</span>
              {/if}
            {/each}
            <span class="o">=</span>
            <span style="color:var(--text-dim)">?</span>
          </div>
        </div>
      {/each}
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick={goRecall}>✓ I'm Ready — Test Me</button>
      <button class="btn btn-ghost" onclick={cancel}>✕ Cancel</button>
    </div>
  </div>

{:else if view === 'recall'}
  <div class="config-panel" style="padding:28px;">
    <div style="margin-bottom:16px;">
      <div style="font-size:1rem;font-weight:700;margin-bottom:2px;">Enter Your Answers</div>
      <div style="color:var(--text-dim);font-size:0.83rem;">Recall each result from memory and type it in.</div>
    </div>
    <div class="ans-rows" onkeydown={onKeyRecall}>
      {#each memSets as s, i}
        <div class="ans-row" id="ar{i}">
          <span class="ans-badge-sm">Set {i + 1}</span>
          <input class="ans-inp" id="ai{i}" type="number" placeholder="?" autocomplete="off" disabled={submitted} />
        </div>
      {/each}
    </div>
    <div class="divider"></div>
    <div class="btn-row">
      <button class="btn btn-success" onclick={submitAnswers} disabled={submitted}>✓ Submit Answers</button>
      <button class="btn btn-warn" onclick={peek} disabled={peeked || submitted}>👁 Peek (−10pts)</button>
      <button class="btn btn-ghost" onclick={cancel}>✕ Quit</button>
    </div>
  </div>

{:else if view === 'result'}
  <div class="config-panel" style="padding:28px;">
    <div class="result-hero">
      <div class="result-pct" style="background:linear-gradient(135deg,var(--accent5),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">{score}%</div>
      <div class="result-lbl">Accuracy</div>
      <div class="result-msg">{['Keep Training! 💪','Good Effort! 👍','Well Done! 🌟','Excellent! 🎯','Perfect Memory! 🏆'][Math.min(4, Math.floor(score / 20))]}</div>
    </div>
    <div class="res-grid">
      <div class="res-stat">
        <div class="res-stat-val" style="color:var(--accent)">{correct}</div>
        <div class="res-stat-lbl">Correct</div>
      </div>
      <div class="res-stat">
        <div class="res-stat-val" style="color:var(--accent)">{total}</div>
        <div class="res-stat-lbl">Total</div>
      </div>
      <div class="res-stat">
        <div class="res-stat-val" style="color:var(--accent)">{elapsed}s</div>
        <div class="res-stat-lbl">Time Used</div>
      </div>
    </div>
    <div class="divider"></div>
    <div style="font-family:var(--mono);font-size:0.62rem;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Review</div>
    {#each memSets as s, i}
      {@const ans = userAnswers[i]}
      {@const ok = ans === s.result}
      <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:0.82rem;">
        <span style="color:var(--text-dim);min-width:46px;">Set {i + 1}</span>
        <span style="flex:1;color:var(--text-mid);">
          {s.nums.map((n, ni) => n + (ni < s.ops.length ? ' ' + s.ops[ni] + ' ' : '')).join('')}= <strong style="color:var(--accent)">{s.result}</strong>
        </span>
        <span style="color:{ok ? 'var(--success)' : 'var(--danger)'};">{ok ? '✓ Correct' : '✗ You: ' + (ans === null ? '—' : ans)}</span>
      </div>
    {/each}
    <div class="btn-row" style="margin-top:20px;">
      <button class="btn btn-primary" onclick={startSession}>↺ Play Again</button>
      <button class="btn btn-secondary" onclick={() => view = 'config'}>⚙ New Config</button>
      <a href="/NeuroV2/" class="btn btn-ghost">← Back</a>
    </div>
  </div>
{/if}

<style>
  :global(.peek-overlay) {
    position:fixed;inset:0;background:rgba(8,8,16,0.95);z-index:100;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px;
  }
  :global(.peek-row) {
    background:var(--surface);border:1px solid var(--border);border-radius:10px;
    padding:16px 28px;font-family:var(--mono);font-size:1.1rem;
  }
  :global(.peek-idx) { color:var(--text-dim);font-size:0.65rem;margin-right:14px; }
  :global(.peek-n) { color:var(--accent4); }
  :global(.peek-o) { color:var(--accent3);margin:0 4px; }
  :global(.peek-close) { margin-top:16px; }
</style>
