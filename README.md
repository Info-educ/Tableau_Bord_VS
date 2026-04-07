# 📊 Tableau de Bord Vie Scolaire — Manuel d'utilisation

> **Version 13 — Déploiement en ligne possible — Données traitées localement**  
> Conforme RGPD : traitement local, aucune transmission réseau.

---

## Sommaire

1. [Présentation générale](#1-présentation-générale)
2. [Prérequis et lancement](#2-prérequis-et-lancement)
3. [Exports Pronote — fichiers CSV](#3-exports-pronote--fichiers-csv)
   - [3.1 Export Absences](#31-export-absences)
   - [3.2 Export Retards](#32-export-retards)
   - [3.3 Export Punitions](#33-export-punitions)
   - [3.4 Export Sanctions](#34-export-sanctions)
4. [Chargement des fichiers](#4-chargement-des-fichiers)
5. [Fichier Excel de suivi](#5-fichier-excel-de-suivi)
   - [5.1 CDiscipline](#51-feuille-cdiscipline--conseils-de-discipline)
   - [5.2 ComEduc](#52-feuille-comeduc--commissions-éducatives)
   - [5.3 SigntAbs](#53-feuille-signtabs--signalements-absentéisme)
   - [5.4 Faits-Etab](#54-feuille-faits-etab--faits-établissement)
   - [5.5 IP](#55-feuille-ip--informations-préoccupantes)
6. [Navigation dans le tableau de bord](#6-navigation-dans-le-tableau-de-bord)
7. [Résolution des problèmes fréquents](#7-résolution-des-problèmes-fréquents)
8. [Sécurité et conformité RGPD](#8-sécurité-et-conformité-rgpd)

---

## 1. Présentation générale

Le **Tableau de Bord Vie Scolaire** est un outil d'analyse des données comportementales et d'assiduité des élèves. Il fonctionne entièrement dans le navigateur (**Firefox** ou **Chrome** lorsqu'il est hébergé en HTTPS), sans aucune transmission de données vers un serveur externe.

### Conformité RGPD

| Garantie | Détail |
|---|---|
| ✅ Traitement local | Toutes les données restent en mémoire (RAM) pendant la session |
| ✅ Aucune transmission | Aucun fichier n'est envoyé sur un serveur |
| ✅ Effacement automatique | Les données sont effacées à la fermeture du navigateur |
| ✅ Sans cookie | Aucun stockage persistant des données élèves |

### Onglets disponibles

| Onglet | Contenu |
|---|---|
| **Synthèse** | Vue d'ensemble multi-indicateurs, comparaison inter-annuelle |
| **Absences** | Analyse par mois, classe, niveau, motif |
| **Retards** | Analyse par mois, classe, niveau, motif |
| **Punitions** | Analyse par type et motif |
| **Sanctions** | Analyse des sanctions disciplinaires |
| **Suivi** | Données Excel (CD, CE, incidents, faits, signalements, IP) |
| **Classes** | Tableau comparatif par classe |
| **Élèves** | Liste nominative des élèves les plus impliqués |
| **Mapping** | Gestion des catégories de motifs |
| **Paramètres** | Réinitialisation, année de référence |

---

## 2. Prérequis et lancement

### Navigateur compatible

> **Firefox** : toujours compatible (usage local `file://` ou hébergé).
> **Chrome** : compatible uniquement lorsque l'application est hébergée en HTTPS (ex. GitHub Pages). Incompatible en `file://`.

| Élément | Exigence |
|---|---|
| Navigateur | **Firefox** (toujours) ou **Chrome** (si hébergé en HTTPS) |
| Mode d'ouverture | Fichier local (double-clic sur `app.html`) |
| Connexion Internet | Non requise |
| Résolution recommandée | 1280 × 800 ou supérieure |

### Déploiement en ligne (GitHub Pages)

L'application peut être hébergée sur **GitHub Pages** pour un accès multi-postes :

1. Créer un dépôt GitHub et y pousser le contenu du dossier `TDB`.
2. Dans les paramètres du dépôt, activer **Pages** sur la branche `main`.
3. Renseigner l'URL du README dans `js/config.js` :
   ```js
   readmeUrl: 'https://github.com/votre-compte/votre-depot/blob/main/README.md'
   ```
4. Un lien **📖 Manuel d'utilisation** apparaît automatiquement sur l'écran de chargement.

> ✅ Aucune donnée élève n'est hébergée — chaque utilisateur charge ses propres fichiers depuis son poste.
> ✅ GitHub Pages force le HTTPS — Chrome devient compatible.


### Démarrage

1. Ouvrir le dossier `TDB` sur votre poste.
2. Double-cliquer sur **`app.html`**.
3. Le navigateur s'ouvre et affiche l'écran de chargement.
4. Charger vos fichiers (voir sections suivantes).
5. Cliquer sur **▶ Analyser les données**.

---

## 3. Exports Pronote — fichiers CSV

### Point commun à tous les exports

> Dans Pronote : **Imports/Exports → TXT/CSV**

- Sélectionner la **période souhaitée** (année scolaire complète recommandée).
- Format de sortie : **CSV avec séparateur point-virgule ( `;` )**.
- Encodage : **Windows-1252** (paramètre par défaut Pronote — ne pas modifier).

> ⚠️ Ne jamais ouvrir un fichier CSV dans Excel avant de le charger dans le TDB : cela corrompt l'encodage.

---

### 3.1 Export Absences

**Chemin dans Pronote :**

1. Aller dans **Vie scolaire → Absences**.
2. Cliquer sur le menu **Imports/Exports** (icône en haut de la liste).
3. Sélectionner **TXT/CSV → Export des absences**.
4. Choisir la période (ex : du 01/09/2024 au 30/06/2025).
5. Cliquer sur **Exporter**.
6. Enregistrer le fichier (ex : `absences_2024-2025.csv`).

**Colonnes attendues :**

| Colonne | Description |
|---|---|
| `NUMERO` | Numéro interne Pronote |
| `ID ELEVE` | Identifiant élève |
| `NOM` | Nom de famille |
| `PRENOM` | Prénom |
| `DATE NAISS` | Date de naissance *(ignorée par le TDB)* |
| `CLASSES` | Classe (ex : `4EME C`) |
| `MOTIF` | Motif déclaré |
| `DATE DEBUT` | Date de début d'absence |
| `DATE FIN` | Date de fin d'absence |
| `DEMI JOUR` | Durée en demi-journées |
| `REGLE` | Absence réglée ou non |
| `ETAT_JUSTIFICATION` | Justifiée / Non justifiée |

---

### 3.2 Export Retards

**Chemin dans Pronote :**

1. Aller dans **Vie scolaire → Retards**.
2. Cliquer sur le menu **Imports/Exports**.
3. Sélectionner **TXT/CSV → Export des retards**.
4. Choisir la période.
5. Cliquer sur **Exporter**.
6. Enregistrer le fichier (ex : `retards_2024-2025.csv`).

**Colonnes attendues :**

| Colonne | Description |
|---|---|
| `NUMERO` | Numéro interne |
| `NOM` | Nom de famille |
| `PRENOM` | Prénom |
| `DATE NAISS` | Date de naissance *(ignorée)* |
| `CLASSES` | Classe |
| `MOTIF` | Motif du retard |
| `REGLE` | Retard réglé ou non |
| `DATE` | Date du retard |
| `HEURE` | Heure d'arrivée |
| `DUREE` | Durée du retard |

---

### 3.3 Export Punitions

**Chemin dans Pronote :**

1. Aller dans **Vie scolaire → Punitions**.
2. Cliquer sur le menu **Imports/Exports**.
3. Sélectionner **TXT/CSV → Export des punitions**.
4. Choisir la période.
5. Cliquer sur **Exporter**.
6. Enregistrer le fichier (ex : `punitions_2024-2025.csv`).

> ⚠️ **Particularité :** Le fichier CSV contient deux types de lignes :
> - Des **lignes-classes** (totaux réels par élève)
> - Des **lignes-motifs** (détail par catégorie)
>
> Le TDB les distingue automatiquement. **Ne pas modifier le fichier brut.**

**Colonnes attendues :**

| Colonne | Description |
|---|---|
| `NUMERO` | Numéro interne |
| `NOM` | Nom de famille |
| `PRENOM` | Prénom |
| `DATE NAISS` | Date de naissance *(ignorée)* |
| `CLASSES` | Classe |
| `PUNITION` | Type (Retenue, Exclusion de cours…) |
| `DATE` | Date de la punition |
| `MOTIF` | Motif |
| `DEMANDEUR` | Enseignant ou personnel demandeur |

---

### 3.4 Export Sanctions

**Chemin dans Pronote :**

1. Aller dans **Vie scolaire → Sanctions**.
2. Cliquer sur le menu **Imports/Exports**.
3. Sélectionner **TXT/CSV → Export des sanctions**.
4. Choisir la période.
5. Cliquer sur **Exporter**.
6. Enregistrer le fichier (ex : `sanctions_2024-2025.csv`).

**Colonnes attendues :**

| Colonne | Description |
|---|---|
| `NUMERO` | Numéro interne |
| `NOM` | Nom de famille |
| `PRENOM` | Prénom |
| `DATE NAISS` | Date de naissance *(ignorée)* |
| `CLASSES` | Classe |
| `DATE` | Date de la sanction |
| `SANCTION` | Type de sanction |
| `MOTIF` | Motif |
| `DECIDEUR` | Chef d'établissement ou adjoint |

---

## 4. Chargement des fichiers

### Interface de chargement

Au lancement, l'écran de chargement présente une **zone de dépôt par type de fichier**.

**Deux méthodes (au choix) :**
- **Glisser-déposer** : faire glisser le fichier depuis l'explorateur vers la zone correspondante.
- **Clic** : cliquer sur la zone pour ouvrir le sélecteur de fichiers.

### Détection automatique du type

Le TDB reconnaît automatiquement chaque fichier :

- **Par le nom** : si le nom contient `absences`, `retards`, `punitions` ou `sanctions`, le type est détecté immédiatement.
- **Par les colonnes** : si le nom ne correspond pas, le TDB lit la première ligne du CSV.
- **Fichier Excel suivi** : reconnu grâce aux noms des feuilles (`CDiscipline`, `ComEduc`, `SigntAbs`…).

> 💡 **Conseil de nommage :**
> ```
> absences_2024-2025.csv
> retards_2024-2025.csv
> punitions_2024-2025.csv
> sanctions_2024-2025.csv
> suivi_2024-2025.xlsx
> ```

### Multi-années

Il est possible de charger des fichiers de **plusieurs années scolaires simultanément** pour la comparaison :
- L'année est détectée depuis le nom du fichier ou depuis les dates des données.
- Les graphiques en courbes permettent de comparer jusqu'à 5 années.
- Des filtres permettent de sélectionner une ou plusieurs années.

### Validation

- ✅ **Succès** : le nom du fichier apparaît dans la liste avec le type détecté.
- ❌ **Erreur** : un message précise la cause (colonnes manquantes, format non reconnu…).

> En cas d'erreur : vérifier que le fichier est un export Pronote brut, avec le séparateur `;`, et qu'il n'a pas été ouvert dans Excel au préalable.

---

## 5. Fichier Excel de suivi

Le fichier Excel de suivi regroupe des données complémentaires. Il doit contenir les feuilles suivantes :

| Feuille | Contenu |
|---|---|
| `Incidents` | Incidents — export depuis Pronote |
| `CDiscipline` | Conseils de discipline — copie depuis Pronote |
| `ComEduc` | Commissions éducatives — copie depuis Pronote |
| `SigntAbs` | Signalements absentéisme (export SIGNA) |
| `Faits-Etab` | Faits établissement (export ARENA / SIVIS) |
| `IP` | Informations préoccupantes |

> ⚠️ Les noms de feuilles doivent être **exactement** ceux indiqués ci-dessus (respect de la casse).

---

### 5.0  Feuille Incidents — Incidents

**Comment exporter depuis Pronote :**

1. Dans Pronote, aller dans **Incidents → Saisie des incidents**.
2. **Décocher** la case **"Uniquement les incidents non réglés"** pour obtenir tous les incidents de la période.
3. Sélectionner la période souhaitée.
4. Cliquer sur le menu **Imports/Exports → TXT/CSV → Export des incidents**.
5. Enregistrer le fichier (ex : `incidents_2024-2025.csv`).
6. Ouvrir ce fichier et copier les données dans la feuille `Incidents` du fichier suivi.

> ⚠️ Si la case "Uniquement les incidents non réglés" reste cochée, les incidents déjà traités n'apparaîtront pas dans l'export.

---

### 5.1 Feuille CDiscipline — Conseils de discipline

**Comment récupérer les données depuis Pronote :**

1. Dans Pronote, aller dans **Discipline → Conseil de discipline**.
2. Sélectionner la période souhaitée.
3. **Copier-coller** le tableau affiché dans la feuille `CDiscipline` du fichier suivi.

**Structure (en-têtes ligne 1 et 2, données à partir de la ligne 3) :**

| Colonne | Contenu |
|---|---|
| A | Libellé fixe `Conseil de discipline` |
| B | Date et heure (ex : `04/12/2025 de 17:00 à 18:00`) |
| C | Identité du président de séance |
| D | Prénom Nom de l'élève convoqué |
| E | Motif du conseil |
| F | Nombre de membres – Personnels |
| G | Nombre de membres – Professeurs |
| H | Nombre de membres – Responsables |
| I | Nombre de membres – Élèves |

---

### 5.2 Feuille ComEduc — Commissions éducatives

**Comment récupérer les données depuis Pronote :**

1. Dans Pronote, aller dans **Discipline → Commissions éducatives**.
2. Sélectionner la période souhaitée.
3. **Copier-coller** le tableau affiché dans la feuille `ComEduc` du fichier suivi.

**Structure (en-têtes ligne 1 et 2, données à partir de la ligne 3) :**

| Colonne | Contenu |
|---|---|
| A | Libellé fixe `Commission éducative` |
| B | Date et heure |
| C | Identité du président |
| D | Prénom Nom de l'élève convoqué |
| E | Motif de convocation |
| F–I | Nombre de membres par catégorie |
| J | Publication carnet de correspondance (`Oui` / `Non`) |

---

### 5.3 Feuille SigntAbs — Signalements absentéisme

Cette feuille correspond à l'export de l'application **SIGNA** (portail ARENA). C'est un tableau agrégé **(actions × mois)**, non une liste individuelle.

**Comment obtenir les données :**

1. Se connecter au portail **ARENA** de l'académie.
2. Accéder à l'application **SIGNA**.
3. Aller dans **Tableau de bord → Export**.
4. Télécharger le fichier au format Excel.
5. Copier le contenu dans la feuille `SigntAbs` du fichier suivi.

**Structure :**

| Colonne | Contenu |
|---|---|
| A | Thème de l'action |
| B | Type d'action (ex : `Appel téléphonique`) |
| C–K | Informations établissement (académie, UAI…) |
| L–W | Nombre d'actions par mois (Septembre → Août) |

---

### 5.4 Feuille Faits-Etab — Faits établissement

**Comment exporter depuis ARENA (application SIVIS) :**

1. Se connecter au portail **ARENA** de l'académie.
2. Accéder à l'application **SIVIS** (Système d'Information et de Vigilance sur la Sécurité scolaire).
3. Aller dans le module **Faits établissement**.
4. Cliquer sur **Synthèse** (en haut de l'écran).
5. **Sélectionner la période** souhaitée (date de début / date de fin).
6. Cliquer sur **Export**.
7. Choisir : **Nombre de faits / Type de faits**.
8. Enregistrer le fichier exporté.
9. Ouvrir ce fichier et copier les données dans la feuille `Faits-Etab` du fichier suivi.

**Structure du fichier exporté :**

> ⚠️ Les données Faits-Etab utilisent un **séparateur pipe ( `|` )** et non le point-virgule. Ne pas modifier ce format — le TDB le détecte automatiquement.

| Champ | Contenu |
|---|---|
| `TYPE FAIT ATTEINTES` | Catégorie principale du fait |
| `TYPE FAIT` | Sous-catégorie (ex : `Intrusion`, `Port d'arme`) |
| `GRAVITE` | Niveau de gravité (Niveau 1 à 3) |
| `ANNEE-MOIS` | Mois du fait au format `AAAA-MM` (ex : `2026-01`) |
| `TOTAL` | Nombre de faits |

Exemple de ligne :
```
Atteintes à la sécurité|"Intrusion"|"Niveau 3 : fait(s) d'une extrême gravité"|"2026-01"|"1"
```

---

### 5.5 Feuille IP — Informations préoccupantes

Tableau agrégé mensuel du nombre d'informations préoccupantes transmises.

**Structure :**

| Colonne | Contenu |
|---|---|
| A | Libellé (ex : `Nb`) |
| B–L | Nombre d'IP par mois (Septembre → Juin) |

> Renseigner le nombre d'IP transmises pour chaque mois. Les cases vides sont interprétées comme zéro.

---

## 6. Navigation dans le tableau de bord

### Filtres globaux

- **Année(s) scolaire(s)** : sélectionner une ou plusieurs années pour la comparaison.
- **Période (mois)** : glisser le sélecteur pour restreindre l'analyse à une période.
- **Niveau / Classe / Élève** : filtres disponibles dans les onglets spécifiques.

### Onglet Élèves

L'onglet **Élèves** affiche la liste nominative des élèves les plus impliqués sur la période sélectionnée. Il est accessible directement, sans code PIN.

> ℹ️ Les données sont traitées localement dans votre navigateur — aucune transmission réseau.

### Onglet Mapping — Catégories de motifs

Le mapping associe les motifs Pronote aux **10 catégories d'analyse**. Cette configuration est **mémorisée entre les sessions**.

- Modifier les associations selon les pratiques de l'établissement.
- **Exporter** le mapping en JSON pour le sauvegarder.
- **Importer** un mapping JSON précédemment exporté.
- **Réinitialiser** pour revenir aux valeurs par défaut.

### Nouvelle session

À chaque ouverture, les **données doivent être rechargées** (aucun stockage RGPD). Seul le mapping des motifs est conservé.

---

## 7. Résolution des problèmes fréquents

| Problème | Solution |
|---|---|
| Le fichier n'est pas reconnu | Vérifier que c'est un export Pronote brut non modifié dans Excel. Vérifier le séparateur `;`. |
| Caractères illisibles (accents) | Ne pas ouvrir le CSV dans Excel avant chargement. L'encodage Windows-1252 est géré automatiquement. |
| L'application ne s'ouvre pas en local | Utiliser **Firefox**. Chrome bloque les fichiers JS locaux (`file://`). En ligne (HTTPS), Chrome fonctionne normalement. |
| Une feuille Excel n'est pas reconnue | Vérifier le nom exact de la feuille : `CDiscipline`, `ComEduc`, `SigntAbs`, `Faits-Etab`, `IP`. |
| Le filtre d'année ne change pas | Cliquer sur un autre onglet puis revenir, ou recharger les données. |
| Les totaux des punitions semblent doublés | Ne pas modifier le CSV Pronote. Le TDB gère la distinction lignes-classes / lignes-motifs automatiquement. |
| L'onglet Classes n'affiche pas certains élèves | Les élèves sans classe identifiée (CD, IP, faits) sont exclus volontairement de cet onglet. |

---

## 8. Sécurité et conformité RGPD

> Les données traitées (absences, retards, punitions, sanctions, identité des élèves) sont des **données à caractère personnel** soumises au RGPD.

| Point de vigilance | Mesure |
|---|---|
| Traitement des données | Exclusivement local, dans la RAM du poste — aucune transmission réseau |
| Accès | Réservé aux personnels habilités (équipe de direction, CPE) |
| Poste utilisateur | Doit être protégé par un mot de passe de session |
| Fichiers source (CSV, Excel) | À stocker dans un espace sécurisé et à accès restreint |
| Durée de conservation en mémoire | Session uniquement — effacement automatique à la fermeture |
| Accès nominatif (onglet Élèves) | Accessible directement — usage réservé aux personnels habilités |
| Usage sur poste partagé | **Strictement interdit** |


---

*Document à usage interne exclusivement — Tableau de Bord Vie Scolaire V12*
