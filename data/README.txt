======================================================
  TDB Vie Scolaire V12 — Dossier DATA
======================================================

Ce dossier est un emplacement de référence.
Les fichiers de données ne sont PAS déposés ici :
ils sont chargés directement depuis l'interface
par glisser-déposer ou sélection de fichier.

Aucune donnée n'est stockée sur le disque par l'application.
Toutes les données restent en mémoire (RAM) le temps
de la session, puis sont effacées à la fermeture.

→ Conformité RGPD assurée.

======================================================
  FORMATS ATTENDUS
======================================================

CSV (séparateur ; encodage windows-1252) :
  - Absences   : NUMERO;ID ELEVE;NOM;PRENOM;DATE NAISS;CLASSES;MOTIF;DATE DEBUT;DATE FIN;DEMI JOUR;REGLE;ETAT_JUSTIFICATION
  - Retards    : NUMERO;NOM;PRENOM;DATE NAISS;CLASSES;MOTIF;REGLE;DATE;HEURE;DUREE
  - Punitions  : NUMERO;NOM;PRENOM;DATE NAISS;CLASSES;PUNITION;DATE;MOTIF;DEMANDEUR
  - Sanctions  : NUMERO;NOM;PRENOM;DATE NAISS;CLASSES;DATE;SANCTION;MOTIF;DECIDEUR

XLSX (fichier suivi) :
  Feuilles reconnues :
  - CDiscipline  → Conseils de discipline
  - ComEduc      → Commissions éducatives
  - SigntAbs     → Signalements absentéisme
  - Faits-Etab   → Faits établissement (format SIVIS)
  - IP           → Informations préoccupantes
  - Incidents    → Incidents (même structure que CSV Pronote)

======================================================
