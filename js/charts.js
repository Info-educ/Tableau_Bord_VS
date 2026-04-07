// ═══════════════════════════════════════════════════════════
//  charts.js — Construction des graphiques Chart.js V12
//  Dépend de : config.js
//  Corrections V12 :
//    - isDark() définie UNE SEULE FOIS ici (supprimée du HTML global)
//    - _instances géré proprement
// ═══════════════════════════════════════════════════════════

const Charts = (() => {

  const _inst = {};

  // ── isDark — définie ici, utilisable globalement via Charts.isDark()
  function isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  // ── Options de base communes à tous les graphiques
  function baseOpts(extra = {}) {
    const dark = isDark();
    const tc   = dark ? '#5a6577' : '#718096';
    const gc   = dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)';
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: dark ? '#8b97ad' : '#4a5568', font: { family: 'Outfit', size: 11 }, boxWidth: 12, padding: 12 }
        },
        tooltip: {
          backgroundColor: dark ? '#1a2744' : '#fff',
          titleColor:      dark ? '#e8ecf4' : '#1a2030',
          bodyColor:       dark ? '#8b97ad' : '#4a5568',
          borderColor:     dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)',
          borderWidth: 1, padding: 10, cornerRadius: 7
        }
      },
      scales: {
        x: { ticks: { color: tc, font: { family: 'Outfit', size: 10 } }, grid: { color: gc } },
        y: { ticks: { color: tc, font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: gc }, beginAtZero: true }
      },
      ...extra
    };
  }

  // ── Crée ou remplace un graphique sur un canvas
  function _upsert(id, type, data, opts) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    if (_inst[id]) { _inst[id].destroy(); delete _inst[id]; }
    _inst[id] = new Chart(canvas, { type, data, options: opts });
    return _inst[id];
  }

  // ── Graphique "aucune donnée" sur un canvas vide
  function _empty(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (_inst[id]) { _inst[id].destroy(); delete _inst[id]; }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = isDark() ? '#5a6577' : '#9ca3af';
    ctx.font = '13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Aucune donnée', canvas.width / 2, canvas.height / 2);
  }

  function _sliceMois(arr, range) { return (arr || []).slice(range[0], range[1] + 1); }
  function _moisLabels(range)     { return CFG.mois.slice(range[0], range[1] + 1); }

  // ─────────────────────────────────────────
  //  COURBE MULTI-ANNÉES
  // ─────────────────────────────────────────
  function lineParMois(id, dataParAnnee, range, annees) {
    const labels   = _moisLabels(range);
    const datasets = annees.map((a, i) => ({
      label: a,
      data:            _sliceMois(dataParAnnee[a] || Array(10).fill(0), range),
      borderColor:     CFG.yearColors[i % CFG.yearColors.length],
      backgroundColor: CFG.yearColorsBg[i % CFG.yearColorsBg.length],
      tension: 0.35, fill: true, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2
    }));
    _upsert(id, 'line', { labels, datasets }, baseOpts());
  }

  // ─────────────────────────────────────────
  //  BARRES MULTI-ANNÉES (par mois)
  // ─────────────────────────────────────────
  function barParMois(id, dataParAnnee, range, annees, stacked = false) {
    const labels   = _moisLabels(range);
    const datasets = annees.map((a, i) => ({
      label: a,
      data:            _sliceMois(dataParAnnee[a] || Array(10).fill(0), range),
      backgroundColor: CFG.yearColorsBg[i % CFG.yearColorsBg.length],
      borderColor:     CFG.yearColors[i % CFG.yearColors.length],
      borderWidth: 1.5, borderRadius: stacked ? 0 : 4,
      stack: stacked ? 'stack' : undefined
    }));
    const extra = stacked ? { scales: { x: { stacked: true }, y: { stacked: true } } } : {};
    _upsert(id, 'bar', { labels, datasets }, baseOpts(extra));
  }

  // ─────────────────────────────────────────
  //  BARRES MULTI-DATASETS LIBRES (par mois)
  //  datasetsRaw : [{label, data, color, bg}]
  // ─────────────────────────────────────────
  function barMulti(id, datasetsRaw, range, stacked = false) {
    const labels   = _moisLabels(range);
    const datasets = datasetsRaw.map((d, i) => ({
      label: d.label,
      data:            _sliceMois(d.data, range),
      backgroundColor: d.bg    || CFG.yearColorsBg[i % CFG.yearColorsBg.length],
      borderColor:     d.color || CFG.yearColors[i % CFG.yearColors.length],
      borderWidth: 1.5, borderRadius: stacked ? 0 : 4,
      stack: stacked ? 'stack' : undefined
    }));
    const extra = stacked ? { scales: { x: { stacked: true }, y: { stacked: true } } } : {};
    _upsert(id, 'bar', { labels, datasets }, baseOpts(extra));
  }

  // ─────────────────────────────────────────
  //  BARRES PAR NIVEAU
  // ─────────────────────────────────────────
  function barParNiveau(id, dataParNiveau) {
    const labels = CFG.niveaux;
    const values = labels.map(n => dataParNiveau[n] || 0);
    const datasets = [{
      label: 'Total',
      data:            values,
      backgroundColor: CFG.niveauColors,
      borderColor:     CFG.niveauColors.map(c => c.replace('.75)', '1)')),
      borderWidth: 1.5, borderRadius: 5
    }];
    const opts = baseOpts({ plugins: { ...baseOpts().plugins, legend: { display: false } } });
    _upsert(id, 'bar', { labels, datasets }, opts);
  }

  // ─────────────────────────────────────────
  //  BARRES PAR CATÉGORIE MOTIF (multi-années)
  // ─────────────────────────────────────────
  function barParCategorie(id, dataParAnnee, annees) {
    const labels   = CFG.categoriesShort;
    const datasets = annees.map((a, i) => ({
      label: a,
      data:            CFG.categories.map(c => (dataParAnnee[a] || {})[c] || 0),
      backgroundColor: CFG.yearColorsBg[i % CFG.yearColorsBg.length],
      borderColor:     CFG.yearColors[i % CFG.yearColors.length],
      borderWidth: 1.5, borderRadius: 3
    }));
    const opts = baseOpts({ indexAxis: 'y' });
    _upsert(id, 'bar', { labels, datasets }, opts);
  }

  // ─────────────────────────────────────────
  //  DONUT PAR CATÉGORIE MOTIF
  // ─────────────────────────────────────────
  function doughnutParCategorie(id, dataParCategorie) {
    const values = CFG.categories.map(c => (dataParCategorie || {})[c] || 0);
    if (!values.some(v => v > 0)) { _empty(id); return; }
    const colors = ['#06b6d4','#a855f7','#ec4899','#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6','#f97316','#6366f1'];
    const dark   = isDark();
    _upsert(id, 'doughnut', {
      labels: CFG.categoriesShort,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }]
    }, {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: dark ? '#8b97ad' : '#4a5568', font: { family: 'Outfit', size: 10 }, boxWidth: 10, padding: 7 } },
        tooltip: baseOpts().plugins.tooltip
      }
    });
  }

  // ─────────────────────────────────────────
  //  ABSENCES J vs NJ (barres empilées)
  // ─────────────────────────────────────────
  function barAbsJNJ(id, absJ, absNJ, range, annee) {
    const labels = _moisLabels(range);
    _upsert(id, 'bar', {
      labels,
      datasets: [
        { label: 'Justifiées',      data: _sliceMois(absJ[annee]  || Array(10).fill(0), range), backgroundColor: 'rgba(16,185,129,.5)', borderColor: '#10b981', borderWidth: 1.5, borderRadius: 4 },
        { label: 'Non justifiées',  data: _sliceMois(absNJ[annee] || Array(10).fill(0), range), backgroundColor: 'rgba(239,68,68,.5)',  borderColor: '#ef4444', borderWidth: 1.5, borderRadius: 4 }
      ]
    }, baseOpts({ scales: { x: { stacked: true }, y: { stacked: true } } }));
  }

  // ─────────────────────────────────────────
  //  UTILITAIRES
  // ─────────────────────────────────────────
  function destroyAll() {
    Object.keys(_inst).forEach(k => { try { _inst[k].destroy(); } catch (e) {} delete _inst[k]; });
  }

  function empty(id) { _empty(id); }

  return {
    isDark,
    lineParMois, barParMois, barMulti,
    barParNiveau, barParCategorie, doughnutParCategorie, barAbsJNJ,
    destroyAll, empty
  };
})();
