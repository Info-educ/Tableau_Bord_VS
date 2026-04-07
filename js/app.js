// ═══════════════════════════════════════════════════════════
//  app.js — Logique principale V12
//  Dépend de : config.js, mapping_data.js, mapping.js,
//              parser.js, store.js, charts.js
//  Corrections V12 :
//    - isDark() n'est plus redéclarée ici → Charts.isDark()
//    - Charts.destroyAll() n'est plus réassigné
//    - Un seul #screen-dashboard dans le HTML (bug B1)
// ═══════════════════════════════════════════════════════════

// ── Initialisation du mapping au démarrage
(function initMapping() {
  if (!Mapping.loadFromStorage()) {
    Mapping.load(MAPPING_DEFAULT_DATA);
  }
  // Restaurer thème préféré
  const saved = (() => { try { return localStorage.getItem('tdb-theme'); } catch(e) { return null; } })();
  if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

// ══════════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════════
function showUpload() {
  document.getElementById('screen-upload').style.display    = 'flex';
  document.getElementById('screen-dashboard').style.display = 'none';
}

function showDashboard() {
  document.getElementById('screen-upload').style.display    = 'none';
  document.getElementById('screen-dashboard').style.display = 'block';
}

function toggleTheme() {
  const cur  = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('tdb-theme', next); } catch(e) {}
  if (document.getElementById('screen-dashboard').style.display !== 'none') {
    Charts.destroyAll();
    renderAll();
  }
}

document.getElementById('btn-theme-upload').onclick = toggleTheme;
document.getElementById('btn-theme')        && (document.getElementById('btn-theme').onclick = toggleTheme);

// ── Lien Manuel d'utilisation
(function initReadmeLink() {
  const a = document.getElementById('link-readme');
  if (!a) return;
  if (CFG.readmeUrl && !CFG.readmeUrl.includes('VOTRE-COMPTE')) {
    a.href = CFG.readmeUrl;
  } else {
    // URL non configurée : masquer le lien discrètement
    a.closest('.upload-manual-link').style.display = 'none';
  }
})();

// ══════════════════════════════════════════════════════════
//  UPLOAD — gestion des années et des fichiers
// ══════════════════════════════════════════════════════════
const years = new Map();
let unknownCounter = 0;
let _pickerTarget  = null;

const TYPE_ORDER = ['absences','retards','punitions','sanctions','suivi'];
const TYPE_INFO  = {
  absences:  { icon:'🏠', label:'Absences' },
  retards:   { icon:'⏱️', label:'Retards' },
  punitions: { icon:'⚠️', label:'Punitions' },
  sanctions: { icon:'⚖️', label:'Sanctions' },
  suivi:     { icon:'📋', label:'Suivi (XLSX)' }
};

// extractAnneeFromCSV : délégué à Parser.detectAnnee + logique interne de parseCSVFile
// (suppression du doublon — la détection d'année CSV est gérée dans parser.js)

function readOneFile(file) {
  return new Promise(resolve => {
    const isXLSX = /\.(xlsx|xlsm)$/i.test(file.name);
    const reader  = new FileReader();
    if (isXLSX) {
      reader.onload = ev => {
        try {
          const wb   = XLSX.read(ev.target.result, { type: 'array' });
          const type = Parser.isSuiviXLSX(wb.SheetNames) ? 'suivi' : null;
          resolve({ name: file.name, type, annee: Parser.detectAnnee(file.name), buffer: ev.target.result, isXLSX: true });
        } catch(e) {
          resolve({ name: file.name, type: null, annee: null, error: e.message });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = ev => {
        const text  = ev.target.result;
        const type  = Parser.autoDetectCSV(file.name, text);
        // Détection d'année : nom de fichier d'abord, puis première date valide dans le CSV
        const annee = Parser.detectAnnee(file.name) || (() => {
          const lines = text.split(/\r?\n/).slice(1, 15);
          for (const line of lines) {
            const re = /(\d{2})\/(\d{2})\/(\d{4})/g;
            let m;
            while ((m = re.exec(line)) !== null) {
              const yr  = parseInt(m[3]);
              const mo  = parseInt(m[2]) - 1;
              if (yr >= 2020) return mo >= 8 ? `${yr}-${yr+1}` : `${yr-1}-${yr}`;
            }
          }
          return null;
        })();
        resolve({ name: file.name, type, annee, text, isXLSX: false });
      };
      reader.readAsText(file, 'windows-1252');
    }
  });
}

async function addFilesToYear(anneeKey, fileList) {
  const results = await Promise.all(Array.from(fileList).map(readOneFile));
  for (const r of results) {
    if (!r.type) { showErr(`Fichier non reconnu : "${r.name}"`); continue; }
    if (!years.has(anneeKey)) years.set(anneeKey, { label: anneeKey, files: new Map() });
    years.get(anneeKey).files.set(r.type, { name: r.name, text: r.text, buffer: r.buffer });
  }
  renderUpload();
}

async function addFilesAutoYear(fileList) {
  const results = await Promise.all(Array.from(fileList).map(readOneFile));
  for (const r of results) {
    if (!r.type) { showErr(`Fichier non reconnu : "${r.name}"`); continue; }
    let key = r.annee;
    if (!key) { key = `unknown-${++unknownCounter}`; }
    if (!years.has(key)) years.set(key, { label: key.startsWith('unknown') ? '? Année inconnue' : key, files: new Map() });
    years.get(key).files.set(r.type, { name: r.name, text: r.text, buffer: r.buffer });
  }
  renderUpload();
}

function showErr(msg) {
  const box = document.getElementById('parse-errors');
  box.style.display = 'block';
  box.innerHTML += `<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:10px 14px;font-size:12px;color:#ef4444;margin-top:6px">${msg}</div>`;
}

function pickFiles() {
  document.getElementById('file-picker').click();
}

function renderUpload() {
  const container = document.getElementById('years-row');
  container.innerHTML = '';
  const sorted = [...years.keys()].sort((a, b) =>
    a.startsWith('unknown') ? 1 : b.startsWith('unknown') ? -1 : a.localeCompare(b)
  );
  for (const key of sorted) container.appendChild(makeYearCard(key));

  const addBtn = document.createElement('div');
  addBtn.className = 'year-card-add';
  addBtn.innerHTML = '<div class="year-card-add-icon">＋</div><div class="year-card-add-label">Ajouter une année</div>';
  addBtn.onclick = () => { _pickerTarget = null; pickFiles(); };
  container.appendChild(addBtn);

  document.getElementById('btn-clear').style.display = years.size > 0 ? '' : 'none';
  updateSummary();
  document.getElementById('btn-go').disabled = ![...years.values()].some(y => y.files.size > 0);
}

function makeYearCard(anneeKey) {
  const year   = years.get(anneeKey);
  const card   = document.createElement('div');
  card.className = 'year-card' + (year.files.size > 0 ? ' has-files' : '');
  const isUnk  = anneeKey.startsWith('unknown');

  const header  = document.createElement('div'); header.className = 'year-card-header';
  const lbl     = document.createElement('div'); lbl.className = 'year-label' + (isUnk ? ' unknown' : ''); lbl.textContent = year.label;
  const rmBtn   = document.createElement('button'); rmBtn.className = 'year-remove-btn'; rmBtn.title = 'Supprimer'; rmBtn.textContent = '✕';
  rmBtn.onclick = e => { e.stopPropagation(); years.delete(anneeKey); renderUpload(); };
  header.appendChild(lbl); header.appendChild(rmBtn); card.appendChild(header);

  const typesDiv = document.createElement('div'); typesDiv.className = 'year-types';
  for (const type of TYPE_ORDER) {
    const info = TYPE_INFO[type];
    const f    = year.files.get(type);
    const row  = document.createElement('div'); row.className = 'year-type-row' + (f ? ' loaded' : '');
    const dot  = document.createElement('div'); dot.className = 'year-type-dot';
    const name = document.createElement('span'); name.className = 'year-type-name'; name.textContent = info.icon + ' ' + info.label;
    row.appendChild(dot); row.appendChild(name);
    if (f) {
      const fname = document.createElement('span'); fname.className = 'year-type-fname'; fname.title = f.name; fname.textContent = f.name;
      const rm    = document.createElement('button'); rm.className = 'year-type-remove'; rm.textContent = '✕';
      rm.onclick  = e => { e.stopPropagation(); year.files.delete(type); renderUpload(); };
      row.appendChild(fname); row.appendChild(rm);
    }
    typesDiv.appendChild(row);
  }
  card.appendChild(typesDiv);

  const hint = document.createElement('div'); hint.className = 'year-drop-hint'; hint.textContent = '📂 Déposer des fichiers ici';
  hint.onclick = e => {
    e.stopPropagation();
    _pickerTarget = anneeKey;  // clé capturée dans la closure au moment de la création
    pickFiles();
  };
  card.appendChild(hint);

  card.addEventListener('dragover',  e => { e.preventDefault(); card.classList.add('drop-active'); });
  card.addEventListener('dragleave', e => { if (!card.contains(e.relatedTarget)) card.classList.remove('drop-active'); });
  card.addEventListener('drop',      e => { e.preventDefault(); card.classList.remove('drop-active'); addFilesToYear(anneeKey, e.dataTransfer.files); });

  return card;
}

function updateSummary() {
  const el = document.getElementById('load-summary');
  let total = 0;
  years.forEach(y => { total += y.files.size; });
  if (total > 0) { el.textContent = `${total} fichier(s) chargé(s) — ${years.size} année(s)`; el.style.display = ''; }
  else { el.style.display = 'none'; }
}

// ── File picker
document.getElementById('file-picker').onchange = e => {
  const target = _pickerTarget;
  _pickerTarget = null;  // reset immédiat avant tout traitement async
  if (target && years.has(target)) addFilesToYear(target, e.target.files);
  else                              addFilesAutoYear(e.target.files);
  e.target.value = '';
};

// ── Drag & drop global (hors cartes)
document.body.addEventListener('dragover',  e => e.preventDefault());
document.body.addEventListener('drop',      e => { e.preventDefault(); if (!e.target.closest('.year-card')) addFilesAutoYear(e.dataTransfer.files); });

document.getElementById('btn-clear').onclick = () => { years.clear(); unknownCounter = 0; renderUpload(); };

// ── Analyser les données
document.getElementById('btn-go').onclick = async () => {
  Store.reset();
  const errors = [];
  const btn    = document.getElementById('btn-go');
  btn.disabled = true; btn.textContent = 'Chargement…';
  document.getElementById('parse-errors').style.display = 'none';
  document.getElementById('parse-errors').innerHTML     = '';

  for (const [, year] of years) {
    for (const [type, f] of year.files) {
      try {
        if (type === 'suivi') {
          const res = Parser.parseXLSXSuivi(f.name, f.buffer);
          for (const r of res.results) { if (r.records.length) Store.addRecords(r.type, r.records); }
          errors.push(...res.errors);
        } else {
          const res = Parser.parseCSVFile(f.name, f.text);
          if (res.error) { errors.push(res.error); continue; }
          if (res.records.length) Store.addRecords(res.type, res.records);
          else errors.push(`Aucune ligne valide dans "${f.name}"`);
        }
      } catch(e) { errors.push(`Erreur sur "${f.name}" : ${e.message}`); }
    }
  }

  const total = Object.values(Store.getCounts()).reduce((s, v) => s + v, 0);
  if (total === 0) {
    const box = document.getElementById('parse-errors');
    box.style.display = 'block';
    box.innerHTML = `<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:14px;font-size:13px;color:#ef4444">
      <strong>⚠️ Aucune donnée chargée.</strong><br><br>
      ${errors.length ? '<ul style="margin-top:6px;padding-left:18px">' + errors.map(e => `<li>${e}</li>`).join('') + '</ul>' : 'Vérifiez que les fichiers sont des exports Pronote valides (CSV séparateur ;).'}
    </div>`;
    btn.disabled = false; btn.textContent = 'Analyser les données →';
    return;
  }
  if (errors.length) {
    const box = document.getElementById('parse-errors');
    box.style.display = 'block';
    box.innerHTML = `<div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:8px;padding:12px 14px;font-size:12px;color:#f59e0b">
      <strong>Avertissements :</strong><ul style="margin-top:6px;padding-left:18px">${errors.map(e => `<li>${e}</li>`).join('')}</ul>
    </div>`;
  }

  showDashboard();
  initDashboard();
};

// ══════════════════════════════════════════════════════════
//  DASHBOARD — état
// ══════════════════════════════════════════════════════════
let mR         = [0, 9];
let activeTab  = 't-synthese';
let decMoisActif = -1;
let _dashReady   = false;

// ══════════════════════════════════════════════════════════
//  DASHBOARD — initialisation (une seule fois)
// ══════════════════════════════════════════════════════════
function initDashboard() {
  mR = [0, 9]; activeTab = 't-synthese'; decMoisActif = -1;

  if (!_dashReady) {
    _dashReady = true;

    // Onglets
    document.querySelectorAll('.navtab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.navtab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
        tab.classList.add('active');
        activeTab = tab.dataset.tab;
        document.getElementById(activeTab).style.display = 'flex';
        renderTab(activeTab);
      };
    });

    // Filtres niveaux
    document.querySelectorAll('#lf input').forEach(inp => {
      inp.onchange = () => {
        document.getElementById('cf').value = ''; // remet "Toutes les classes"
        applyFiltres(); Charts.destroyAll(); renderAll();
      };
    });

    // Filtre classe
    document.getElementById('cf').onchange = () => { applyFiltres(); Charts.destroyAll(); renderAll(); };

    // Shortcuts période
    document.querySelectorAll('.ms').forEach(el => {
      el.onclick = () => {
        const [a, b] = el.dataset.r.split(',').map(Number);
        mR = [a, b]; updateMoisUI(); applyFiltres(); Charts.destroyAll(); renderAll();
      };
    });

    // ── Mapping reset
    document.getElementById('btn-mapping-reset').onclick = () => {
      if (!confirm('Réinitialiser le mapping motifs par défaut ?\nToutes vos modifications seront perdues.')) return;
      try { localStorage.removeItem('tdb-mapping'); } catch(e) {}
      Mapping.load(MAPPING_DEFAULT_DATA);
      renderMapping();
      showToast('Mapping réinitialisé');
    };

    // ── Mapping export JSON
    document.getElementById('btn-mapping-export-json').onclick = () => {
      const data    = JSON.stringify({ mapping: Mapping.getAll() }, null, 2);
      const blob    = new Blob([data], { type: 'application/json' });
      const url     = URL.createObjectURL(blob);
      const a       = document.createElement('a');
      const ts      = new Date().toISOString().slice(0, 10);
      a.href        = url;
      a.download    = `tdb_mapping_${ts}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Mapping exporté en JSON');
    };

    // ── Mapping import JSON
    document.getElementById('btn-mapping-import-json').onclick = () => {
      document.getElementById('mapping-file-input').click();
    };
    document.getElementById('mapping-file-input').onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (!parsed.mapping || typeof parsed.mapping !== 'object') {
            alert('Fichier JSON invalide : la clé "mapping" est absente ou incorrecte.');
            return;
          }
          const count = Object.keys(parsed.mapping).length;
          if (!confirm(`Importer ${count} entrée(s) depuis "${file.name}" ?\nCela remplacera le mapping actuel.`)) return;
          Mapping.load(parsed);
          Mapping.saveToStorage();
          renderMapping();
          showToast(`${count} motifs importés depuis ${file.name}`);
        } catch(err) {
          alert(`Erreur de lecture JSON : ${err.message}`);
        }
      };
      reader.readAsText(file, 'UTF-8');
      e.target.value = '';
    };

    // ── Génération du code mapping_data.js
    document.getElementById('btn-mapping-copy-code').onclick = () => {
      const table   = Mapping.getAll();
      const entries = Object.entries(table).sort((a, b) => {
        // Trier par catégorie d'abord, puis par motif
        const catA = CFG.categories.indexOf(a[1]);
        const catB = CFG.categories.indexOf(b[1]);
        if (catA !== catB) return catA - catB;
        return a[0].localeCompare(b[0]);
      });

      // Calcul du padding pour aligner les ":" sur les valeurs
      const maxLen = Math.max(...entries.map(([k]) => k.length), 0);

      // Grouper par catégorie pour les commentaires de section
      let code = '// ═══════════════════════════════════════════════════════════\n';
      code    += '//  mapping_data.js — Table de correspondance motifs Pronote\n';
      code    += '//  Généré automatiquement depuis le TDB Vie Scolaire\n';
      code    += `//  Date : ${new Date().toLocaleDateString('fr-FR')}\n`;
      code    += '//  Pour appliquer : remplacer intégralement ce fichier,\n';
      code    += '//  puis recharger l\'application dans le navigateur.\n';
      code    += '// ═══════════════════════════════════════════════════════════\n\n';
      code    += 'const MAPPING_DEFAULT_DATA = { mapping: {\n';

      let lastCat = null;
      for (const [motif, cat] of entries) {
        if (cat !== lastCat) {
          if (lastCat !== null) code += '\n';
          code    += `  // ── ${cat}\n`;
          lastCat  = cat;
        }
        // Échapper les guillemets dans les clés/valeurs
        const k = motif.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const v = cat.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const pad = ' '.repeat(Math.max(0, maxLen - motif.length));
        code += `  "${k}"${pad}: "${v}",\n`;
      }

      code += '}};\n';

      document.getElementById('mapping-code-textarea').value = code;
      document.getElementById('mapping-code-preview').style.display = 'block';
      document.getElementById('mapping-code-preview').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    document.getElementById('btn-mapping-copy-close').onclick = () => {
      document.getElementById('mapping-code-preview').style.display = 'none';
    };

    document.getElementById('btn-mapping-copy-clipboard').onclick = () => {
      const ta = document.getElementById('mapping-code-textarea');
      ta.select();
      try {
        navigator.clipboard.writeText(ta.value)
          .then(() => showToast('Code copié dans le presse-papier'))
          .catch(() => { document.execCommand('copy'); showToast('Code copié'); });
      } catch(e) { document.execCommand('copy'); showToast('Code copié'); }
    };

    document.getElementById('btn-mapping-download-js').onclick = () => {
      const code = document.getElementById('mapping-code-textarea').value;
      const blob = new Blob([code], { type: 'text/javascript' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'mapping_data.js';
      a.click();
      URL.revokeObjectURL(url);
      showToast('mapping_data.js téléchargé');
    };
  }

  // Reset UI onglets
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.navtab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="t-synthese"]').classList.add('active');
  document.getElementById('t-synthese').style.display = 'flex';

  buildYF(); buildCF(); buildMP(); applyFiltres(); Charts.destroyAll(); renderAll();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ══════════════════════════════════════════════════════════
//  FILTRES
// ══════════════════════════════════════════════════════════
function buildYF() {
  const d = document.getElementById('yf'); d.innerHTML = '';
  Store.getAnnees().forEach((a, i) => {
    const l = document.createElement('label');
    l.innerHTML = `<span class="ydot" style="background:${CFG.yearColors[i]}"></span><input type="checkbox" value="${a}" checked> ${a}`;
    l.querySelector('input').onchange = () => { applyFiltres(); Charts.destroyAll(); renderAll(); };
    d.appendChild(l);
  });
}

function getSelAnnees() { return [...document.querySelectorAll('#yf input:checked')].map(e => e.value); }
function getSelNiveau() { const v = document.querySelector('#lf input:checked')?.value; return v === 'all' ? [] : (v ? [v] : []); }

function buildCF() {
  const sel = document.getElementById('cf');
  sel.innerHTML = '<option value="">Toutes les classes</option>';
  Store.getAllClasses().forEach(c => {
    const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o);
  });
}

function buildMP() {
  const d = document.getElementById('mpills'); d.innerHTML = '';
  let picking = false, pickStart = -1;
  CFG.mois.forEach((m, i) => {
    const el = document.createElement('div');
    el.className = 'mp' + (i >= mR[0] && i <= mR[1] ? (i === mR[0] || i === mR[1] ? ' active' : ' in-range') : '');
    el.dataset.i = i; el.textContent = m;
    el.onclick = () => {
      if (!picking) { picking = true; pickStart = i; mR = [i, i]; }
      else          { picking = false; mR = [Math.min(pickStart, i), Math.max(pickStart, i)]; }
      updateMoisUI(); applyFiltres(); Charts.destroyAll(); renderAll();
    };
    d.appendChild(el);
  });
}

function updateMoisUI() {
  document.querySelectorAll('.mp').forEach(el => {
    const i = parseInt(el.dataset.i);
    el.className = 'mp' + (i >= mR[0] && i <= mR[1] ? (i === mR[0] || i === mR[1] ? ' active' : ' in-range') : '');
  });
}

function applyFiltres() {
  Store.setFiltreAnnees(getSelAnnees());
  Store.setFiltreNiveaux(getSelNiveau());
  Store.setFiltreClasses(document.getElementById('cf').value ? [document.getElementById('cf').value] : []);
  Store.setFiltreMois(mR[0], mR[1]);
}

// ══════════════════════════════════════════════════════════
//  DISPATCH ONGLETS
// ══════════════════════════════════════════════════════════
function renderAll()   { renderTab(activeTab); }
function renderTab(tab) {
  applyFiltres();
  const annees = Store.getFiltres().annees;
  const dern   = annees[annees.length - 1] || Store.getAnnees().slice(-1)[0] || '';
  switch (tab) {
    case 't-synthese':  renderSynthese(annees, dern);  break;
    case 't-absences':  renderAbsences(annees, dern);  break;
    case 't-retards':   renderRetards(annees, dern);   break;
    case 't-punitions': renderPunitions(annees, dern); break;
    case 't-sanctions': renderSanctions(annees, dern); break;
    case 't-suivi':     renderSuivi(annees, dern);     break;
    case 't-classes':   renderClasses();               break;
    case 't-eleves':    renderElevesContent(); break;
    case 't-motifs':    renderMapping();               break;
  }
}

// ══════════════════════════════════════════════════════════
//  KPI BAR TOOLTIP
// ══════════════════════════════════════════════════════════
(function initKpiTooltip() {
  const el = document.createElement('div');
  el.id = 'kpi-bar-tooltip';
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = [
    'position:fixed',
    'z-index:9999',
    'pointer-events:none',
    'opacity:0',
    'transition:opacity .15s ease',
    'background:var(--bg2, #1e2130)',
    'border:1px solid var(--border, rgba(255,255,255,.12))',
    'border-radius:8px',
    'padding:7px 12px 8px',
    'box-shadow:0 4px 18px rgba(0,0,0,.45)',
    'min-width:110px',
    'text-align:center',
    'white-space:nowrap',
  ].join(';');
  el.innerHTML = `
    <div id="kpi-tt-annee" style="font-size:.72rem;font-weight:700;letter-spacing:.06em;margin-bottom:2px"></div>
    <div id="kpi-tt-label" style="font-size:.68rem;color:var(--text2,#94a3b8);margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em"></div>
    <div id="kpi-tt-valeur" style="font-size:1.35rem;font-weight:800;letter-spacing:-.01em;line-height:1"></div>
  `;
  // FIX B8 : un seul chemin d'ajout, sans risque de doublon
  if (document.readyState !== 'loading') {
    document.body.appendChild(el);
  } else {
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(el));
  }
})();

function kpiBarTooltipShow(e, bar) {
  const tt     = document.getElementById('kpi-bar-tooltip');
  if (!tt) return;
  const annee  = bar.dataset.annee  || '';
  const label  = bar.dataset.label  || '';
  const valeur = bar.dataset.valeur || '—';
  const color  = bar.dataset.color  || '#fff';

  document.getElementById('kpi-tt-annee').textContent  = annee;
  document.getElementById('kpi-tt-annee').style.color  = color;
  document.getElementById('kpi-tt-label').textContent  = label;
  document.getElementById('kpi-tt-valeur').textContent = valeur;
  document.getElementById('kpi-tt-valeur').style.color = color;

  tt.style.opacity = '0';
  tt.style.display = 'block';

  const rect   = bar.getBoundingClientRect();
  const ttW    = tt.offsetWidth;
  const ttH    = tt.offsetHeight;
  const GAP    = 8; // px entre la barre et le tooltip

  let left = rect.left + rect.width / 2 - ttW / 2;
  let top  = rect.top - ttH - GAP;

  // Garde dans la fenêtre
  if (left < 6) left = 6;
  if (left + ttW > window.innerWidth - 6) left = window.innerWidth - ttW - 6;
  if (top < 6) top = rect.bottom + GAP; // bascule en dessous si trop haut

  tt.style.left    = left + 'px';
  tt.style.top     = top  + 'px';
  tt.style.opacity = '1';
}

function kpiBarTooltipHide() {
  const tt = document.getElementById('kpi-bar-tooltip');
  if (tt) { tt.style.opacity = '0'; tt.style.display = 'none'; }
}

// ══════════════════════════════════════════════════════════
//  KPI BUILDER
// ══════════════════════════════════════════════════════════
function buildKPIs(containerId, items, annees) {
  const dern = annees[annees.length - 1];
  const prev = annees[annees.length - 2];
  const kd   = dern ? Store.kpis(dern) : {};
  const kp   = prev ? Store.kpis(prev) : null;

  function delta(a, b) {
    if (b === null || b === undefined) return '';
    if (b === 0 && a === 0) return '';
    if (b === 0 && a > 0) return `<span class="kpi-delta up" title="Pas de donnée l'année précédente">Nouveau</span>`;
    const pct = Math.round((a - b) / b * 100);
    const cls = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
    return `<span class="kpi-delta ${cls}">${pct > 0 ? '+' : ''}${pct}%</span>`;
  }
  function bars(key, label) {
    const vals = annees.map((a, i) => ({ v: Store.kpis(a)[key] || 0, color: CFG.yearColors[i], annee: a }));
    const max  = Math.max(...vals.map(x => x.v), 1);
    return vals.map(x => {
      const valFmt = (typeof x.v === 'number' && !Number.isInteger(x.v))
        ? x.v.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : Math.round(x.v).toLocaleString('fr-FR');
      return `<div class="kpi-bar"
        style="height:${Math.round(x.v / max * 20)}px;background:${x.color}"
        data-annee="${x.annee}"
        data-label="${label}"
        data-valeur="${valFmt}"
        data-color="${x.color}"
        onmouseenter="kpiBarTooltipShow(event, this)"
        onmouseleave="kpiBarTooltipHide()"
      ></div>`;
    }).join('');
  }

  const multiAnnees = annees.length > 1;

  document.getElementById(containerId).innerHTML = items.map(({ label, key, color }) => {
    const raw  = kd[key];
    const val  = raw !== undefined
      ? (typeof raw === 'number' && !Number.isInteger(raw)
          ? raw.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : Math.round(raw).toLocaleString('fr-FR'))
      : '—';

    // Sous-titre : badge "année la + récente" si multi-années + delta
    const badgeRecent = multiAnnees
      ? `<span class="kpi-badge-recent" title="Valeur affichée = année la plus récente sélectionnée">↑ ${dern}</span>`
      : `<span style="color:var(--text3)">${dern || ''}</span>`;

    // Tooltip sur la valeur
    const tooltip = multiAnnees ? `title="Valeur de l'année ${dern} — la plus récente sélectionnée"` : '';

    return `<div class="kpi anim" ${color ? `style="--kpi-c:${color}"` : ''}>
      <div class="kpi-label">${label}</div>
      <div class="kpi-value" ${tooltip}>${val}</div>
      <div class="kpi-sub">${badgeRecent} ${delta(raw || 0, kp ? kp[key] : null)}</div>
      <div class="kpi-bars">${bars(key, label)}</div>
    </div>`;
  }).join('');
}

// Badge niveau
function nBadge(niv) {
  const n = (niv || '?').charAt(0);
  return `<span class="badge-niv badge-${n}">${niv || '?'}</span>`;
}

// ══════════════════════════════════════════════════════════
//  SYNTHÈSE
// ══════════════════════════════════════════════════════════
function renderSynthese(annees, dern) {
  buildKPIs('kpi-synthese', [
    { label:'Absences (dj)',    key:'absences' },
    { label:'Abs. NJ (dj)',     key:'absNJ' },
    { label:'Retards',          key:'retards' },
    { label:'Punitions',        key:'punitions' },
    { label:'Excl. cours',      key:'exclusions' },
    { label:'Sanctions',        key:'sanctions' },
    { label:'Incidents',        key:'incidents' },
    { label:'CD',               key:'cd' },
    { label:'CE',               key:'ce' },
    { label:'Faits-Étab.',      key:'faits' },
    { label:'Signal. abs.',     key:'signalements' },
    { label:'IP',               key:'ip' }
  ], annees);

  const absD  = Store.absParMoisParAnnee();
  Charts.lineParMois('c-s-abs', absD, mR, annees);

  const punD = Store.countParMoisParAnnee('punitions');
  const sanD = Store.countParMoisParAnnee('sanctions');
  const psaData = {};
  annees.forEach(a => { psaData[a] = (punD[a] || Array(10).fill(0)).map((v, j) => v + ((sanD[a] || [])[j] || 0)); });
  Charts.barParMois('c-s-psa', psaData, mR, annees);

  Charts.lineParMois('c-s-ret', Store.countParMoisParAnnee('retards'), mR, annees);

  // Incidents + CD + CE : multi-années, on prend la première année comme référence de couleur
  // mais on empile toutes les années pour être cohérent avec les autres graphiques de synthèse
  const incD = Store.countParMoisParAnnee('incidents');
  const cdD  = Store.countParMoisParAnnee('cd');
  const ceD  = Store.countParMoisParAnnee('ce');
  // Fusionner incidents + cd + ce en un total suivi par année
  const suiviCombD = {};
  annees.forEach(a => {
    suiviCombD[a] = (incD[a] || Array(10).fill(0)).map((v, j) =>
      v + ((cdD[a] || [])[j] || 0) + ((ceD[a] || [])[j] || 0)
    );
  });
  Charts.barParMois('c-s-inc', suiviCombD, mR, annees);
}

// ══════════════════════════════════════════════════════════
//  ABSENCES
// ══════════════════════════════════════════════════════════
function renderAbsences(annees, dern) {
  buildKPIs('kpi-absences', [
    { label:'Total dj', key:'absences' }, { label:'dj NJ', key:'absNJ' }
  ], annees);

  document.getElementById('seuil-label').textContent = CFG.seuilDecrochage;
  document.getElementById('dec-annee-label').textContent = dern;

  // Décrochage — nombre d'élèves UNIQUES sur toute la période sélectionnée
  const dec = dern ? Store.decrochageParMois(dern) : Array(10).fill(0);
  const decElevesUniques = dern ? (() => {
    const keys = new Set();
    for (let mi = mR[0]; mi <= mR[1]; mi++) {
      Store.decrochageElevesParMois(dern, mi).forEach(e => keys.add(`${e.nom}|${e.prenom}|${e.classe}`));
    }
    return keys.size;
  })() : 0;
  document.getElementById('dec-total').textContent = dern ? decElevesUniques : '—';

  // Pills décrochage par mois
  const decPills = document.getElementById('dec-pills');
  decPills.innerHTML = CFG.mois.map((m, i) => {
    if (i < mR[0] || i > mR[1]) return '';
    const v = dec[i] || 0;
    return `<div class="dec-pill ${v > 0 ? 'has' : ''}" data-mi="${i}" onclick="showDecListe(${i})">${m}<br><strong>${v}</strong></div>`;
  }).join('');

  Charts.barParMois('c-dec-mois', { [dern]: dec }, mR, [dern]);

  const absJ  = Store.absParMoisParAnnee(true);
  const absNJ = Store.absParMoisParAnnee(false);
  Charts.lineParMois('c-abs-total', Store.absParMoisParAnnee(), mR, annees);
  Charts.barAbsJNJ('c-abs-jnj', absJ, absNJ, mR, dern);
  Charts.barParNiveau('c-abs-niv',    Store.absParNiveau(dern));
  Charts.barParNiveau('c-abs-nj-niv', Store.absParNiveau(dern, false));
}

function showDecListe(moisIdx) {
  const annees = Store.getFiltres().annees;
  const dern   = annees[annees.length - 1] || Store.getAnnees().slice(-1)[0] || '';
  document.getElementById('dec-liste-titre').textContent = `Décrochage — ${CFG.mois[moisIdx]}`;
  const eleves = Store.decrochageElevesParMois(dern, moisIdx);
  document.getElementById('dec-liste').innerHTML = eleves.length
    ? eleves.map(e => `<tr><td>${e.nom} ${e.prenom}</td><td>${e.classe}</td><td>${nBadge(e.niveau)}</td><td style="font-weight:700;color:var(--red)">${e.djNJ}</td></tr>`).join('')
    : `<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:12px">Aucun élève pour ce mois</td></tr>`;
}

// ══════════════════════════════════════════════════════════
//  RETARDS
// ══════════════════════════════════════════════════════════
function renderRetards(annees, dern) {
  buildKPIs('kpi-retards', [{ label:'Total retards', key:'retards' }], annees);
  Charts.lineParMois('c-ret-total', Store.countParMoisParAnnee('retards'), mR, annees);
  Charts.barParNiveau('c-ret-niv', Store.countParNiveau('retards', dern));
}

// ══════════════════════════════════════════════════════════
//  PUNITIONS
// ══════════════════════════════════════════════════════════
function renderPunitions(annees, dern) {
  buildKPIs('kpi-punitions', [
    { label:'Total',       key:'punitions' },
    { label:'Excl. cours', key:'exclusions' },
    { label:'Retenues',    key:'retenues' }
  ], annees);

  Charts.barParMois('c-pun-total', Store.countParMoisParAnnee('punitions'), mR, annees);
  Charts.barParNiveau('c-pun-niv', Store.countParNiveau('punitions', dern));

  Charts.barParMois('c-pun-excl', Store.punitionsParTypeMois('exclusion'), mR, annees);
  Charts.barParMois('c-pun-ret',  Store.punitionsParTypeMois('retenue'),   mR, annees);
  Charts.barParMois('c-pun-dev',  Store.punitionsParTypeMois('devoir'),    mR, annees);
  Charts.barParNiveau('c-pun-type-niv', Store.punitionsParTypeNiveau('exclusion', dern));

  const catData = {};
  annees.forEach(a => { catData[a] = Store.countParCategorie('punitions', a); });
  Charts.barParCategorie('c-pun-cat', catData, annees);
  Charts.doughnutParCategorie('c-pun-donut', Store.countParCategorie('punitions', dern));
}

// ══════════════════════════════════════════════════════════
//  SANCTIONS
// ══════════════════════════════════════════════════════════
function renderSanctions(annees, dern) {
  buildKPIs('kpi-sanctions', [{ label:'Total', key:'sanctions' }], annees);
  Charts.barParMois('c-san-total', Store.countParMoisParAnnee('sanctions'), mR, annees);
  Charts.barParNiveau('c-san-niv', Store.countParNiveau('sanctions', dern));

  const catData = {};
  annees.forEach(a => { catData[a] = Store.countParCategorie('sanctions', a); });
  Charts.barParCategorie('c-san-cat', catData, annees);
  Charts.doughnutParCategorie('c-san-donut', Store.countParCategorie('sanctions', dern));
}

// ══════════════════════════════════════════════════════════
//  INCIDENTS & SUIVI
// ══════════════════════════════════════════════════════════
function renderSuivi(annees, dern) {
  // KPIs suivi
  const kd = dern ? Store.kpis(dern) : {};
  const suiviItems = ['incidents','cd','ce','faits','signalements','ip'];
  document.getElementById('suivi-kpis').innerHTML = suiviItems.map(k => `
    <div class="suivi-kpi" style="border-left:3px solid ${CFG.suiviColors[k]}">
      <div class="suivi-kpi-icon">${CFG.suiviIcons[k]}</div>
      <div class="suivi-kpi-val">${kd[k] !== undefined ? kd[k] : '—'}</div>
      <div class="suivi-kpi-label">${CFG.suiviLabels[k]}</div>
    </div>`).join('');

  Charts.barParMois('c-inc-mois', Store.countParMoisParAnnee('incidents'), mR, annees);

  Charts.barMulti('c-suivi-mois', [
    { label:'CD',    data: (Store.countParMoisParAnnee('cd')[dern]    || Array(10).fill(0)), color: CFG.suiviColors.cd,    bg: CFG.suiviColors.cd + '40' },
    { label:'CE',    data: (Store.countParMoisParAnnee('ce')[dern]    || Array(10).fill(0)), color: CFG.suiviColors.ce,    bg: CFG.suiviColors.ce + '40' },
    { label:'Faits', data: (Store.countParMoisParAnnee('faits')[dern] || Array(10).fill(0)), color: CFG.suiviColors.faits, bg: CFG.suiviColors.faits + '40' }
  ], mR);

  Charts.barParNiveau('c-inc-niv', Store.countParNiveau('incidents', dern));

  Charts.barMulti('c-signal-mois', [
    { label:'Signalements', data: (Store.countParMoisParAnnee('signalements')[dern] || Array(10).fill(0)), color: CFG.suiviColors.signalements, bg: CFG.suiviColors.signalements + '40' },
    { label:'IP',           data: (Store.countParMoisParAnnee('ip')[dern]           || Array(10).fill(0)), color: CFG.suiviColors.ip,           bg: CFG.suiviColors.ip + '40' }
  ], mR);

  // Sélecteurs tableau chronologique
  const annSel = document.getElementById('suivi-annee-sel');
  // FIX B7 : toujours reconstruire les options (cas de rechargement de session)
  annSel.innerHTML = '';
  Store.getAnnees().forEach(a => { const o = document.createElement('option'); o.value = a; o.textContent = a; annSel.appendChild(o); });
  annSel.value    = dern;
  annSel.onchange = renderSuiviTable;
  document.getElementById('suivi-type-sel').onchange = renderSuiviTable;
  renderSuiviTable();
}

function renderSuiviTable() {
  const annee  = document.getElementById('suivi-annee-sel').value;
  const filtre = document.getElementById('suivi-type-sel').value;
  document.getElementById('suivi-annee-label').textContent = annee;
  const types  = filtre ? [filtre] : ['incidents','cd','ce','faits','signalements','ip'];
  const rows   = [];
  for (const t of types) {
    for (const r of Store.getRaw(t)) {
      if (r.annee !== annee) continue;
      rows.push({ ...r, stype: t });
    }
  }
  rows.sort((a, b) => a.moisIdx - b.moisIdx);
  document.getElementById('tbody-suivi').innerHTML = rows.length
    ? rows.map(r => {
        const motif = (r.motifs || [r.motif || '']).join(', ');
        const badge = `<span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:4px;background:${CFG.suiviColors[r.stype]}22;color:${CFG.suiviColors[r.stype]}">${CFG.suiviIcons[r.stype]} ${CFG.suiviLabels[r.stype]}</span>`;
        // Élève : nom + prénom si disponibles (incidents), sinon tiret
        const eleve = (r.nom && r.nom !== '—')
          ? `<span style="font-weight:500">${r.nom}</span>${r.prenom ? ' ' + r.prenom : ''}`
          : '<span style="color:var(--text3)">—</span>';
        return `<tr>
          <td>${CFG.mois[r.moisIdx] || '?'}</td>
          <td>${badge}</td>
          <td class="left">${eleve}</td>
          <td class="left" title="${motif}">${motif.length > 50 ? motif.slice(0, 47) + '…' : motif || '—'}</td>
          <td>${r.classe && r.classe !== '?' ? r.classe : '<span style="color:var(--text3)">—</span>'}</td>
          <td>${nBadge(r.niveau)}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:20px">Aucune donnée pour cette sélection</td></tr>`;
}

// ══════════════════════════════════════════════════════════
//  CLASSES
// ══════════════════════════════════════════════════════════

// État de tri persistant pour l'onglet Classes
let _classeSort = { key: 'total', asc: false };

// Colonnes triables : { clé dans data, label th }
const CLASSE_COLS = [
  { key: 'classe',     label: 'Classe',      align: 'left' },
  { key: 'niveau',     label: 'Niv.',        align: 'center' },
  { key: 'absences',   label: 'Abs.(dj)',    align: 'center' },
  { key: 'retards',    label: 'Retards',     align: 'center' },
  { key: 'punitions',  label: 'Punitions',   align: 'center' },
  { key: 'exclusions', label: 'dont Excl.',  align: 'center' },
  { key: 'sanctions',  label: 'Sanctions',   align: 'center' },
  { key: 'incidents',  label: 'Incidents',   align: 'center' },
  { key: 'total',      label: 'Total',       align: 'center' },
];

function renderClasses() {
  const annees = Store.getAnnees();
  const sel    = document.getElementById('classes-annee-sel');
  // Mémoriser la valeur AVANT de reconstruire les options pour ne pas l'écraser
  const prevVal = sel.value;
  sel.innerHTML = '';
  annees.forEach(a => { const o = document.createElement('option'); o.value = a; o.textContent = a; sel.appendChild(o); });
  // Restaurer la sélection précédente si elle existe, sinon dernière année
  sel.value = (prevVal && annees.includes(prevVal)) ? prevVal : (annees[annees.length - 1] || '');
  sel.onchange = renderClasses;
  const annee = sel.value || annees[annees.length - 1];
  let data = Store.resumeParClasse(annee);

  // Tri
  data = [...data].sort((a, b) => {
    const va = a[_classeSort.key] ?? 0;
    const vb = b[_classeSort.key] ?? 0;
    const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
    return _classeSort.asc ? cmp : -cmp;
  });

  function hc(v, max) {
    const r = max > 0 ? v / max : 0;
    if (r === 0) return 'h0'; if (r < .15) return 'h1'; if (r < .35) return 'h2';
    if (r < .6)  return 'h3'; if (r < .8)  return 'h4'; return 'h5';
  }
  const maxA = Math.max(...data.map(d => d.absences),  1);
  const maxR = Math.max(...data.map(d => d.retards),   1);
  const maxP = Math.max(...data.map(d => d.punitions), 1);
  const maxS = Math.max(...data.map(d => d.sanctions), 1);
  const maxI = Math.max(...data.map(d => d.incidents), 1);
  // En-têtes avec indicateur de tri
  const thead = document.querySelector('#tbody-classes').closest('table').querySelector('thead tr');
  thead.innerHTML = '<th style="text-align:center">#</th>' + CLASSE_COLS.map(col => {
    const active = _classeSort.key === col.key;
    const arrow  = active ? (_classeSort.asc ? ' ↑' : ' ↓') : ' ⇅';
    const style  = `text-align:${col.align};cursor:pointer;user-select:none${active ? ';color:var(--accent)' : ''}`;
    return `<th style="${style}" data-sort="${col.key}">${col.label}<span style="opacity:${active ? 1 : 0.3};font-size:9px">${arrow}</span></th>`;
  }).join('');

  // Listeners sur les th
  thead.querySelectorAll('th[data-sort]').forEach(th => {
    th.onclick = () => {
      const k = th.dataset.sort;
      if (_classeSort.key === k) _classeSort.asc = !_classeSort.asc;
      else { _classeSort.key = k; _classeSort.asc = true; }
      renderClasses();
    };
  });

  document.getElementById('tbody-classes').innerHTML = data.map((d, i) => {
    const maxMap = { absences: maxA, retards: maxR, punitions: maxP, exclusions: maxP, sanctions: maxS, incidents: maxI };
    const cells = CLASSE_COLS.map(col => {
      const v   = d[col.key] ?? '';
      const mx  = maxMap[col.key];
      const cls = mx !== undefined ? hc(v, mx) : '';
      const red = col.key === 'exclusions' && v > 3 ? 'color:var(--red);' : '';
      if (col.key === 'classe')  return `<td style="text-align:left">${v}</td>`;
      if (col.key === 'niveau')  return `<td style="text-align:center">${nBadge(v)}</td>`;
      if (col.key === 'total')   return `<td style="font-weight:700;text-align:center">${v}</td>`;
      return `<td class="${cls}" style="${red}text-align:center">${v}</td>`;
    }).join('');
    return `<tr><td style="text-align:center">${i + 1}</td>${cells}</tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════
//  ONGLET ÉLÈVES
// ══════════════════════════════════════════════════════════
// État de tri persistant pour l'onglet Élèves
let _eleveSort = { key: 'total', asc: false };

const ELEVE_COLS = [
  { key: 'nom',        label: 'Élève',       align: 'left'   },
  { key: 'classe',     label: 'Classe',      align: 'center' },
  { key: 'niveau',     label: 'Niv.',        align: 'center' },
  { key: 'absences',   label: 'Abs.(dj)',    align: 'center' },
  { key: 'retards',    label: 'Retards',     align: 'center' },
  { key: 'punitions',  label: 'Punitions',   align: 'center' },
  { key: 'exclusions', label: 'Excl.cours',  align: 'center' },
  { key: 'sanctions',  label: 'Sanctions',   align: 'center' },
  { key: 'incidents',  label: 'Incidents',   align: 'center' },
  { key: 'total',      label: 'Total',       align: 'center' },
];

function renderElevesContent() {
  const annees = Store.getAnnees();
  const sel    = document.getElementById('eleves-annee-sel');
  // Mémoriser la valeur AVANT de reconstruire les options pour ne pas l'écraser
  const prevVal = sel.value;
  sel.innerHTML = '';
  annees.forEach(a => { const o = document.createElement('option'); o.value = a; o.textContent = a; sel.appendChild(o); });
  // Restaurer la sélection précédente si elle existe, sinon dernière année
  sel.value = (prevVal && annees.includes(prevVal)) ? prevVal : (annees[annees.length - 1] || '');
  sel.onchange = renderElevesContent;

  const annee = sel.value || annees[annees.length - 1];

  // Tri
  let data = Store.resumeParEleve(annee);
  data = [...data].sort((a, b) => {
    const va = a[_eleveSort.key] ?? '';
    const vb = b[_eleveSort.key] ?? '';
    const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
    return _eleveSort.asc ? cmp : -cmp;
  }).slice(0, 50);

  function hc(v, max) {
    const r = max > 0 ? v / max : 0;
    if (r === 0) return 'h0'; if (r < .15) return 'h1'; if (r < .35) return 'h2';
    if (r < .6)  return 'h3'; if (r < .8)  return 'h4'; return 'h5';
  }
  const maxA = Math.max(...data.map(d => d.absences),  1);
  const maxR = Math.max(...data.map(d => d.retards),   1);
  const maxP = Math.max(...data.map(d => d.punitions), 1);
  const maxS = Math.max(...data.map(d => d.sanctions), 1);
  const maxI = Math.max(...data.map(d => d.incidents), 1);

  // En-têtes triables
  const thead = document.querySelector('#tbody-eleves').closest('table').querySelector('thead tr');
  thead.innerHTML = '<th style="text-align:center">#</th>' + ELEVE_COLS.map(col => {
    const active = _eleveSort.key === col.key;
    const arrow  = active ? (_eleveSort.asc ? ' ↑' : ' ↓') : ' ⇅';
    const style  = `text-align:${col.align};cursor:pointer;user-select:none${active ? ';color:var(--accent)' : ''}`;
    return `<th style="${style}" data-sort-eleve="${col.key}">${col.label}<span style="opacity:${active ? 1 : 0.3};font-size:9px">${arrow}</span></th>`;
  }).join('');

  thead.querySelectorAll('th[data-sort-eleve]').forEach(th => {
    th.onclick = () => {
      const k = th.dataset.sortEleve;
      if (_eleveSort.key === k) _eleveSort.asc = !_eleveSort.asc;
      else { _eleveSort.key = k; _eleveSort.asc = true; }
      renderElevesContent();
    };
  });

  document.getElementById('tbody-eleves').innerHTML = data.map((d, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td style="text-align:left">${d.nom} ${d.prenom}</td>
      <td>${d.classe}</td>
      <td>${nBadge(d.niveau)}</td>
      <td class="${hc(d.absences,  maxA)}">${d.absences}</td>
      <td class="${hc(d.retards,   maxR)}">${d.retards}</td>
      <td class="${hc(d.punitions, maxP)}">${d.punitions}</td>
      <td class="${hc(d.exclusions,maxP)}" style="color:${d.exclusions > 2 ? 'var(--red)' : ''}">${d.exclusions}</td>
      <td class="${hc(d.sanctions, maxS)}">${d.sanctions}</td>
      <td class="${hc(d.incidents, maxI)}">${d.incidents}</td>
      <td style="font-weight:700">${d.total}</td>
    </tr>`).join('');
}

// ══════════════════════════════════════════════════════════
//  MAPPING MOTIFS
// ══════════════════════════════════════════════════════════
function renderMapping() {
  const allRaw  = [...Store.getRaw('punitions'), ...Store.getRaw('sanctions'), ...Store.getRaw('incidents')];
  const unknown = Mapping.findUnmapped(allRaw);
  const unkSection = document.getElementById('mapping-unknown-section');

  if (unknown.length) {
    unkSection.style.display = 'block';
    document.getElementById('mapping-unknown-list').innerHTML = unknown.map(m => mappingRow(m, true)).join('');
  } else {
    unkSection.style.display = 'none';
  }

  const allTable = Mapping.getAll();
  document.getElementById('mapping-all-list').innerHTML = Object.entries(allTable)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([m]) => mappingRow(m, false)).join('');

  document.querySelectorAll('.mapping-cat select').forEach(sel => {
    sel.onchange = () => {
      Mapping.set(sel.dataset.motif, sel.value);
      showToast(`→ ${sel.value}`);
      renderMapping();
    };
  });
}

// ── Échappe les caractères HTML spéciaux (FIX B14 — motifs avec guillemets ou chevrons)
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mappingRow(motif, isUnknown) {
  const table   = Mapping.getAll();
  const isMapped = Object.prototype.hasOwnProperty.call(table, motif)
    || Object.keys(table).some(k => k.toLowerCase() === motif.trim().toLowerCase());

  // Pour les motifs non mappés : option vide en tête pour forcer onchange
  // quelle que soit la catégorie choisie, y compris "Non-respect du RI / autre"
  const current = isMapped ? table[motif] || Object.entries(table).find(([k]) => k.toLowerCase() === motif.trim().toLowerCase())?.[1] : null;

  const placeholder = (!isMapped || isUnknown)
    ? `<option value="" disabled selected style="color:var(--text3)">— Choisir une catégorie —</option>`
    : '';

  const opts = placeholder + CFG.categories.map(c =>
    `<option value="${escHtml(c)}" ${c === current ? 'selected' : ''}>${escHtml(c)}</option>`
  ).join('');

  const label = motif.length > 55 ? motif.slice(0, 52) + '…' : motif;
  return `<div class="mapping-row ${isUnknown ? 'mapping-unknown' : ''}">
    <div class="mapping-motif" title="${escHtml(motif)}">${escHtml(label)}</div>
    <div class="mapping-arrow">→</div>
    <div class="mapping-cat"><select data-motif="${escHtml(motif)}">${opts}</select></div>
  </div>`;
}

// ══════════════════════════════════════════════════════════
//  DÉMARRAGE
// ══════════════════════════════════════════════════════════
renderUpload();
