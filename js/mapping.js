// ═══════════════════════════════════════════════════════════
//  mapping.js — Résolution motifs Pronote → 10 catégories
//  Dépend de : config.js, mapping_data.js
// ═══════════════════════════════════════════════════════════

const Mapping = (() => {

  let _table = {};

  // ── Charge la table par défaut (depuis MAPPING_DEFAULT_DATA)
  function load(jsonObj) {
    _table = jsonObj && jsonObj.mapping ? { ...jsonObj.mapping } : {};
  }

  // ── Tente de charger depuis localStorage (mapping personnalisé)
  function loadFromStorage() {
    try {
      const saved = localStorage.getItem('tdb-mapping');
      if (saved) { _table = JSON.parse(saved); return true; }
    } catch (e) { /* localStorage inaccessible en file:// sur certains profils */ }
    return false;
  }

  // ── Sauvegarde dans localStorage
  function saveToStorage() {
    try { localStorage.setItem('tdb-mapping', JSON.stringify(_table)); } catch (e) {}
  }

  // ── Teste si un motif est EXPLICITEMENT présent dans la table
  //    (indépendamment de sa valeur — même "Non-respect RI" est un choix explicite)
  function _isMapped(motif) {
    if (!motif) return false;
    const m    = motif.trim();
    const mLow = m.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(_table, m)) return true;
    // correspondance insensible à la casse
    return Object.keys(_table).some(k => k.toLowerCase() === mLow);
  }

  // ── Résout un motif → catégorie
  //    Priorité : correspondance exacte → casse ignorée → inclusion → fallback
  function resolve(motif) {
    if (!motif) return CFG.categories[9];
    const m = motif.trim();
    // 1. Correspondance exacte (FIX : hasOwnProperty au lieu de if(_table[m]))
    if (Object.prototype.hasOwnProperty.call(_table, m)) return _table[m];
    const mLow = m.toLowerCase();
    // 2. Correspondance insensible à la casse
    for (const [key, cat] of Object.entries(_table)) {
      if (key.toLowerCase() === mLow) return cat;
    }
    // 3. Inclusion partielle
    for (const [key, cat] of Object.entries(_table)) {
      if (mLow.includes(key.toLowerCase()) || key.toLowerCase().includes(mLow)) return cat;
    }
    return CFG.categories[9]; // fallback "Non-respect RI / autre"
  }

  // ── Résout un tableau de motifs → catégorie dominante
  //    FIX B13 : "Non-respect RI" est désormais un choix LÉGITIME.
  //    On ne le saute plus. On cherche le premier motif EXPLICITEMENT mappé,
  //    quelle que soit la catégorie choisie, y compris "Non-respect RI".
  function resolveMany(motifs) {
    const list = motifs || [];
    // Priorité 1 : premier motif explicitement présent dans la table
    for (const m of list) {
      if (_isMapped(m)) return resolve(m);
    }
    // Priorité 2 : fallback sur le premier motif (retournera CFG.categories[9])
    return resolve(list[0]);
  }

  // ── Retourne la liste des motifs non mappés dans un jeu de records
  //    FIX : utilise _isMapped() — un motif mappé sur "Non-respect RI"
  //    est considéré comme mappé et ne remonte plus en rouge.
  function findUnmapped(allRecords) {
    const unknown = new Set();
    for (const r of allRecords) {
      const motifs = r.motifs || (r.motif ? [r.motif] : []);
      for (const m of motifs) {
        if (m && !_isMapped(m.trim())) unknown.add(m.trim());
      }
    }
    return [...unknown].sort();
  }

  function set(motif, categorie) {
    _table[motif.trim()] = categorie;
    saveToStorage();
  }

  function remove(motif) {
    delete _table[motif.trim()];
    saveToStorage();
  }

  function getAll() { return { ..._table }; }

  return { load, loadFromStorage, saveToStorage, resolve, resolveMany, findUnmapped, set, remove, getAll };
})();
