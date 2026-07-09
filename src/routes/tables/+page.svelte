<script lang="ts">
  import { appData } from '$lib/sync/store';
  import { rnd, flash, flashCard, flashCardWrong, confetti, dateStamp } from '$lib/utils';
  import type { CustomFact } from '$lib/types';

  const TABLES_ORDER = [1,2,10,5,11,9,3,4,6,8,7,12,15,20,25,13,14,16,17,18,19,21,22,23,24];

  const TABLES_TIPS: Record<number, string> = {
    1: 'Identity: any number × 1 = itself. Instant confidence boost!',
    2: 'Doubling: add the number to itself. 2×7 = 7+7 = 14',
    3: 'Triple: double + one more. 3×7 = 14+7 = 21',
    4: 'Double the double: 4×7 = 2×(2×7) = 2×14 = 28',
    5: 'Half of ×10. Always ends in 0 or 5. 5×7 = 70÷2 = 35',
    6: 'Triple then double: 6×7 = 2×(3×7) = 2×21 = 42',
    7: 'The tough one! Key: 7×7=49, 7×8=56 (digits 5,6,7,8)',
    8: 'Double ×4: 8×7 = 2×(4×7) = 2×28 = 56',
    9: '×10 minus number: 9×7 = 70−7 = 63. Digits always sum to 9!',
    10: 'Just add a zero! 10×7 = 70',
    11: 'For 1-9: repeat the digit (11,22,33…77). Teens: split & add middle.',
    12: '×10 + ×2: 12×7 = 70+14 = 84',
    13: '×10 + ×3: 13×7 = 70+21 = 91',
    14: '×10 + ×4: 14×7 = 70+28 = 98',
    15: '×10 + ×5: 15×7 = 70+35 = 105',
    16: '×10 + ×6: 16×7 = 70+42 = 112',
    17: '×10 + ×7: 17×7 = 70+49 = 119',
    18: '×20 − ×2: 18×7 = 140−14 = 126. Or double ×9.',
    19: '×20 − n: 19×7 = 140−7 = 133',
    20: 'Double then add zero: 20×7 = 140',
    21: '×20 + n: 21×7 = 140+7 = 147',
    22: '×20 + ×2: 22×7 = 140+14 = 154',
    23: '×20 + ×3: 23×7 = 140+21 = 161',
    24: '×25 − n: 24×7 = 175−7 = 168. Or ×20+×4.',
    25: 'Quarter of ×100: 25×n = n×100÷4. 25×8 = 800÷4 = 200'
  };

  let phase = $state<'overview' | 'study' | 'quiz' | 'complete'>('overview');
  let currentTable = $state(0);
  let facts: Record<number, { level: number; correct: number; wrong: number }> = $state({});
  let factsMastered = $state(0);
  let score = $state(0);
  let currentFact: number | null = $state(null);
  let lastFact: number | null = $state(null);
  let wrongStreak = $state(0);
  let hint = $state('');
  let quizFeedback = $state('');

  let mastered = $state<number[]>([...($appData.tblState.mastered || [])]);
  let customFacts = $state<CustomFact[]>([...($appData.tblCustomFacts || [])]);
  let customFactIdx: number | null = $state(null);
  let customFactLevels: Record<number, number> = $state({ ...($appData.tblState.customFactLevels || {}) });
  let isCustom = $state(false);

  let customA = $state('');
  let customB = $state('');
  let customOp = $state('+');

  let masteredCount = $derived(mastered.length);
  let nextTable = $derived(TABLES_ORDER.find(t => !mastered.includes(t)) || 0);

  function persist() {
    appData.update(d => ({
      ...d,
      tblState: { ...d.tblState, mastered: [...mastered], customFactLevels: { ...customFactLevels } },
      tblCustomFacts: [...customFacts]
    }));
  }

  function showView(v: 'overview' | 'study' | 'quiz' | 'complete') { phase = v; }

  function startStudy(n: number) {
    currentTable = n;
    phase = 'study';
  }

  function startQuiz() {
    facts = {};
    factsMastered = 0;
    score = 0;
    wrongStreak = 0;
    lastFact = null;
    currentFact = null;
    quizFeedback = '';
    for (let m = 1; m <= 10; m++) facts[m] = { level: 0, correct: 0, wrong: 0 };
    phase = 'quiz';
    nextFact();
  }

  function nextFact() {
    if (isCustom) {
      const unmastered: number[] = [];
      for (let i = 0; i < customFacts.length; i++) {
        if ((customFactLevels[i] || 0) < 3) unmastered.push(i);
      }
      if (unmastered.length === 0) { completeCustom(); return; }
      const pick = unmastered[rnd(unmastered.length - 1, 0)];
      customFactIdx = pick;
      const fact = customFacts[pick];
      hint = String(computeAns(fact));
      const q = document.getElementById('tbl-q-ans') as HTMLInputElement;
      if (q) { q.value = ''; q.className = 'answer-field'; q.disabled = false; q.focus(); }
      quizFeedback = '';
      return;
    }

    const q = document.getElementById('tbl-q-ans') as HTMLInputElement;
    if (q) { q.value = ''; q.className = 'answer-field'; q.disabled = false; q.focus(); }
    quizFeedback = '';

    const unmastered = Object.entries(facts).filter(([, f]) => f.level < 3);
    if (unmastered.length === 0) { completeTable(); return; }

    const pool: number[] = [];
    for (const [key, f] of unmastered) {
      const weight = f.level === 0 ? 4 : f.level === 1 ? 2 : 1;
      for (let w = 0; w < weight; w++) pool.push(parseInt(key));
    }

    let pick: number, attempts = 0;
    do { pick = pool[rnd(pool.length - 1, 0)]; attempts++; }
    while (pool.length > 1 && pick === lastFact && attempts < 20);

    currentFact = pick;
    lastFact = pick;
    hint = String(currentTable * pick);
  }

  function checkQuiz() {
    const inp = document.getElementById('tbl-q-ans') as HTMLInputElement;
    if (!inp || !inp.value.trim() || inp.disabled) return;
    const val = inp.value.trim();

    if (isCustom && customFactIdx !== null) {
      const fact = customFacts[customFactIdx];
      const correctAns = computeAns(fact);
      const sym = opSym(fact.op);
      const isCorrect = parseInt(val) === correctAns;
      let lvl = customFactLevels[customFactIdx] || 0;
      inp.disabled = true;
      if (isCorrect) {
        inp.className = 'answer-field correct';
        lvl = Math.min(3, lvl + 1);
        customFactLevels[customFactIdx] = lvl;
        score += 10;
        if (lvl >= 3) {
          factsMastered++;
          quizFeedback = `✓ "${fact.a}${sym}${fact.b}=${correctAns}" MASTERED!`;
          flash('🏆');
        } else {
          quizFeedback = `✓ Correct! (${lvl}/3 to master)`;
          flash('✓');
        }
        appData.update(d => ({ ...d, globalScore: d.globalScore + 10 }));
        flashCard(document.getElementById('tbl-q-card')!);
        persist();
        setTimeout(nextFact, 700);
      } else {
        inp.className = 'answer-field wrong';
        customFactLevels[customFactIdx] = 0;
        quizFeedback = `✗ ${fact.a} ${sym} ${fact.b} = ${correctAns} (you typed ${val}). Reset.`;
        persist();
        setTimeout(nextFact, 2000);
      }
      return;
    }

    const n = currentTable;
    const m = currentFact!;
    const correctAns = n * m;
    const isCorrect = parseInt(val) === correctAns;
    const fact = facts[m];
    inp.disabled = true;

    if (isCorrect) {
      inp.className = 'answer-field correct';
      fact.level = Math.min(3, fact.level + 1);
      fact.correct++;
      score += 10;
      wrongStreak = 0;
      appData.update(d => ({ ...d, globalScore: d.globalScore + 10 }));

      if (fact.level >= 3) {
        factsMastered++;
        quizFeedback = `✓ Correct! "${n}×${m}=${correctAns}" MASTERED!`;
        flash('🏆');
      } else {
        quizFeedback = `✓ Correct! (${fact.level}/3 to master)`;
        flash('✓');
      }
      flashCard(document.getElementById('tbl-q-card')!);
      setTimeout(nextFact, 700);
    } else {
      inp.className = 'answer-field wrong';
      fact.level = 0;
      fact.wrong++;
      wrongStreak++;
      let msg = `✗ ${n} × ${m} = ${correctAns} (you typed ${val}). Reset to start.`;
      if (wrongStreak >= 3) msg += ' ' + (TABLES_TIPS[n] || '');
      quizFeedback = msg;
      setTimeout(nextFact, 2000);
    }
  }

  function completeTable() {
    mastered = [...mastered, currentTable];
    const mc = mastered.length;
    const remaining = 25 - mc;
    const msgs = ['Good start!', 'Building momentum!', 'Halfway there!', 'Almost done!', 'LEGENDARY!'];
    const msgsEmoji = ['💪', '🔥', '⚡', '🌟', '🏆'];
    const idx = Math.min(4, Math.floor(mc / 5));
    appData.update(d => ({
      ...d,
      globalScore: d.globalScore + score,
      history: [...d.history, { score: 100, correct: 10, total: 10, time: 0, mode: `Tables ×${currentTable}`, diff: 'mastered', date: dateStamp() }]
    }));
    persist();
    flash('🏆');
    if (mc >= 5) confetti();
    phase = 'complete';
  }

  function completeCustom() {
    isCustom = false;
    appData.update(d => ({
      ...d, globalScore: d.globalScore + score,
      history: [...d.history, { score: factsMastered > 0 ? 100 : 0, correct: factsMastered, total: customFacts.length, time: 0, mode: 'Custom Facts', diff: 'custom', date: dateStamp() }]
    }));
    persist();
    flash('🏆');
    phase = 'complete';
  }

  function backToOverview() {
    isCustom = false;
    phase = 'overview';
  }

  function smartStart() {
    if (!nextTable) { flash('🏆'); alert('You have mastered ALL 25 tables!'); return; }
    startStudy(nextTable);
  }

  function resetProgress() {
    if (!confirm('Reset all tables mastery progress? This cannot be undone.')) return;
    mastered = [];
    persist();
  }

  function addCustomFact() {
    const a = parseInt(customA.trim());
    const b = parseInt(customB.trim());
    if (!a || !b || a < 1 || b < 1) { flash('⚠ Enter two numbers'); return; }
    if (customOp === '/' && (b === 0 || a % b !== 0)) { flash('⚠ Division must be exact'); return; }
    customFacts = [...customFacts, { a, b, op: customOp, active: true }];
    customA = ''; customB = '';
    persist();
    flash('✓');
  }

  function deleteCustomFact(idx: number) {
    customFacts = customFacts.filter((_, i) => i !== idx);
    persist();
  }

  function toggleCustomFact(idx: number) {
    customFacts = customFacts.map((f, i) => i === idx ? { ...f, _sel: f._sel === false ? true : false } : f);
    persist();
  }

  function practiceCustomFacts() {
    const selected = customFacts.filter(f => f._sel !== false);
    if (selected.length === 0) { flash('⚠ Select at least one fact'); return; }
    isCustom = true;
    customFacts = selected;
    customFactLevels = {};
    for (let i = 0; i < selected.length; i++) customFactLevels[i] = 0;
    customFactIdx = null;
    factsMastered = 0;
    score = 0;
    wrongStreak = 0;
    lastFact = null;
    phase = 'quiz';
    nextFact();
  }

  function computeAns(f: CustomFact): number {
    if (f.op === '+') return f.a + f.b;
    if (f.op === '-') return f.a - f.b;
    if (f.op === '*') return f.a * f.b;
    if (f.op === '/') return Math.round(f.a / f.b);
    return f.a * f.b;
  }

  function opSym(op: string): string {
    return { '+': '+', '-': '−', '*': '×', '/': '÷' }[op] || '×';
  }

  function onQuizInput() {
    const inp = document.getElementById('tbl-q-ans') as HTMLInputElement;
    if (!inp || inp.disabled) return;
    const val = inp.value.trim();
    if (!val) return;
    const correctAns = isCustom
      ? computeAns(customFacts[customFactIdx!])
      : currentTable * currentFact!;
    if (val === String(correctAns)) checkQuiz();
  }

  function onQuizKey(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); checkQuiz(); }
    if (e.key === ' ') { e.preventDefault(); showHint(); }
  }

  function showHint() {
    const el = document.getElementById('tbl-q-hint');
    if (el) { el.textContent = 'Hint: ' + hint; el.className = 'hint-text shown'; }
  }

  let selectedCount = $derived(customFacts.filter(f => f._sel !== false).length);
