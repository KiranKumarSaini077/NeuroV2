<script lang="ts">
  import { appData } from '$lib/sync/store';
  import { rnd, flash, confetti, dateStamp } from '$lib/utils';
  import { onMount, onDestroy } from 'svelte';

  type MemSet = { nums: number[]; ops: string[]; result: number };

  let view = $state<'config' | 'memorize' | 'recall' | 'result'>('config');

  let sets = $state(3);
  let perSet = $state(2);
  let memTime = $state(30);
  let ops = $state<string[]>(['+']);
  let diff = $state('easy');
  const DIFF_MAX: Record<string, number> = { easy: 9, medium: 50, hard: 99 };

  let memSets: MemSet[] = $state([]);
  let peeked = $state(false);
  let sessionStart = $state(0);
  let timeLeft = $state(30);
  let timerInt: ReturnType<typeof setInterval> | null = null;
  let correct = $state(0);
  let total = $state(0);
  let score = $state(0);
  let elapsed = $state(0);
  let submitted = $state(false);
  let userAnswers: (number | null)[] = $state([]);

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
    const nv = Math.max(c.min, Math.min(c.max, (key === 'sets' ? sets : key === 'perSet' ? perSet : memTime) + delta));
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

  function startSession() {
    memSets = genMemSets();
    peeked = false;
    submitted = false;
    sessionStart = Date.now();
    correct = 0;
    total = memSets.length;
    score = 0;
    elapsed = 0;
    userAnswers = [];
    view = 'memorize';
    startMemTimer();
  }

  function startMemTimer() {
    const total = memTime;
    const circ = 176;
    clearInterval(timerInt!);
    timeLeft = total;

    function tick() {
      const pct = timeLeft / total;
      const ring = document.getElementById('tr-fill');
      const num = document.getElementById('tr-num');
      const desc = document.getElementById('tr-desc');
      const prog = document.getElementById('mem-prog');
      if (ring) ring.style.strokeDashoffset = String(circ * (1 - pct));
      if (prog) prog.style.width = (pct * 100) + '%';
      if (num) {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        num.textContent = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : String(secs);
      }
      if (ring) {
        ring.style.stroke = pct > 0.5 ? 'var(--accent)' : pct > 0.25 ? 'var(--accent3)' : 'var(--accent2)';
      }
      if (timeLeft <= 0) {
        clearInterval(timerInt!);
        if (desc) desc.textContent = "Time's up! Now answer\u2026";
        setTimeout(goRecall, 600);
        return;
      }
      timeLeft--;
    }
    tick();
    timerInt = setInterval(tick, 1000);
  }

  function goRecall() {
    clearInterval(timerInt!);
    elapsed = Math.round((Date.now() - sessionStart) / 1000);
    view = 'recall';
    setTimeout(() => {
      const el = document.getElementById('ai0') as HTMLInputElement;
      if (el) el.focus();
    }, 100);
  }

  function cancel() {
    clearInterval(timerInt!);
    view = 'config';
  }

  function onRecallKey(e: KeyboardEvent, i: number) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = document.getElementById('ai' + (i + 1)) as HTMLInputElement;
      if (next) next.focus();
      else submitAnswers();
    }
  }

  function submitAnswers() {
    if (submitted) return;
    submitted = true;
    clearInterval(timerInt!);
    let c = 0;
    userAnswers = [];
    memSets.forEach((s, i) => {
      const inp = document.getElementById('ai' + i) as HTMLInputElement;
      const row = document.getElementById('ar' + i);
      const userVal = inp ? parseInt(inp.value) : NaN;
      const ans = isNaN(userVal) ? null : userVal;
      userAnswers.push(ans);
      const ok = ans === s.result;
      if (ok) c++;
      if (row) row.className = 'ans-row ' + (ok ? 'correct' : 'wrong');
      if (inp) inp.disabled = true;
      if (row) {
        const badge = document.createElement('span');
        badge.className = 'ans-badge ' + (ok ? 'correct' : 'wrong');
        badge.textContent = ok ? '\u2713' : '\u2717 ' + s.result;
        row.appendChild(badge);
      }
    });
    correct = c;
    let pct = Math.round((c / memSets.length) * 100);
    if (peeked) pct = Math.max(0, pct - 10);
    score = pct;

    appData.update(d => ({
      ...d,
      globalScore: d.globalScore + c * 10,
      streak: pct === 100 ? d.streak + 1 : 0,
      history: [...d.history, { score: pct, correct: c, total: memSets.length, time: elapsed, mode: 'Memory', diff, date: dateStamp() }]
    }));

    if (pct === 100) confetti();
    setTimeout(() => view = 'result', 500);
  }

  function peek() {
    peeked = true;
    const btn = document.getElementById('peek-btn') as HTMLButtonElement;
    if (btn) { btn.disabled = true; btn.textContent = '\u{1F441} Peeked (minus 10pts)'; }
    const ol = document.createElement('div');
    ol.style.cssText = 'position:fixed;inset:0;background:rgba(8,8,16,0.95);z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px;';
    memSets.forEach((s, i) => {
      const eq = s.nums.map((n, ni) =>
        `<span style="color:var(--accent4)">${n}</span>${ni < s.ops.length ? ` <span style="color:var(--accent3)">${s.ops[ni]}</span> ` : ''}`
      ).join('');
      ol.innerHTML += `<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px 28px;font-family:var(--mono);font-size:1.1rem;">
        <span style="color:var(--text-dim);font-size:0.65rem;margin-right:14px;">SET ${i + 1}</span>${eq}
      </div>`;
    });
    const cb = document.createElement('button');
    cb.textContent = '\u2715 Close';
    cb.className = 'btn btn-secondary';
    cb.style.marginTop = '16px';
    cb.onclick = () => document.body.removeChild(ol);
    ol.appendChild(cb);
    document.body.appendChild(ol);
  }

  onDestroy(() => { clearInterval(timerInt!); });
