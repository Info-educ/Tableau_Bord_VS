// ═══════════════════════════════════════════════════════════
//  config.js — Constantes globales TDB Vie Scolaire V13
//  ⚠️  Ne déclarer chaque clé QU'UNE SEULE FOIS
// ═══════════════════════════════════════════════════════════

const CFG = {

  // ── Identité établissement
  etablissement: 'Tableau de Bord Vie Scolaire',

  // ── Lien vers le manuel (README du dépôt GitHub)
  //    Remplacer par l'URL réelle de votre dépôt, ex :
  //    'https://github.com/votre-compte/votre-depot/blob/main/README.md'
  readmeUrl: 'index.html',

  // ── Niveaux (ordre d'affichage)
  niveaux: ['6ème', '5ème', '4ème', '3ème'],

  // ── Mois de l'année scolaire (septembre → juin, 10 mois)
  mois: ['Sept.', 'Oct.', 'Nov.', 'Déc.', 'Janv.', 'Fév.', 'Mars', 'Avril', 'Mai', 'Juin'],
  moisDebut: 8,  // septembre = mois JS 8

  // ── 10 catégories de motifs (dans l'ordre)
  categories: [
    'Perturbation du cours / bavardage',
    'Insolence / irrespect / refus',
    'Violence verbale / menaces (entre élèves)',
    'Violence physique (entre élèves)',
    'Violence envers un adulte',
    'Harcèlement / pressions',
    'Numérique / réseaux sociaux / téléphone',
    'Dégradations / vols / sécurité',
    'Atteinte à la laïcité',
    'Non-respect du RI / autre'
  ],
  categoriesShort: [
    'Perturbation', 'Insolence', 'Viol. verbale', 'Viol. physique',
    'Viol. adulte', 'Harcèlement', 'Numérique', 'Dégradations',
    'Laïcité', 'Non-respect RI'
  ],

  // ── Palette années (jusqu'à 5 ans comparés)
  yearColors:   ['#f59e0b', '#06b6d4', '#ef4444', '#a855f7', '#10b981'],
  yearColorsBg: ['rgba(245,158,11,.14)', 'rgba(6,182,212,.14)', 'rgba(239,68,68,.14)', 'rgba(168,85,247,.14)', 'rgba(16,185,129,.14)'],

  // ── Palette niveaux
  niveauColors: [
    'rgba(59,130,246,.75)',   // 6ème — bleu
    'rgba(168,85,247,.75)',   // 5ème — violet
    'rgba(245,158,11,.75)',   // 4ème — ambre
    'rgba(16,185,129,.75)'    // 3ème — vert
  ],

  // ── Types de punitions Pronote → clé interne
  typesPunitions: {
    exclusion: ['exclusion temporaire de cours', 'exclusion de cours', 'exclusion du cours', 'exclusion temporaire'],
    retenue:   ['retenue'],
    devoir:    ['devoir supplémentaire', 'travail supplémentaire'],
    tig:       ['tig', 'travail d\'intérêt général'],
    autre:     []  // fallback
  },
  typesPunitionsLabels: {
    exclusion: 'Exclusions de cours',
    retenue:   'Retenues',
    devoir:    'Devoirs supplémentaires',
    tig:       'TIG',
    autre:     'Autres punitions'
  },
  typesPunitionsColors: {
    exclusion: '#ef4444',
    retenue:   '#f59e0b',
    devoir:    '#3b82f6',
    tig:       '#a855f7',
    autre:     '#6b7280'
  },

  // ── Feuilles reconnues dans le XLSX suivi
  suiviSheets: {
    incidents:    ['incident'],
    cd:           ['cdiscipline', 'cd'],
    ce:           ['comeduc', 'ce'],
    signalements: ['signtabs', 'signal'],
    faits:        ['faits-etab', 'faits_etab', 'faits etab', 'fait'],
    ip:           ['ip']
  },
  suiviLabels: {
    incidents:    'Incidents',
    cd:           'Conseils de discipline',
    ce:           'Commissions éducatives',
    faits:        'Faits établissement',
    signalements: 'Signalements absentéisme',
    ip:           'Informations préoccupantes'
  },
  suiviColors: {
    incidents:    '#ef4444',
    cd:           '#7c3aed',
    ce:           '#f59e0b',
    faits:        '#dc2626',
    signalements: '#0891b2',
    ip:           '#059669'
  },
  suiviIcons: {
    incidents:    '🚨',
    cd:           '⚖️',
    ce:           '🤝',
    faits:        '📋',
    signalements: '📬',
    ip:           '🔴'
  },

  // ── Seuil décrochage (dj NJ / mois)
  seuilDecrochage: 4,

  // ── Patterns de détection des fichiers CSV
  filePatterns: {
    absences:  ['absences', 'absence'],
    retards:   ['retards', 'retard'],
    punitions: ['punitions', 'punition'],
    sanctions: ['sanctions', 'sanction']
  },

  // ── Patterns de détection du fichier XLSX suivi
  suiviPattern: ['suivi', 'signalement', 'incident', 'discipline'],

  // ── Noms de colonnes CSV Pronote (référence)
  csvColumns: {
    absences:  { nom:'NOM', prenom:'PRENOM', classe:'CLASSES', motif:'MOTIF', dateDebut:'DATE DEBUT', demiJour:'DEMI JOUR', regle:'REGLE', etatJustif:'ETAT_JUSTIFICATION' },
    retards:   { nom:'NOM', prenom:'PRENOM', classe:'CLASSES', motif:'MOTIF', date:'DATE', regle:'REGLE' },
    punitions: { nom:'NOM', prenom:'PRENOM', classe:'CLASSES', motif:'MOTIF', date:'DATE', type:'PUNITION', demandeur:'DEMANDEUR' },
    sanctions: { nom:'NOM', prenom:'PRENOM', classe:'CLASSES', motif:'MOTIF', date:'DATE', type:'SANCTION', decideur:'DECIDEUR' }
  }
};