</script>

{#if phase === 'overview'}
  <div class="config-panel">
    <div class="config-panel-title">📊 Tables Mastery — Learn ×1 to ×25</div>
    <div class="config-panel-sub">Proven Leitner spaced-repetition: Study a table, then quiz yourself. Each fact must be recalled correctly <strong>3 times</strong> to be mastered. Wrong answers reset to zero.</div>

    <div class="tbl-progress">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-family:var(--mono);font-size:0.72rem;color:var(--text-dim);">OVERALL PROGRESS</span>
        <span style="font-family:var(--mono);font-size:0.72rem;color:var(--accent);">{masteredCount}/25 tables mastered</span>
      </div>
      <div class="tbl-progress-bar"><div class="tbl-progress-fill" style="width:{masteredCount/25*100}%"></div></div>
    </div>

    <div class="tables-grid">
      {#each TABLES_ORDER as n}
        {@const isMastered = mastered.includes(n)}
        {@const isNext = n === nextTable}
        <div class="tbl-cell" class:mastered={isMastered} class:next={isNext} onclick={() => startStudy(n)}>
          <div class="tbl-cell-num">×{n}</div>
          <div class="tbl-cell-status">{isMastered ? '✓ Done' : isNext ? '→ Next' : '○'}</div>
        </div>
      {/each}
    </div>

    <div class="btn-row">
      <button class="btn btn-primary" onclick={smartStart}>▶ Smart Start (Next Table)</button>
      <button class="btn btn-ghost" onclick={resetProgress}>↺ Reset Progress</button>
    </div>
  </div>

  <div class="config-panel" style="margin-top:20px;">
    <div class="config-panel-title">✏️ Custom Facts</div>
    <div class="config-panel-sub">Save your own math facts (+ − × ÷) and practice them anytime.</div>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center;">
      <input class="answer-field" id="tbl-custom-a" type="text" placeholder="a" bind:value={customA} style="width:70px;text-align:center;" inputmode="numeric" />
      <div class="diff-row" style="gap:4px;">
        {#each ['+', '-', '*', '/'] as op}
          <div class="diff-btn" class:sel-easy={customOp === op} onclick={() => customOp = op} style="min-width:36px;text-align:center;font-size:1rem;">{op === '*' ? '×' : op === '/' ? '÷' : op}</div>
        {/each}
      </div>
      <input class="answer-field" type="text" placeholder="b" bind:value={customB} style="width:70px;text-align:center;" inputmode="numeric" />
      <button class="btn btn-primary" onclick={addCustomFact} style="padding:8px 18px;">+ Add</button>
    </div>

    {#if customFacts.length === 0}
      <div style="padding:12px;color:var(--text-dim);font-size:0.82rem;text-align:center;">No custom facts yet. Add one above!</div>
    {:else}
      <div style="display:flex;flex-direction:column;gap:6px;">
        {#each customFacts as f, i}
          <div style="display:flex;align-items:center;gap:10px;background:var(--surface3);border:1px solid var(--border);border-radius:8px;padding:8px 12px;">
            <input type="checkbox" checked={f._sel !== false} onchange={() => toggleCustomFact(i)} style="width:18px;height:18px;accent-color:var(--accent);cursor:pointer;">
            <span style="font-family:var(--mono);font-size:1rem;font-weight:600;flex:1;">{f.a} {opSym(f.op)} {f.b} = {computeAns(f)}</span>
            <button class="btn btn-ghost" onclick={() => deleteCustomFact(i)} style="padding:4px 10px;font-size:0.75rem;color:var(--danger);">✕</button>
          </div>
        {/each}
      </div>
    {/if}

    <div class="btn-row" style="margin-top:16px;">
      <button class="btn btn-primary" onclick={practiceCustomFacts} disabled={selectedCount === 0}>▶ Practice Selected ({selectedCount})</button>
    </div>
  </div>

{:else if phase === 'study'}
  <div class="config-panel" style="padding:28px;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
      <div style="font-size:2.2rem;">📖</div>
      <div>
        <div style="font-size:1.2rem;font-weight:700;">Study the ×{currentTable} Table</div>
        <div style="font-size:0.82rem;color:var(--text-dim);">Read each fact carefully, then test yourself.</div>
      </div>
    </div>
    {#if TABLES_TIPS[currentTable]}
      <div class="tbl-tip-box">{TABLES_TIPS[currentTable]}</div>
    {/if}
    <div class="tbl-fact-grid">
      {#each Array(10) as _, m}
        {@const multiplier = m + 1}
        <div class="tbl-fact-card">
          <span class="tbl-fact-eq">{currentTable} × {multiplier}</span>
          <span class="tbl-fact-ans">= {currentTable * multiplier}</span>
        </div>
      {/each}
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick={startQuiz}>✓ I Know It — Quiz Me!</button>
      <button class="btn btn-ghost" onclick={backToOverview}>← Back</button>
    </div>
  </div>

{:else if phase === 'quiz'}
  <div class="practice-card" id="tbl-q-card">
    <div class="practice-mode-badge">{isCustom ? 'CUSTOM FACTS' : `× ${currentTable} TABLE`}</div>
    <div style="margin-bottom:16px;">
      <div class="prog-wrap"><div class="prog-fill" style="width:{(factsMastered / (isCustom ? customFacts.length : 10)) * 100}%"></div></div>
    </div>
    {#if isCustom && customFactIdx !== null}
      {@const f = customFacts[customFactIdx]}
      <div class="question-text">{f.a} {opSym(f.op)} {f.b} = ?</div>
    {:else}
      <div class="question-text">{currentTable} × {currentFact} = ?</div>
    {/if}
    <input class="answer-field" id="tbl-q-ans" type="text" placeholder="?" autocomplete="off" inputmode="numeric" oninput={onQuizInput} onkeydown={onQuizKey} />
    <div class="hint-text" id="tbl-q-hint">Press Space for hint</div>
    <div class="tbl-feedback" class:correct={quizFeedback.includes('✓')} class:wrong={quizFeedback.includes('✗')} class:mastered-fb={quizFeedback.includes('MASTERED')}>{quizFeedback}</div>
    <div class="practice-meta">
      <div class="practice-stat-chip">Mastered <span>{factsMastered}</span>/{isCustom ? customFacts.length : 10}</div>
      <div class="practice-stat-chip">Score <span>{score}</span></div>
    </div>
    <div class="section-label" style="margin-top:24px;">Leitner Boxes</div>
    <div class="leitner-boxes">
      {#each ['📥 New', '📦 Learning', '📋 Familiar', '✅ Mastered'] as lbl, boxIdx}
        {@const boxItems = isCustom
          ? customFacts.map((f, i) => ({ i, f, lvl: customFactLevels[i] || 0 })).filter(x => x.lvl === boxIdx)
          : Object.entries(facts).filter(([, f]) => f.level === boxIdx).map(([k]) => parseInt(k))}
        <div class="leitner-box" class:done={boxIdx === 3}>
          <div class="leitner-box-label">{lbl}</div>
          <div class="leitner-box-facts">
            {#if boxItems.length > 0}
              {#each boxItems as item}
                {@const active = isCustom
                  ? (item as any).i === customFactIdx
                  : (item as number) === currentFact}
                <span class="leitner-fact" class:active={active}>
                  {isCustom
                    ? `${(item as any).f.a}${opSym((item as any).f.op)}${(item as any).f.b}`
                    : `${currentTable}×${item}`}
                </span>
              {/each}
            {:else}
              <span style="color:var(--text-dim);font-size:0.65rem;">—</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
  <div class="practice-actions">
    <button class="btn btn-ghost" onclick={backToOverview}>← Quit</button>
    <button class="btn btn-secondary" onclick={() => { phase = 'study'; }}>📖 Review Table</button>
  </div>

{:else if phase === 'complete'}
  <div class="config-panel" style="padding:28px;">
    <div class="result-hero">
      <div style="font-size:4rem;margin-bottom:12px;">🏆</div>
      <div class="result-pct">{isCustom ? 'CUSTOM' : `×${currentTable}`}</div>
      <div class="result-lbl">{isCustom ? 'CUSTOM FACTS DONE' : 'TABLE MASTERED'}</div>
      <div class="result-msg">{isCustom ? 'Custom facts practice complete! 🎉' : `${masteredCount} tables done, ${25 - masteredCount} remaining`}</div>
    </div>
    <div class="res-grid">
      <div class="res-stat"><div class="res-stat-val">{factsMastered}</div><div class="res-stat-lbl">Mastered</div></div>
      <div class="res-stat"><div class="res-stat-val">{isCustom ? customFacts.length : 10}</div><div class="res-stat-lbl">Total</div></div>
      <div class="res-stat"><div class="res-stat-val">{score}</div><div class="res-stat-lbl">Score</div></div>
    </div>
    <div class="btn-row" style="margin-top:20px;">
      <button class="btn btn-primary" onclick={smartStart}>▶ Next Table</button>
      <button class="btn btn-secondary" onclick={backToOverview}>📊 Overview</button>
    </div>
  </div>
{/if}