</script>

{#if view === 'config'}
  <div class="config-panel">
    <div class="config-panel-title">{'\u{1F9E9}'} Memory Calculation</div>
    <div class="config-panel-sub">Memorize multiple calculation sets, then recall all answers from memory.</div>

    <div class="config-grid">
      <div class="cfg-item">
        <label>Number of Sets</label>
        <div class="stepper">
          <button onclick={() => stepper('sets', -1)}>{'\u2212'}</button>
          <span class="stepper-val">{sets}</span>
          <button onclick={() => stepper('sets', 1)}>+</button>
        </div>
      </div>
      <div class="cfg-item">
        <label>Numbers per Set</label>
        <div class="stepper">
          <button onclick={() => stepper('perSet', -1)}>{'\u2212'}</button>
          <span class="stepper-val">{perSet}</span>
          <button onclick={() => stepper('perSet', 1)}>+</button>
        </div>
      </div>
      <div class="cfg-item">
        <label>Memorize Time (sec)</label>
        <div class="stepper">
          <button onclick={() => stepper('memTime', -1)}>{'\u2212'}</button>
          <span class="stepper-val">{memTime}</span>
          <button onclick={() => stepper('memTime', 1)}>+</button>
        </div>
      </div>
    </div>

    <div class="cfg-item" style="margin-bottom:18px;">
      <label>Operations</label>
      <div class="op-pills">
        {#each ['+', '-', '\u00d7'] as op}
          <div class="op-pill" class:selected={ops.includes(op)} onclick={() => toggleOp(op)}>
            {op === '+' ? '\uFF0B Add' : op === '-' ? '\uFF0D Sub' : '\u00d7 Mul'}
          </div>
        {/each}
      </div>
    </div>

    <div class="cfg-item" style="margin-bottom:24px;">
      <label>Difficulty</label>
      <div class="diff-row">
        {#each ['easy', 'medium', 'hard'] as d}
          <div class="diff-btn" class:sel-easy={diff === d} onclick={() => diff = d}>
            {d === 'easy' ? 'Easy' : d === 'medium' ? 'Medium' : 'Hard'}<br><small>{d === 'easy' ? '1\u20139' : d === 'medium' ? '1\u201350' : '1\u201399'}</small>
          </div>
        {/each}
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-primary" onclick={startSession}>{'\u25B6'} Start Memory Training</button>
      <a href="/NeuroV2/" class="btn btn-ghost">{'\u2190'} Back</a>
    </div>
  </div>

{:else if view === 'memorize'}
  <div class="config-panel" style="padding:28px;">
    <div class="timer-row">
      <div class="timer-ring-wrap">
        <svg viewBox="0 0 68 68" width="68" height="68">
          <circle class="tr-track" cx="34" cy="34" r="28"/>
          <circle class="tr-fill" id="tr-fill" cx="34" cy="34" r="28" stroke-dasharray="176" stroke-dashoffset="0"/>
        </svg>
        <div class="timer-num" id="tr-num">{'\u2014'}</div>
      </div>
      <div class="timer-info">
        <div class="timer-lbl">Time Remaining</div>
        <div class="timer-desc" id="tr-desc">Memorize all sets carefully</div>
      </div>
    </div>
    <div class="prog-wrap"><div class="prog-fill" id="mem-prog" style="width:100%"></div></div>
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
      <button class="btn btn-primary" onclick={goRecall}>{'\u2713'} I'm Ready — Test Me</button>
      <button class="btn btn-ghost" onclick={cancel}>{'\u2715'} Cancel</button>
    </div>
  </div>

{:else if view === 'recall'}
  <div class="config-panel" style="padding:28px;">
    <div style="margin-bottom:16px;">
      <div style="font-size:1rem;font-weight:700;margin-bottom:2px;">Enter Your Answers</div>
      <div style="color:var(--text-dim);font-size:0.83rem;">Recall each result from memory and type it in.</div>
    </div>
    <div class="ans-rows">
      {#each memSets as s, i}
        <div class="ans-row" id="ar{i}">
          <span class="ans-badge-sm">Set {i + 1}</span>
          <input class="ans-inp" id="ai{i}" type="number" placeholder="?" autocomplete="off" onkeydown={(e) => onRecallKey(e, i)} disabled={submitted} />
        </div>
      {/each}
    </div>
    <div class="divider"></div>
    <div class="btn-row">
      <button class="btn btn-success" onclick={submitAnswers} disabled={submitted}>{'\u2713'} Submit Answers</button>
      <button class="btn btn-warn" id="peek-btn" onclick={peek} disabled={peeked || submitted}>{'\u{1F441}'} Peek ({'\u2212'}10pts)</button>
      <button class="btn btn-ghost" onclick={cancel}>{'\u2715'} Quit</button>
    </div>
  </div>

{:else if view === 'result'}
  <div class="config-panel" style="padding:28px;">
    <div class="result-hero">
      <div class="result-pct">{score}%</div>
      <div class="result-lbl">Accuracy</div>
      <div class="result-msg">{['Keep Training! \u{1F4AA}','Good Effort! \u{1F44D}','Well Done! \u{1F31F}','Excellent! \u{1F3AF}','Perfect Memory! \u{1F3C6}'][Math.min(4, Math.floor(score / 20))]}</div>
    </div>
    <div class="res-grid">
      <div class="res-stat"><div class="res-stat-val">{correct}</div><div class="res-stat-lbl">Correct</div></div>
      <div class="res-stat"><div class="res-stat-val">{total}</div><div class="res-stat-lbl">Total</div></div>
      <div class="res-stat"><div class="res-stat-val">{elapsed}s</div><div class="res-stat-lbl">Time Used</div></div>
    </div>
    <div id="mem-review">
      <div class="divider"></div>
      <div class="review-header">Review</div>
      {#each memSets as s, i}
        {@const ans = userAnswers[i]}
        {@const ok = ans === s.result}
        <div class="review-row">
          <span class="review-idx">Set {i + 1}</span>
          <span class="review-eq">{s.nums.map((n, ni) => n + (ni < s.ops.length ? ' ' + s.ops[ni] + ' ' : '')).join('')}= <strong>{s.result}</strong></span>
          <span class="review-verd" class:correct={ok} class:wrong={!ok}>{ok ? '\u2713 Correct' : '\u2717 You: ' + (ans === null ? '\u2014' : ans)}</span>
        </div>
      {/each}
    </div>
    <div class="btn-row" style="margin-top:20px;">
      <button class="btn btn-primary" onclick={startSession}>{'\u21BA'} Play Again</button>
      <button class="btn btn-secondary" onclick={() => view = 'config'}>{'\u2699'} New Config</button>
      <a href="/NeuroV2/" class="btn btn-ghost">{'\u2190'} Back to Config</a>
    </div>
  </div>
{/if}

<style>
  .stepper-val{text-align:center;color:var(--text);font-family:var(--mono);font-size:1rem;min-width:48px;}
  .review-header{font-family:var(--mono);font-size:0.62rem;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;}
  .review-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:0.82rem;}
  .review-idx{color:var(--text-dim);min-width:46px;}
  .review-eq{flex:1;color:var(--text-mid);}
  .review-eq strong{color:var(--accent);}
  .review-verd.correct{color:var(--success);}
  .review-verd.wrong{color:var(--danger);}
  :global(.result-pct){font-size:5rem;}
  :global(.res-stat){background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;min-width:100px;}
  :global(.timer-desc){margin-top:4px;}
  :global(.prog-wrap){height:3px;margin-bottom:20px;}
</style>
