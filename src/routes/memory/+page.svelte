<script lang="ts">
  import { appData } from '$lib/sync/store';
  import { rnd, shuffle, flash, flashCard, flashCardWrong } from '$lib/utils';
  import type { MemorySession } from '$lib/types.js';
  import { onMount, onDestroy } from 'svelte';

  let view = $state<'config' | 'practice'>('config');
  let showAddFact = $state(false);

  // Sessions
  let sessions = $state<MemorySession[]>([]);
  let activeSession = $state<string | null>(null);
  let editingSession = $state<string | null>(null);
  let editName = $state('');

  // Practice state
  let hint = $state('');
  let score = $state(0);
  let correct = $state(0);
  let total = $state(0);
  let streak = $state<number[]>([]);
  let pending = $state(false);
  let answer: string | number = $state('');
  let qHtml = $state('');
  let curSess = $state<MemorySession | null>(null);
  let correctInRow = $state(0);
  let timed = $state(false);
  let timeSelect = $state('60');
  let drillTimerInt: ReturnType<typeof setInterval> | null = null;
  let drillTimeLeft = $state(0);
  let storeUnsub: (() => void) | null = null;

  onMount(() => {
    storeUnsub = appData.subscribe(d => {
      const saved = d.memorySessions || [];
      if (JSON.stringify(saved) !== JSON.stringify(sessions)) {
        sessions = saved;
      }
      if (sessions.length > 0 && !activeSession) {
        activeSession = sessions[0].id;
      }
    });
  });

  onDestroy(() => {
    if (storeUnsub) storeUnsub();
  });

  function saveSessions() {
    appData.update(d => ({ ...d, memorySessions: sessions }));
  }

  function addSession() {
    const id = 'ms_' + Date.now();
    sessions = [...sessions, { id, name: 'New Table', facts: [] }];
    activeSession = id;
    saveSessions();
  }

  function addFact() {
    const inpStart = document.getElementById('mf-start') as HTMLInputElement;
    const inpAnswer = document.getElementById('mf-answer') as HTMLInputElement;
    if (!inpStart || !inpAnswer) return;
    const start = inpStart.value.trim();
    const ans = inpAnswer.value.trim();
    if (!start || !ans) return;
    const idx = sessions.findIndex(s => s.id === activeSession);
    if (idx === -1) return;
    const updated = [...sessions];
    updated[idx] = { ...updated[idx], facts: [...updated[idx].facts, { start, answer: ans }] };
    sessions = updated;
    saveSessions();
    inpStart.value = ''; inpAnswer.value = '';
    inpStart.focus();
  }

  function removeFact(fi: number) {
    const idx = sessions.findIndex(s => s.id === activeSession);
    if (idx === -1) return;
    const updated = [...sessions];
    updated[idx] = { ...updated[idx], facts: updated[idx].facts.filter((_, i) => i !== fi) };
    sessions = updated;
    saveSessions();
  }

  function renameSession() {
    if (!editingSession || !editName.trim()) return;
    const idx = sessions.findIndex(s => s.id === editingSession);
    if (idx === -1) return;
    const updated = [...sessions];
    updated[idx] = { ...updated[idx], name: editName.trim() };
    sessions = updated;
    saveSessions();
    editingSession = null;
  }

  function removeSession(id: string) {
    if (!confirm('Delete this session?')) return;
    sessions = sessions.filter(s => s.id !== id);
    if (activeSession === id) {
      activeSession = sessions.length > 0 ? sessions[0].id : null;
    }
    saveSessions();
  }

  function newQuestion() {
    const inp = document.getElementById('mem-ans') as HTMLInputElement;
    if (inp) { inp.value = ''; inp.className = 'answer-field'; inp.focus(); }
    const hintEl = document.getElementById('mem-hint');
    if (hintEl) { hintEl.textContent = 'Press Space for hint'; hintEl.className = 'hint-text'; }

    if (!curSess || curSess.facts.length === 0) {
      qHtml = `Add some facts first!`;
      return;
    }
    const fact = curSess.facts[rnd(curSess.facts.length - 1, 0)];
    answer = fact.answer;
    hint = String(answer);
    qHtml = `<span style="font-size:1.3rem;font-weight:700;">${fact.start}</span> <span style="color:var(--text-dim)">= ?</span>`;
    pending = true;
    total++;
  }

  function checkAnswer() {
    const inp = document.getElementById('mem-ans') as HTMLInputElement;
    if (!inp || !inp.value.trim()) return;
    const val = inp.value.trim();
    if (String(answer) === val) {
      inp.className = 'answer-field correct';
      correct++; score += 10; correctInRow++;
      pending = false;
      appData.update(d => ({ ...d, globalScore: d.globalScore + 10 }));
      streak = [...streak, 1];
      if (streak.length > 10) streak = streak.slice(-10);
      flash('✓');
      const card = document.getElementById('mem-card');
      if (card) flashCard(card);
      setTimeout(newQuestion, 300);
    } else {
      inp.className = 'answer-field wrong';
      correctInRow = 0;
      const card = document.getElementById('mem-card');
      if (card) flashCardWrong(card);
      setTimeout(() => { inp.className = 'answer-field'; }, 500);
    }
  }

  function onInput() {
    const inp = document.getElementById('mem-ans') as HTMLInputElement;
    if (!inp) return;
    const val = inp.value.trim();
    if (!val || val.length < String(answer).length) return;
    if (String(answer) === val) checkAnswer();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); const inp = document.getElementById('mem-ans') as HTMLInputElement; if (inp && inp.value.trim()) checkAnswer(); }
    if (e.key === ' ') { e.preventDefault(); const el = document.getElementById('mem-hint'); if (el) { el.textContent = 'Hint: ' + hint; el.className = 'hint-text shown'; } }
  }

  function startPractice() {
    const s = sessions.find(s => s.id === activeSession);
    if (!s || s.facts.length === 0) return;
    curSess = s;
    score = 0; correct = 0; total = 0; streak = []; pending = false; correctInRow = 0;
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
      history: [...d.history, { score: pct, correct, total: finalTotal, time: 0, mode: 'Memory', diff: curSess?.name || '' }]
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
    const el = document.getElementById('mem-timer-display');
    if (el) el.style.display = 'flex';
    drillTimerInt = setInterval(() => {
      drillTimeLeft--;
      if (document.getElementById('mem-timer-num')) document.getElementById('mem-timer-num')!.textContent = String(drillTimeLeft);
      if (drillTimeLeft <= 0) finishSession();
    }, 1000);
  }
