// ═══════════════════════════════════════════════════════════
//  store.js — État global & agrégations V12
//  Dépend de : config.js, mapping.js
//  Corrections V12 :
//    - F4 : countParNiveau utilise _okM() (filtre période inclus)
//    - absParNiveau utilise _okM() (cohérence)
//    - punitionsParTypeNiveau utilise _okM()
// ═══════════════════════════════════════════════════════════

const Store = (() => {

  const _TYPES = ['absences','retards','punitions','sanctions','incidents','cd','ce','faits','signalements','ip'];

  let _raw = {};
  _TYPES.forEach(t => { _raw[t] = []; });

  let _annees  = [];
  let _filtres = { annees: [], niveaux: [], classes: [], moisRange: [0, 9] };

  // ─────────────────────────────────
  //  CHARGEMENT & RESET
  // ─────────────────────────────────
  function addRecords(type, records) {
    if (!_raw[type]) _raw[type] = [];
    _raw[type].push(...records);
    _invalidateKpisCache();
    _rebuildAnnees();
  }

  function reset() {
    _TYPES.forEach(t => { _raw[t] = []; });
    _annees  = [];
    _filtres = { annees: [], niveaux: [], classes: [], moisRange: [0, 9] };
    _invalidateKpisCache();
  }

  function _rebuildAnnees() {
    const s = new Set();
    _TYPES.forEach(t => _raw[t].forEach(r => s.add(r.annee)));
    _annees = [...s].filter(Boolean).sort();
    if (!_filtres.annees.length) _filtres.annees = [..._annees];
  }

  // ─────────────────────────────────
  //  FILTRES
  // ─────────────────────────────────
  function setFiltreAnnees(arr)  { _filtres.annees   = arr; _invalidateKpisCache(); }
  function setFiltreNiveaux(arr) { _filtres.niveaux  = arr; _invalidateKpisCache(); }
  function setFiltreClasses(arr) { _filtres.classes  = arr; _invalidateKpisCache(); }
  function setFiltreMois(s, e)   { _filtres.moisRange = [s, e]; _invalidateKpisCache(); }
  function getFiltres()          { return { ..._filtres }; }
  function getAnnees()           { return [..._annees]; }

  function getAllClasses() {
    const s = new Set();
    _TYPES.forEach(t => _raw[t].forEach(r => { if (r.classe) s.add(r.classe); }));
    return [...s].sort();
  }

  // ── Filtre sans plage mois
  function _ok(r) {
    if (_filtres.annees.length  && !_filtres.annees.includes(r.annee))   return false;
    if (_filtres.niveaux.length && !_filtres.niveaux.includes(r.niveau)) return false;
    if (_filtres.classes.length && !_filtres.classes.includes(r.classe)) return false;
    return true;
  }

  // ── Filtre avec plage mois — CORRECTION F4 : utilisé dans toutes les agrégations
  function _okM(r) {
    if (!_ok(r)) return false;
    return r.moisIdx >= _filtres.moisRange[0] && r.moisIdx <= _filtres.moisRange[1];
  }

  // ─────────────────────────────────
  //  AGRÉGATS PAR MOIS PAR ANNÉE
  // ─────────────────────────────────
  function countParMoisParAnnee(type) {
    const res = {};
    _filtres.annees.forEach(a => { res[a] = Array(10).fill(0); });
    for (const r of _raw[type] || []) {
      if (!_ok(r)) continue;
      if (!res[r.annee]) res[r.annee] = Array(10).fill(0);
      if (r.moisIdx >= 0 && r.moisIdx <= 9) res[r.annee][r.moisIdx]++;
    }
    return res;
  }

  function absParMoisParAnnee(justifiee = null) {
    const res = {};
    _filtres.annees.forEach(a => { res[a] = Array(10).fill(0); });
    for (const r of _raw.absences) {
      if (!_ok(r)) continue;
      if (justifiee !== null && r.justifiee !== justifiee) continue;
      if (!res[r.annee]) res[r.annee] = Array(10).fill(0);
      if (r.moisIdx >= 0 && r.moisIdx <= 9) res[r.annee][r.moisIdx] += r.demiJour;
    }
    Object.keys(res).forEach(a => { res[a] = res[a].map(v => Math.round(v * 10) / 10); });
    return res;
  }

  function punitionsParTypeMois(typePun) {
    const res = {};
    _filtres.annees.forEach(a => { res[a] = Array(10).fill(0); });
    for (const r of _raw.punitions) {
      if (!_ok(r) || r.typePun !== typePun) continue;
      if (!res[r.annee]) res[r.annee] = Array(10).fill(0);
      if (r.moisIdx >= 0 && r.moisIdx <= 9) res[r.annee][r.moisIdx]++;
    }
    return res;
  }

  function suiviParMoisParAnnee(type) {
    return countParMoisParAnnee(type);
  }

  // ─────────────────────────────────
  //  AGRÉGATS PAR NIVEAU
  //  CORRECTION F4 : _okM() au lieu de _ok() → filtre période actif
  // ─────────────────────────────────
  function countParNiveau(type, annee) {
    const res = {};
    CFG.niveaux.forEach(n => { res[n] = 0; });
    for (const r of _raw[type] || []) {
      if (annee && r.annee !== annee) continue;
      if (!_okM(r)) continue;   // ← était _ok(), corrigé en _okM()
      if (res[r.niveau] !== undefined) res[r.niveau]++;
    }
    return res;
  }

  function absParNiveau(annee, justifiee = null) {
    const res = {};
    CFG.niveaux.forEach(n => { res[n] = 0; });
    for (const r of _raw.absences) {
      if (annee && r.annee !== annee) continue;
      if (!_okM(r)) continue;   // ← cohérence F4
      if (justifiee !== null && r.justifiee !== justifiee) continue;
      if (res[r.niveau] !== undefined) res[r.niveau] += r.demiJour;
    }
    CFG.niveaux.forEach(n => { res[n] = Math.round(res[n] * 10) / 10; });
    return res;
  }

  function punitionsParTypeNiveau(typePun, annee) {
    const res = {};
    CFG.niveaux.forEach(n => { res[n] = 0; });
    for (const r of _raw.punitions) {
      if (annee && r.annee !== annee) continue;
      if (!_okM(r)) continue;   // ← cohérence F4
      if (r.typePun !== typePun) continue;
      if (res[r.niveau] !== undefined) res[r.niveau]++;
    }
    return res;
  }

  // ─────────────────────────────────
  //  AGRÉGATS PAR CATÉGORIE MOTIF
  // ─────────────────────────────────
  function countParCategorie(type, annee) {
    const res = {};
    CFG.categories.forEach(c => { res[c] = 0; });
    for (const r of _raw[type] || []) {
      if (annee && r.annee !== annee) continue;
      if (!_okM(r)) continue;
      const motifs = r.motifs || (r.motif ? [r.motif] : []);
      const cat    = Mapping.resolveMany(motifs);
      if (res[cat] !== undefined) res[cat]++;
    }
    return res;
  }

  // ─────────────────────────────────
  //  DÉCROCHAGE
  // ─────────────────────────────────
  function decrochageParMois(annee) {
    const parMois = Array(10).fill(null).map(() => ({}));
    for (const r of _raw.absences) {
      if (r.annee !== annee || r.justifiee) continue;
      if (!_ok(r)) continue;
      if (r.moisIdx < 0 || r.moisIdx > 9) continue;
      const key = `${r.nom}|${r.prenom}|${r.classe}`;
      parMois[r.moisIdx][key] = (parMois[r.moisIdx][key] || 0) + r.demiJour;
    }
    return parMois.map(mois =>
      Object.values(mois).filter(dj => dj > CFG.seuilDecrochage).length
    );
  }

  function decrochageElevesParMois(annee, moisIdx) {
    const parEleve = {};
    for (const r of _raw.absences) {
      if (r.annee !== annee || r.justifiee || r.moisIdx !== moisIdx) continue;
      if (!_ok(r)) continue;
      const key = `${r.nom}|${r.prenom}|${r.classe}`;
      if (!parEleve[key]) parEleve[key] = { nom: r.nom, prenom: r.prenom, classe: r.classe, niveau: r.niveau, djNJ: 0 };
      parEleve[key].djNJ += r.demiJour;
    }
    return Object.values(parEleve)
      .filter(e => e.djNJ > CFG.seuilDecrochage)
      .sort((a, b) => b.djNJ - a.djNJ)
      .map(e => ({ ...e, djNJ: Math.round(e.djNJ * 10) / 10 }));
  }

  // ─────────────────────────────────
  //  KPIs GLOBAUX (pour l'année et la plage de mois active)
  //  Mémoïsé : le cache est invalidé à chaque changement de filtre
  // ─────────────────────────────────
  const _kpisCache = {};

  function _invalidateKpisCache() {
    Object.keys(_kpisCache).forEach(k => delete _kpisCache[k]);
  }

  function kpis(annee) {
    const cacheKey = `${annee}|${_filtres.annees.join(',')}|${_filtres.niveaux.join(',')}|${_filtres.classes.join(',')}|${_filtres.moisRange.join(',')}`;
    if (_kpisCache[cacheKey]) return _kpisCache[cacheKey];

    const f = r => r.annee === annee && _okM(r);
    const kpi = {
      absences: 0, absNJ: 0,
      retards:      _raw.retards.filter(f).length,
      punitions:    _raw.punitions.filter(f).length,
      exclusions:   _raw.punitions.filter(r => f(r) && r.typePun === 'exclusion').length,
      retenues:     _raw.punitions.filter(r => f(r) && r.typePun === 'retenue').length,
      sanctions:    _raw.sanctions.filter(f).length,
      incidents:    _raw.incidents.filter(f).length,
      cd:           _raw.cd.filter(f).length,
      ce:           _raw.ce.filter(f).length,
      faits:        _raw.faits.filter(f).length,
      signalements: _raw.signalements.filter(f).length,
      ip:           _raw.ip.filter(f).length
    };
    for (const r of _raw.absences.filter(f)) {
      kpi.absences += r.demiJour;
      if (!r.justifiee) kpi.absNJ += r.demiJour;
    }
    kpi.absences = Math.round(kpi.absences * 10) / 10;
    kpi.absNJ    = Math.round(kpi.absNJ * 10) / 10;
    _kpisCache[cacheKey] = kpi;
    return kpi;
  }

  // ─────────────────────────────────
  //  RÉSUMÉ PAR CLASSE
  // ─────────────────────────────────
  // Types ayant une classe connue (exclut suivi sans colonne classe)
  const _TYPES_AVEC_CLASSE = ['absences','retards','punitions','sanctions','incidents'];

  function resumeParClasse(annee) {
    const res = {};
    for (const type of _TYPES_AVEC_CLASSE) {
      for (const r of _raw[type]) {
        if (annee && r.annee !== annee) continue;
        if (!_okM(r)) continue;
        // Ignorer les enregistrements sans classe identifiée
        if (!r.classe || r.classe === '?') continue;
        const k = r.classe;
        if (!res[k]) res[k] = { classe: k, niveau: r.niveau, absences: 0, retards: 0, punitions: 0, exclusions: 0, sanctions: 0, incidents: 0, total: 0 };
        if (type === 'absences')       { res[k].absences += r.demiJour; }
        else if (type === 'retards')   { res[k].retards++; }
        else if (type === 'punitions') { res[k].punitions++; if (r.typePun === 'exclusion') res[k].exclusions++; }
        else if (type === 'sanctions') { res[k].sanctions++; }
        else                           { res[k].incidents++; }
        res[k].total++;
      }
    }
    Object.keys(res).forEach(k => { res[k].absences = Math.round(res[k].absences * 10) / 10; });
    return Object.values(res).sort((a, b) => b.total - a.total);
  }

  // ─────────────────────────────────
  //  RÉSUMÉ PAR ÉLÈVE (top 50)
  // ─────────────────────────────────
  function resumeParEleve(annee) {
    const res = {};
    for (const type of _TYPES) {
      for (const r of _raw[type]) {
        if (annee && r.annee !== annee) continue;
        if (!_okM(r) || !r.nom) continue;
        const k = `${r.nom}|${r.prenom}|${r.classe}`;
        if (!res[k]) res[k] = { nom: r.nom, prenom: r.prenom, classe: r.classe, niveau: r.niveau, absences: 0, retards: 0, punitions: 0, exclusions: 0, sanctions: 0, incidents: 0, total: 0 };
        if (type === 'absences')       { res[k].absences += r.demiJour; }
        else if (type === 'retards')   { res[k].retards++; }
        else if (type === 'punitions') { res[k].punitions++; if (r.typePun === 'exclusion') res[k].exclusions++; }
        else if (type === 'sanctions') { res[k].sanctions++; }
        else                           { res[k].incidents++; }
        res[k].total++;
      }
    }
    Object.keys(res).forEach(k => { res[k].absences = Math.round(res[k].absences * 10) / 10; });
    return Object.values(res).sort((a, b) => b.total - a.total);
  }

  // ─────────────────────────────────
  //  UTILITAIRES
  // ─────────────────────────────────
  function getCounts() { const c = {}; _TYPES.forEach(t => { c[t] = _raw[t].length; }); return c; }
  function getRaw(type) { return [...(_raw[type] || [])]; }
  function hasData(type) { return (_raw[type] || []).length > 0; }

  return {
    addRecords, reset, getAnnees, getAllClasses, getFiltres, getCounts, getRaw, hasData,
    setFiltreAnnees, setFiltreNiveaux, setFiltreClasses, setFiltreMois,
    countParMoisParAnnee, absParMoisParAnnee, punitionsParTypeMois, suiviParMoisParAnnee,
    countParNiveau, absParNiveau, punitionsParTypeNiveau,
    countParCategorie,
    resumeParClasse, resumeParEleve,
    decrochageParMois, decrochageElevesParMois,
    kpis
  };
})();
