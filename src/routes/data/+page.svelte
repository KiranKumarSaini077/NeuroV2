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

  function downloadSelfContained() {
    const data = $appData;
    const payload = JSON.stringify(data, null, 2);
    const scriptContent = `var NC_EMBEDDED = ${payload};`;
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>NeuroCalc — Self-Contained</title>
<style>body{font-family:sans-serif;background:#080810;color:#e8e8f5;padding:40px;text-align:center;}
h1{color:#4fffb0;}p{color:#6a6a8a;}</style>
</head>
<body>
<h1>🧠 NeuroCalc</h1>
<p>Self-contained export with all your progress embedded.</p>
<p>To restore, open this file and copy the NC_EMBEDDED data, then use Import on the Data page.</p>
<pre id="data" style="display:none;">${payload}</pre>
<script>${scriptContent}<\/script>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'neurocalc_self_contained.html';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  let d = $derived($appData);
</script>

<div class="config-panel">
  <div class="config-panel-title">💾 Data Management</div>
  <div class="config-panel-sub">All data syncs automatically across devices via Firebase. Export a backup or import from file.</div>

  <div style="font-family:var(--mono);font-size:0.78rem;color:var(--text-mid);line-height:1.8;margin-bottom:20px;">
    <div>📋 Sessions recorded: <strong>{d.history.length}</strong></div>
    <div>📊 Tables mastered: <strong>{d.tblState.tablesMastered}</strong> ({d.tblState.totalMastered} facts)</div>
    <div>✏️ Custom facts: <strong>{d.tblCustomFacts.length}</strong></div>
    <div>% Fraction pool: <strong>{d.fracPoolMode}</strong> ({(d.fracSelected || []).length} selected)</div>
    <div>🔢 Arithmetic: <strong>{(d.arithModes || []).join(', ') || 'none'}</strong></div>
    <div>🏆 Score: <strong>{d.globalScore}</strong> · Streak: <strong>{d.streak}</strong></div>
  </div>

  <div class="btn-row">
    <button class="btn btn-primary" onclick={downloadSnapshot}>⬇ Export JSON</button>
    <button class="btn btn-secondary" onclick={importData}>⬆ Import JSON</button>
    <button class="btn btn-primary" onclick={downloadSelfContained}>💾 Save Self-Contained Copy</button>
    <button class="btn btn-ghost" onclick={resetAll} style="color:var(--danger);">🗑 Reset All</button>
  </div>
</div>
