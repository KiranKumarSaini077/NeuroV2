<script lang="ts">
  import { appData } from '$lib/sync/store';
  import { writeToFirestore } from '$lib/sync/firebase';

  function downloadSnapshot() {
    const data = JSON.stringify($appData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'neurocalc_data.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function importData() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data._version) throw new Error('Invalid file');
        appData.set(data);
        alert('Data imported successfully!');
      } catch (err: any) {
        alert('Import failed: ' + err.message);
      }
    };
    input.click();
  }

  function resetAll() {
    if (!confirm('This will erase ALL progress and settings. Are you sure?')) return;
    localStorage.clear();
    location.reload();
  }

  let d = $derived($appData);
</script>

<div class="config-panel">
  <div class="config-panel-title">💾 Data Management</div>
  <div class="config-panel-sub">All data syncs automatically across devices via Firebase. Export a backup or import from file.</div>

  <div style="font-family:var(--mono);font-size:0.78rem;color:var(--text-mid);line-height:1.8;margin-bottom:20px;">
    <div>📋 Sessions recorded: <strong>{d.history.length}</strong></div>
    <div>📊 Tables mastered: <strong>{d.tblState.tablesMastered}</strong></div>
    <div>✏️ Custom facts: <strong>{d.tblCustomFacts.length}</strong></div>
    <div>🔢 Arithmetic: <strong>{(d.arithModes || []).join(', ') || 'none'}</strong></div>
    <div>🏆 Score: <strong>{d.globalScore}</strong> · Streak: <strong>{d.streak}</strong></div>
  </div>

  <div class="btn-row">
    <button class="btn btn-primary" onclick={downloadSnapshot}>⬇ Export JSON</button>
    <button class="btn btn-secondary" onclick={importData}>⬆ Import JSON</button>
    <button class="btn btn-ghost" onclick={resetAll} style="color:var(--danger);">🗑 Reset All</button>
  </div>
</div>
