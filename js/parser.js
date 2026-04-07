// ═══════════════════════════════════════════════════════════
//  parser.js — Lecture & normalisation CSV/XLSX Pronote V12
//  Dépend de : config.js, mapping.js
//  Corrections V12 :
//    - F1 : filtre annee < 2020 (dates de naissance ignorées)
//    - Nettoyage seuilDecrochage (orthographe corrigée dans CFG)
// ═══════════════════════════════════════════════════════════

const Parser = (() => {

  // ── Normalise classe → niveau ("4EME C" → "4ème")
  function classeToNiveau(classe) {
    if (!classe) return 'Inconnu';
    const c = classe.toUpperCase().trim();
    if (c.startsWith('6')) return '6ème';
    if (c.startsWith('5')) return '5ème';
    if (c.startsWith('4')) return '4ème';
    if (c.startsWith('3')) return '3ème';
    return classe.trim();
  }

  // ── Normalise classe pour affichage ("4EME C" → "4ème C")
  function classeDisplay(classe) {
    if (!classe) return '?';
    return classe.replace(/^(\d)(EME|ÈME|eme|ème)\s*/i, (_, d) => `${d}ème `).trim();
  }

  // ── Parse date JJ/MM/AAAA → objet ou null
  //    CORRECTION F1 : ignore les dates dont l'année < 2020 (= dates de naissance)
  function parseDate(str) {
    if (!str) return null;
    const parts = String(str).trim().split('/');
    if (parts.length < 3) return null;
    const jour = parseInt(parts[0]);
    const mois = parseInt(parts[1]);
    const annee = parseInt(parts[2]);
    if (isNaN(jour) || isNaN(mois) || isNaN(annee)) return null;
    // ⚠️ Filtre dates de naissance (année < 2020)
    if (annee < 2020) return null;
    const moisJS = mois - 1;  // 0-indexed
    let moisIdx = moisJS - 8;
    if (moisIdx < 0) moisIdx += 12;
    if (moisIdx > 9) return null;  // mois hors année scolaire (juil/août)
    const anneeSco = moisJS >= 8
      ? `${annee}-${annee + 1}`
      : `${annee - 1}-${annee}`;
    return { jour, mois: moisJS, annee, moisIdx, anneeSco };
  }

  // ── Parse un serial Excel (nombre entier) ou une chaîne date
  function parseDateExcel(val) {
    if (!val) return null;
    if (typeof val === 'number') {
      // Excel Windows : epoch 1900 (offset 25569 vers Unix)
      // Excel Mac     : epoch 1904 (offset 24107 vers Unix)
      // Heuristique : si la valeur convertie donne une année < 2000, on tente l'offset Mac
      const tryOffset = (offset) => {
        const d = new Date(Math.round((val - offset) * 86400 * 1000));
        return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
      };
      const strWin = tryOffset(25569);
      const yearWin = parseInt(strWin.split('/')[2]);
      // Si l'année Windows est hors plage scolaire raisonnable, essayer Mac
      const str = (yearWin >= 2020 && yearWin <= 2100) ? strWin : tryOffset(24107);
      return parseDate(str);
    }
    // Forme "04/12/2025 de 17:00" → extraire la date
    const m = String(val).match(/^(\d{2}\/\d{2}\/\d{4})/);
    return m ? parseDate(m[1]) : parseDate(String(val));
  }

  // ── Extrait l'année scolaire depuis un nom de fichier (ex: "suivi_2024-2025.xlsx")
  function detectAnnee(filename) {
    const m = (filename || '').match(/(\d{4})-(\d{4})/);
    return m ? `${m[1]}-${m[2]}` : null;
  }

  // ── Détecte le type depuis le nom de fichier
  function detectType(filename) {
    const fn = (filename || '').toLowerCase();
    for (const [type, patterns] of Object.entries(CFG.filePatterns)) {
      if (patterns.some(p => fn.includes(p))) return type;
    }
    return null;
  }

  // ── Détecte le type depuis les en-têtes CSV
  function detectTypeFromHeaders(headers) {
    const cols = (headers || []).map(h => (h || '').trim().toUpperCase());
    const has = col => cols.some(c => c.includes(col));
    if (has('PUNITION') || has('DEMANDEUR'))                                return 'punitions';
    if (has('SANCTION') || has('DECIDEUR'))                                 return 'sanctions';
    if (has('DEMI JOUR') || has('ETAT_JUSTIFICATION') || has('DATE DEBUT')) return 'absences';
    if (has('DUREE') && has('REGLE') && !has('DATE DEBUT'))                 return 'retards';
    return null;
  }

  function autoDetectCSV(filename, csvText) {
    const fromName = detectType(filename);
    if (fromName) return fromName;
    if (csvText) {
      const firstLine = csvText.split(/\r?\n/)[0];
      return detectTypeFromHeaders(firstLine.split(';'));
    }
    return null;
  }

  // ── Vérifie si un XLSX est un fichier suivi (présence de feuilles connues)
  function isSuiviXLSX(sheetNames) {
    const allPatterns = Object.values(CFG.suiviSheets).flat();
    return (sheetNames || []).some(s => {
      const n = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return allPatterns.some(p =>
        n.includes(p.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      );
    });
  }

  // ── Helpers colonnes
  function normCol(str)        { return (str || '').trim().toUpperCase(); }
  function buildColIndex(hdrs) { const i = {}; hdrs.forEach((h, n) => { i[normCol(h)] = n; }); return i; }
  function getVal(row, ci, col){ const i = ci[normCol(col)]; return i !== undefined ? String(row[i] || '').trim() : ''; }
  function parseMotifs(str)    { if (!str) return ['Non renseigné']; return str.split(',').map(m => m.trim()).filter(Boolean); }

  function resoudreTypePunition(typeRaw) {
    if (!typeRaw) return 'autre';
    const t = typeRaw.toLowerCase();
    for (const [key, patterns] of Object.entries(CFG.typesPunitions)) {
      if (key === 'autre') continue;
      if (patterns.some(p => t.includes(p))) return key;
    }
    return 'autre';
  }

  // ══════════════════════════════════════════
  //  PARSE ABSENCES
  // ══════════════════════════════════════════
  function parseAbsences(rows, headers, annee) {
    const ci = buildColIndex(headers);
    return rows.reduce((acc, row) => {
      if (!row || row.length < 3) return acc;
      const nom   = getVal(row, ci, 'NOM');
      const debut = parseDate(getVal(row, ci, 'DATE DEBUT'));
      if (!nom || !debut) return acc;
      const regle = getVal(row, ci, 'REGLE');
      const etatJ = getVal(row, ci, 'ETAT_JUSTIFICATION');
      const dj    = parseFloat(getVal(row, ci, 'DEMI JOUR').replace(',', '.')) || 1;
      const classe = getVal(row, ci, 'CLASSES');
      acc.push({
        annee, nom, prenom: getVal(row, ci, 'PRENOM'),
        classe: classeDisplay(classe),
        niveau: classeToNiveau(classe),
        motif: getVal(row, ci, 'MOTIF'),
        moisIdx: debut.moisIdx,
        demiJour: dj,
        justifiee: (regle === 'O' || etatJ === 'O'),
        type: 'absence'
      });
      return acc;
    }, []);
  }

  // ══════════════════════════════════════════
  //  PARSE RETARDS
  // ══════════════════════════════════════════
  function parseRetards(rows, headers, annee) {
    const ci = buildColIndex(headers);
    return rows.reduce((acc, row) => {
      if (!row || row.length < 3) return acc;
      const nom  = getVal(row, ci, 'NOM');
      const date = parseDate(getVal(row, ci, 'DATE'));
      if (!nom || !date) return acc;
      const classe = getVal(row, ci, 'CLASSES');
      acc.push({
        annee, nom, prenom: getVal(row, ci, 'PRENOM'),
        classe: classeDisplay(classe),
        niveau: classeToNiveau(classe),
        motif: getVal(row, ci, 'MOTIF'),
        moisIdx: date.moisIdx,
        justifie: getVal(row, ci, 'REGLE') === 'O',
        type: 'retard'
      });
      return acc;
    }, []);
  }

  // ══════════════════════════════════════════
  //  PARSE PUNITIONS
  // ══════════════════════════════════════════
  function parsePunitions(rows, headers, annee) {
    const ci = buildColIndex(headers);
    return rows.reduce((acc, row) => {
      if (!row || row.length < 3) return acc;
      const nom  = getVal(row, ci, 'NOM');
      const date = parseDate(getVal(row, ci, 'DATE'));
      if (!nom || !date) return acc;
      const classe  = getVal(row, ci, 'CLASSES');
      const typeRaw = getVal(row, ci, 'PUNITION');
      acc.push({
        annee, nom, prenom: getVal(row, ci, 'PRENOM'),
        classe: classeDisplay(classe),
        niveau: classeToNiveau(classe),
        motifs: parseMotifs(getVal(row, ci, 'MOTIF')),
        typeRaw, typePun: resoudreTypePunition(typeRaw),
        demandeur: getVal(row, ci, 'DEMANDEUR'),
        moisIdx: date.moisIdx,
        type: 'punition'
      });
      return acc;
    }, []);
  }

  // ══════════════════════════════════════════
  //  PARSE SANCTIONS
  // ══════════════════════════════════════════
  function parseSanctions(rows, headers, annee) {
    const ci = buildColIndex(headers);
    return rows.reduce((acc, row) => {
      if (!row || row.length < 3) return acc;
      const nom  = getVal(row, ci, 'NOM');
      const date = parseDate(getVal(row, ci, 'DATE'));
      if (!nom || !date) return acc;
      const classe = getVal(row, ci, 'CLASSES');
      acc.push({
        annee, nom, prenom: getVal(row, ci, 'PRENOM'),
        classe: classeDisplay(classe),
        niveau: classeToNiveau(classe),
        motifs: parseMotifs(getVal(row, ci, 'MOTIF')),
        typeSan: getVal(row, ci, 'SANCTION'),
        decideur: getVal(row, ci, 'DECIDEUR'),
        moisIdx: date.moisIdx,
        type: 'sanction'
      });
      return acc;
    }, []);
  }

  // ══════════════════════════════════════════
  //  PARSE INCIDENTS (feuille Excel)
  //  Format attendu colonne auteur(s) :
  //    "MORVAN Stephane (6EME A)"
  //    Plusieurs auteurs séparés par " / "
  //  La colonne est détectée par son en-tête (contient AUTEUR),
  //  sinon par recherche heuristique (colonne J = index 9 par défaut
  //  dans l'export Pronote, ou première colonne contenant "(XEME").
  // ══════════════════════════════════════════
  function parseIncidents(rows, headers, annee) {
    const ci = buildColIndex(headers);

    // ── Détection colonne date
    const dateIdx = ci['DATE'] !== undefined ? ci['DATE'] : -1;

    // ── Détection colonne motif
    const motifKey = ["MOTIFS DE L'INCIDENT","MOTIF DE L'INCIDENT","MOTIFS","MOTIF"]
      .find(k => ci[k] !== undefined);
    const motifIdx = motifKey !== undefined ? ci[motifKey] : -1;

    // ── Détection colonne auteur(s) :
    //    Priorité : "AUTEUR(S) DE L'INCIDENT" (col J) > tout autre AUTEUR > heuristique
    //    On évite "AUTEUR DU SIGNALEMENT" (col I) qui est la colonne précédente
    let auteursIdx = -1;
    let _auteursDetectionFallback = false;
    const allKeys  = Object.keys(ci);
    const auteursKey =
      allKeys.find(k => k.includes('AUTEUR') && k.includes('INCIDENT')) ||
      allKeys.find(k => k.includes('AUTEUR') && !k.includes('SIGNALEMENT')) ||
      allKeys.find(k => k.includes('AUTEUR'));
    if (auteursKey) {
      auteursIdx = ci[auteursKey];
    } else {
      _auteursDetectionFallback = true;
      // Essai colonne J (index 9)
      auteursIdx = 9;
      // Vérification heuristique sur les 5 premières lignes de données
      const hasPatternAtIdx = (idx) => rows.slice(0, 5).some(r => {
        const cell = String(r[idx] || '');
        return /\([1-6]EME/i.test(cell) || /\([1-6]ÈME/i.test(cell);
      });
      if (!hasPatternAtIdx(9)) {
        // Chercher la bonne colonne parmi toutes
        const found = [8,10,11,7,6].find(idx => hasPatternAtIdx(idx));
        if (found !== undefined) {
          auteursIdx = found;
          _auteursDetectionFallback = false; // trouvé par heuristique positive
        }
        // si aucune colonne ne correspond, auteursIdx reste 9 et le flag reste true
      } else {
        _auteursDetectionFallback = false;
      }
    }

    // ── Extraction nom/prenom/classe depuis "NOM Prenom (CLASSE)"
    function parseAuteur(str) {
      const s = str.trim();
      if (!s) return null;
      // Extraire la classe entre parenthèses en fin de chaîne
      const classeMatch = s.match(/\(([^)]+)\)\s*$/);
      const classeRaw   = classeMatch ? classeMatch[1].trim() : '';
      const nomComplet  = s.replace(/\s*\([^)]*\)\s*$/, '').trim();
      if (!nomComplet) return null;
      // Séparer NOM (majuscules) du Prénom
      // "MORVAN Stephane" → nom="MORVAN", prenom="Stephane"
      const parts = nomComplet.match(/^([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s\-]*)[\s]+(.+)$/);
      return {
        nom:    parts ? parts[1].trim() : nomComplet,
        prenom: parts ? parts[2].trim() : '',
        classe: classeDisplay(classeRaw),
        niveau: classeToNiveau(classeRaw)
      };
    }

    return rows.reduce((acc, row) => {
      if (!row || row.length < 2) return acc;
      if (row.every(c => !String(c || '').trim())) return acc;

      // Date
      const dateStr = dateIdx >= 0 ? String(row[dateIdx] || '').trim() : '';
      const date = parseDate(dateStr) || parseDateExcel(dateIdx >= 0 ? row[dateIdx] : null);
      if (!date) return acc;

      // Motif
      const motifRaw = motifIdx >= 0 ? String(row[motifIdx] || '').trim() : '';

      // Auteur(s) multi-formats Pronote :
      //   slash  : "MORVAN Stephane (6EME A) / DUPONT Marie (5EME B)"
      //   virgule: "ALFRED Mohamed (5EME B), CHOPIN Yassine (6EME C)"
      //   mixte  : les deux peuvent coexister
      // Stratégie : splitter d'abord sur " / ", puis sur les virgules
      // qui sont suivies d'un NOM en MAJUSCULES (pattern auteur Pronote).
      // On ne splittera PAS sur une virgule si elle est à l'intérieur d'un
      // token sans parenthèse fermante encore rencontrée (ex: motif multi-mots).
      const auteursRaw = auteursIdx >= 0 ? String(row[auteursIdx] || '').trim() : '';
      let auteursList = [''];
      if (auteursRaw) {
        // 1) Split sur slash (séparateur historique Pronote)
        const slashParts = auteursRaw.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
        // 2) Pour chaque partie, re-splitter sur les virgules inter-auteurs
        //    Une virgule est inter-auteurs si ce qui suit ressemble à un début
        //    d'auteur Pronote : MAJUSCULES puis espace puis Prénom (Minuscule)
        //    Pattern : "TEXTE_MAJ Prenom (CLASSE)" ou juste "TEXTE_MAJ Prenom"
        const reAuteurDebut = /^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s\-']+\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇa-zàâäéèêëïîôùûüç]/;
        auteursList = slashParts.flatMap(part => {
          // Tenter un split sur ", " suivi d'un pattern auteur
          const segments = [];
          let remaining = part;
          while (remaining.length > 0) {
            // Chercher la prochaine virgule suivie d'un espace + début auteur
            const commaIdx = remaining.search(/,\s+(?=[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s\-']*\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇa-z])/);
            if (commaIdx === -1) {
              segments.push(remaining.trim());
              break;
            }
            // Vérifier que la partie avant la virgule contient une parenthèse fermante
            // (c'est-à-dire que le token auteur précédent est complet "NOM Prenom (CLASSE)")
            const before = remaining.slice(0, commaIdx).trim();
            const after  = remaining.slice(commaIdx + 1).trim();
            if (before.endsWith(')') || reAuteurDebut.test(before)) {
              segments.push(before);
              remaining = after;
            } else {
              // La virgule est probablement dans un prénom/motif composé → on garde
              segments.push(remaining.trim());
              break;
            }
          }
          return segments.filter(Boolean);
        });
      }

      for (const auteurStr of auteursList) {
        const a = parseAuteur(auteurStr);
        acc.push({
          annee,
          nom:    a ? a.nom    : '',
          prenom: a ? a.prenom : '',
          classe: a ? a.classe : '?',
          niveau: a ? a.niveau : 'Inconnu',
          motifs: parseMotifs(motifRaw),
          moisIdx: date.moisIdx,
          type: 'incident',
          _auteursWarning: _auteursDetectionFallback
        });
      }
      return acc;
    }, []);
  }

  // ══════════════════════════════════════════
  //  PARSE CD / CE (feuilles suivi)
  //  Structure : 2 lignes d'en-tête
  //  col1 = N°, col2 = date, col4 = élève, col5 = motif
  // ══════════════════════════════════════════
  function parseCDCE(allRows, type, anneeFromFile) {
    const result = [];
    const dataRows = allRows.slice(2); // 2 lignes d'en-tête

    // Détecter l'année depuis les données si absent du nom
    let anneeDetectee = anneeFromFile;
    if (!anneeDetectee) {
      for (const row of allRows.slice(0, 20)) {
        const cell = row[1];
        const d = parseDateExcel(cell);
        if (d) { anneeDetectee = d.anneeSco; break; }
      }
    }

    for (const row of dataRows) {
      if (!row || row.every(c => !String(c || '').trim())) continue;
      const dateCell = row[1];
      const date = parseDateExcel(dateCell);
      if (!date) continue;
      const annee  = anneeDetectee || date.anneeSco;
      const eleve  = String(row[3] || '').trim();
      const motifR = String(row[4] || '').trim();
      const [nomP, ...prenomP] = eleve.split(' ');
      result.push({
        annee, nom: nomP || '', prenom: prenomP.join(' '),
        classe: '?', niveau: 'Inconnu',
        motif: motifR, motifs: parseMotifs(motifR),
        moisIdx: date.moisIdx, type
      });
    }
    return result;
  }

  // ══════════════════════════════════════════
  //  PARSE SigntAbs (feuille suivi)
  //  Tableau agrégé : colonnes = mois, lignes = types
  //  On prend les totaux par mois (somme de toutes les lignes par colonne)
  // ══════════════════════════════════════════
  function parseSigntAbs(allRows, anneeFromFile) {
    const totaux = Array(10).fill(0);
    const moisNoms = ['sept', 'oct', 'nov', 'déc', 'dec', 'jan', 'fév', 'fev', 'mar', 'avr', 'mai', 'juin'];
    const moisIdx  = [0, 1, 2, 3, 3, 4, 5, 5, 6, 7, 8, 9];

    if (!allRows.length) return [];
    const headerRow = allRows[0];
    const colToMois = {};

    headerRow.forEach((cell, i) => {
      const h = String(cell || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      for (let m = 0; m < moisNoms.length; m++) {
        const pattern = moisNoms[m].normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (h.includes(pattern)) { colToMois[i] = moisIdx[m]; break; }
      }
    });

    for (const row of allRows.slice(1)) {
      if (!row || row.every(c => !String(c || '').trim())) continue;
      for (const [colStr, mi] of Object.entries(colToMois)) {
        const val = parseFloat(String(row[parseInt(colStr)] || '').replace(',', '.'));
        if (!isNaN(val) && mi <= 9) totaux[mi] += val;
      }
    }

    const anneeFinale = anneeFromFile || 'Inconnue';
    const result = [];
    totaux.forEach((total, mi) => {
      for (let i = 0; i < Math.round(total); i++) {
        result.push({
          annee: anneeFinale, nom: '', prenom: '', classe: '?', niveau: 'Inconnu',
          motif: 'Signalement absentéisme', motifs: ['Signalement absentéisme'],
          moisIdx: mi, type: 'signalements'
        });
      }
    });
    return result;
  }

  // ══════════════════════════════════════════
  //  PARSE Faits-Etab (feuille suivi)
  //  1 colonne, pipe-séparé : TYPE|"FAIT"|"GRAVITE"|"ANNEE-MOIS"|"TOTAL"
  // ══════════════════════════════════════════
  function parseFaitsEtab(allRows, anneeFromFile) {
    const result = [];

    function anneeMoisToIdx(str) {
      const m = String(str || '').match(/(\d{4})-(\d{2})/);
      if (!m) return null;
      const annee = parseInt(m[1]);
      const mois  = parseInt(m[2]) - 1;  // 0-indexed
      if (annee < 2020) return null;
      let mi = mois - 8;
      if (mi < 0) mi += 12;
      if (mi > 9) return null;
      const anneeSco = mois >= 8 ? `${annee}-${annee+1}` : `${annee-1}-${annee}`;
      return { moisIdx: mi, anneeSco };
    }

    for (const row of allRows.slice(1)) {
      if (!row || !row[0]) continue;
      const raw = String(row[0]).trim();
      if (!raw) continue;
      const parts = raw.split('|').map(p => p.replace(/^"|"$/g, '').trim());
      if (parts.length < 5) continue;
      const dm    = anneeMoisToIdx(parts[3]);
      if (!dm) continue;
      const total = parseInt(parts[4]);
      if (isNaN(total) || total <= 0) continue; // ignorer les totaux nuls ou invalides
      const annee = anneeFromFile || dm.anneeSco;
      const motif = `${parts[1]} (${parts[0]})`;
      for (let i = 0; i < total; i++) {
        result.push({
          annee, nom: '', prenom: '', classe: '?', niveau: 'Inconnu',
          motif, motifs: [parts[1]], gravite: parts[2],
          moisIdx: dm.moisIdx, type: 'faits'
        });
      }
    }
    return result;
  }

  // ══════════════════════════════════════════
  //  PARSE IP (feuille suivi)
  //  Ligne 1 : None, Septembre, Octobre, ... Juin
  //  Ligne 2 : Nb, val1, val2, ...
  // ══════════════════════════════════════════
  function parseIP(allRows, anneeFromFile) {
    if (allRows.length < 2) return [];
    const header = allRows[0];
    const valRow = allRows[1];
    const result = [];
    const anneeFinale = anneeFromFile || 'Inconnue';
    const moisNoms  = ['septembre','octobre','novembre','décembre','decembre','janvier','février','fevrier','mars','avril','mai','juin'];
    const moisMap   = [0, 1, 2, 3, 3, 4, 5, 5, 6, 7, 8, 9];

    header.forEach((h, i) => {
      const hn = String(h || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const mi = moisNoms.map(m => m.normalize('NFD').replace(/[\u0300-\u036f]/g, '')).indexOf(hn);
      if (mi < 0) return;
      const moisIdx = moisMap[mi];
      const total   = parseInt(String(valRow[i] || '').replace(',', '.')) || 0;
      for (let j = 0; j < total; j++) {
        result.push({
          annee: anneeFinale, nom: '', prenom: '', classe: '?', niveau: 'Inconnu',
          motif: 'Information préoccupante', motifs: ['Information préoccupante'],
          moisIdx, type: 'ip'
        });
      }
    });
    return result;
  }

  // ══════════════════════════════════════════
  //  DÉTECTION TYPE FEUILLE XLSX
  // ══════════════════════════════════════════
  function detectSheetType(sheetName) {
    const n = sheetName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const [type, patterns] of Object.entries(CFG.suiviSheets)) {
      if (patterns.some(p => n.includes(p.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) return type;
    }
    return null;
  }

  // ══════════════════════════════════════════
  //  POINT D'ENTRÉE — CSV
  // ══════════════════════════════════════════
  function parseCSVFile(filename, csvText) {
    const type = autoDetectCSV(filename, csvText);
    if (!type) return { error: `Type non reconnu : "${filename}". Vérifiez le format (colonnes CSV Pronote).` };

    const parsed = Papa.parse(csvText, { delimiter: ';', skipEmptyLines: true });
    if (!parsed.data.length) return { error: `Fichier vide : "${filename}"` };

    const [headerRow, ...dataRows] = parsed.data;

    // Détection année depuis les données si absente du nom
    let annee = detectAnnee(filename);
    if (!annee) {
      const ci  = buildColIndex(headerRow);
      const col = type === 'absences' ? 'DATE DEBUT' : 'DATE';
      for (const row of dataRows.slice(0, 15)) {
        const d = parseDate(getVal(row, ci, col));
        if (d) { annee = d.anneeSco; break; }
      }
    }
    annee = annee || 'Inconnue';

    let records;
    switch (type) {
      case 'absences':  records = parseAbsences(dataRows, headerRow, annee);  break;
      case 'retards':   records = parseRetards(dataRows, headerRow, annee);   break;
      case 'punitions': records = parsePunitions(dataRows, headerRow, annee); break;
      case 'sanctions': records = parseSanctions(dataRows, headerRow, annee); break;
      default: records = [];
    }
    return { type, annee, records, filename, count: records.length };
  }

  // ══════════════════════════════════════════
  //  POINT D'ENTRÉE — XLSX suivi
  // ══════════════════════════════════════════
  function parseXLSXSuivi(filename, arrayBuffer) {
    const anneeFromFile = detectAnnee(filename);
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const results = [];
    const errors  = [];

    for (const sheetName of wb.SheetNames) {
      const sheetType = detectSheetType(sheetName);
      if (!sheetType) {
        errors.push(`Feuille ignorée : "${sheetName}" — non reconnue. Attendu : CDiscipline, ComEduc, SigntAbs, Faits-Etab, IP, Incidents.`);
        continue;
      }

      const ws   = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (!rows.length) { errors.push(`Feuille vide : "${sheetName}"`); continue; }

      let records = [];
      switch (sheetType) {
        case 'cd':           records = parseCDCE(rows, 'cd', anneeFromFile); break;
        case 'ce':           records = parseCDCE(rows, 'ce', anneeFromFile); break;
        case 'signalements': records = parseSigntAbs(rows, anneeFromFile);   break;
        case 'faits':        records = parseFaitsEtab(rows, anneeFromFile);  break;
        case 'ip':           records = parseIP(rows, anneeFromFile);         break;
        case 'incidents':    records = parseIncidents(rows.slice(1), rows[0].map(String), anneeFromFile || 'Inconnue'); break;
        default: errors.push(`Feuille non gérée : "${sheetName}"`); continue;
      }

      if (sheetType === 'incidents' && records.some(r => r._auteursWarning)) {
        errors.push(`Feuille "${sheetName}" : colonne auteur(s) introuvable par en-tête — détection par position (col. J par défaut). Vérifiez que les élèves sont bien identifiés.`);
      }

      const anneeFinale = anneeFromFile
        || records.find(r => r.annee && r.annee !== 'Inconnue')?.annee
        || 'Inconnue';
      records.forEach(r => { if (!r.annee || r.annee === 'Inconnue') r.annee = anneeFinale; });

      results.push({ type: sheetType, annee: anneeFinale, records, sheetName, count: records.length });
    }

    return { results, errors, filename };
  }

  return {
    parseCSVFile, parseXLSXSuivi, isSuiviXLSX, autoDetectCSV,
    classeDisplay, classeToNiveau, parseMotifs, parseDate,
    resoudreTypePunition, detectAnnee
  };
})();