</script>

{#if view === 'config'}
  <div class="config-panel">
    <div class="config-panel-title">🧠 Memory Tables</div>
    <div class="config-panel-sub">Create custom fact tables and drill them. Perfect for formulas, conversions, or anything you want to memorize.</div>

    <!-- Session list -->
    <div style="margin-bottom:18px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <label style="font-size:0.82rem;font-weight:600;">Sessions</label>
        <button class="btn btn-ghost" style="font-size:0.75rem;padding:4px 12px;" onclick={addSession}>+ New</button>
      </div>
      {#if sessions.length === 0}
        <div style="font-size:0.75rem;color:var(--text-dim);text-align:center;padding:20px 0;">No sessions yet. Create one to start drilling.</div>
      {:else}
        {#each sessions as s}
          <div class="result-row" style="padding:8px 12px;border-left:2px solid {activeSession === s.id ? 'var(--accent)' : 'transparent'};margin-bottom:4px;" onclick={() => activeSession = s.id}>
            <div style="flex:1;">
              {#if editingSession === s.id}
                <input bind:value={editName} onkeydown={(e) => { if (e.key === 'Enter') renameSession(); if (e.key === 'Escape') editingSession = null; }} onblur={renameSession} type="text" style="background:var(--surface3);border:1px solid var(--border);color:var(--text);padding:2px 6px;border-radius:3px;font-family:var(--mono);font-size:0.75rem;width:100%;" onmousedown={(e) => e.stopPropagation()} autofocus />
              {:else}
                <div style="font-weight:600;font-size:0.85rem;">{s.name}</div>
                <div style="font-size:0.7rem;color:var(--text-dim);">{s.facts.length} facts</div>
              {/if}
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-ghost" style="font-size:0.65rem;padding:2px 8px;" onmousedown={(e) => e.stopPropagation()} onclick={() => { editingSession = s.id; editName = s.name; }}>✎</button>
              <button class="btn btn-ghost" style="font-size:0.65rem;padding:2px 8px;color:var(--danger);" onmousedown={(e) => e.stopPropagation()} onclick={() => removeSession(s.id)}>✕</button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Fact manager for active session -->
    {#if activeSession}
      {@const sess = sessions.find(s => s.id === activeSession)}
      {#if sess}
        <div style="margin-bottom:18px;">
          <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:6px;">Facts for: {sess.name}</label>
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <input id="mf-start" type="text" placeholder="Start (e.g. 1 mile)" style="flex:1;background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text);font-family:var(--mono);font-size:0.75rem;outline:none;" onkeydown={(e) => { if (e.key === 'Enter') addFact(); }} />
            <input id="mf-answer" type="text" placeholder="Answer (e.g. 1.609 km)" style="flex:1;background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:6px 10px;color:var(--text);font-family:var(--mono);font-size:0.75rem;outline:none;" onkeydown={(e) => { if (e.key === 'Enter') addFact(); }} />
            <button class="btn btn-primary" style="padding:6px 16px;font-size:0.75rem;" onclick={addFact}>Add</button>
          </div>
          {#if sess.facts.length === 0}
            <div style="font-size:0.75rem;color:var(--text-dim);text-align:center;padding:10px 0;">No facts added yet.</div>
          {:else}
            <div style="display:grid;grid-template-columns:1fr;gap:4px;">
              {#each sess.facts as fact, fi}
                <div class="result-row" style="padding:6px 10px;">
                  <div style="font-family:var(--mono);font-size:0.78rem;"><span style="color:var(--text);">{fact.start}</span> <span style="color:var(--text-dim);">=</span> <span style="color:var(--accent);">{fact.answer}</span></div>
                  <button class="btn btn-ghost" style="font-size:0.65rem;padding:2px 8px;color:var(--danger);" onclick={() => removeFact(fi)}>✕</button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/if}

    <div class="btn-row">
      <button class="btn btn-primary" onclick={startPractice} disabled={!activeSession || (sessions.find(s => s.id === activeSession)?.facts.length || 0) === 0}>▶ Start Drill</button>
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
  <div class="practice-card" id="mem-card">
    <div class="drill-timer-wrap" id="mem-timer-display" style="display:none;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;justify-content:center;">
        <span style="font-family:var(--mono);font-size:1.2rem;font-weight:700;color:var(--accent);" id="mem-timer-num">{drillTimeLeft}</span>
      </div>
    </div>
    <div class="practice-mode-badge">{curSess?.name?.toUpperCase() || 'MEMORY'}</div>
    <div class="question-text">{@html qHtml}</div>
    <input class="answer-field" id="mem-ans" type="text" placeholder="?" autocomplete="off" oninput={onInput} onkeydown={onKey} />
    <div class="hint-text" id="mem-hint">Press Space for hint</div>
    <div class="practice-meta">
      <div class="practice-stat-chip">Score <span>{score}</span></div>
      <div class="practice-stat-chip">Correct <span>{correct}</span></div>
      <div class="practice-stat-chip">In a Row <span>{correctInRow}</span></div>
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
