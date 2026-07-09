<script lang="ts">
  import { PERFECT_CUBES } from '$lib/constants';

  let search = $state('');
  let filtered = $derived(
    search ? PERFECT_CUBES.filter(s => String(s.n).includes(search) || String(s.val).includes(search))
           : PERFECT_CUBES
  );
</script>

<div class="section-label" style="margin-bottom:16px;">Perfect Cubes Reference (1–20)</div>
<div class="table-wrap">
  <div class="table-header">
    <input class="table-search" placeholder="Search..." bind:value={search} style="background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:8px 12px;color:var(--text);font-family:var(--mono);font-size:0.78rem;outline:none;width:200px;" />
    <span style="font-family:var(--mono);font-size:0.72rem;color:var(--text-dim);margin-left:auto;">{filtered.length} / {PERFECT_CUBES.length}</span>
  </div>
  <div class="table-scroll" style="max-height:600px;overflow-y:auto;">
    <table style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:0.78rem;">
      <thead><tr style="background:var(--surface2);">
        <th style="padding:10px 16px;text-align:left;border-bottom:1px solid var(--border);">n</th>
        <th style="padding:10px 16px;text-align:left;border-bottom:1px solid var(--border);">n³</th>
        <th style="padding:10px 16px;text-align:left;border-bottom:1px solid var(--border);">∛(n³)</th>
      </tr></thead>
      <tbody>
        {#each filtered as s}
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:8px 16px;color:var(--accent4);">{s.n}</td>
            <td style="padding:8px 16px;color:var(--accent);">{s.val}</td>
            <td style="padding:8px 16px;color:var(--text-mid);">∛{s.val} = {s.n}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .section-label{font-family:var(--mono);font-size:0.65rem;letter-spacing:3px;color:var(--text-dim);text-transform:uppercase;}
  .table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;}
  .table-header{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
</style>
