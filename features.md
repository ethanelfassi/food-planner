# 📋 Spécifications & Roadmap des Fonctionnalités (FoodPlanner QC)

Ce document répertorie l'ensemble des fonctionnalités de l'application, distinguant celles déjà opérationnelles dans le MVP et celles planifiées pour les versions ultérieures.

---

## 🚀 1. Fonctionnalités Déjà Implémentées dans le MVP

### A. Planification Nutritionnelle & Recettes
- [x] **Programme hebdomadaire calibré prise de masse** : Cibles journalières de **~3 050 kcal** et **~165 g de protéines** adaptées au profil (21 ans, 75 kg, 175 cm, 5 entraînements/semaine).
- [x] **100 % Aliments complets** : Aucun supplément ou shaker requis. Focus sur des aliments denses québécois (bœuf haché maigre, poulet, saumon glacé à l'érable, gruau riche au beurre d'arachide naturel, omelettes complètes au cheddar fort québécois, bagels de Montréal, fromage cottage et yogourt grec Liberté).
- [x] **Rythme de cuisine du soir & restes automatiques** : Préparation chaque soir d'un plat chaud calibré pour 2 portions. La 2e portion devient automatiquement le dîner du lendemain midi, évitant de cuisiner deux fois par jour.
- [x] **Fiches recettes détaillées & modal interactif** : Ingrédients précis, temps de cuisson, répartition macro (Calories, Protéines, Glucides, Lipides) et étapes de préparation.
- [x] **Régénération & substitution de repas** : Possibilité de changer un repas individuel par une alternative de même catégorie ou de régénérer la semaine entière.
- [x] **Priorisation active des promotions et des offres Membre Moi** : L'algorithme favorise automatiquement les repas composés des ingrédients en rabais cette semaine chez Metro.

### B. Épicerie Intelligente, Prix Exacts & Supermarché Metro Québec
- [x] **Consolidation automatique de l'épicerie** : Calcul des quantités cumulées sur 7 jours avec conversion vers les formats de vente réels (ex. *3x Paquet club ~600g*, *boîtes de 12 ou 18 œufs*, *pots de yogourt 750g*).
- [x] **Prix exacts au centime près** : Chaque article affiche son tarif exact appliqué chez Metro (intégrant les rabais actuels).
- [x] **Prix aux 100g / 100ml / unité** : Calcul et affichage automatique du prix unitaire (ex. `2.00 $ / 100g` pour le poulet, `0.35 $ / œuf`, `0.73 $ / 100g` pour le yogourt grec) pour comparer la valeur réelle en rayon.
- [x] **Prix pour les Membres Moi de Metro** : Badge exclusif 👑 et calcul des économies réalisées grâce au programme de fidélité Moi (ex. bœuf haché à 5.49$ au lieu de 7.99$, yogourt grec à 5.49$ au lieu de 6.99$).
- [x] **Calcul fiscal exact Revenu Québec (TPS 5% & TVQ 9.975%)** :
  - Identification automatique des **aliments de base détaxés à 0 %** (viandes, poissons, produits laitiers, légumes, fruits, pain, avoine, riz, etc.).
  - Application stricte des taxes de **14,975 %** sur les produits taxables (articles de maison, produits ménagers).
  - Ticket de caisse exact indiquant le sous-total détaxé, le sous-total taxable, la TPS, la TVQ et le montant final à payer à la caisse.
- [x] **Tri par rayons physiques de supermarché** : Organisation dans l'ordre de circulation d'un Metro québécois (Fruits & Légumes $\rightarrow$ Boulangerie $\rightarrow$ Boucherie/Poissonnerie $\rightarrow$ Produits laitiers $\rightarrow$ Épicerie & Féculents $\rightarrow$ Surgelés).
- [x] **Contrôle Qualité & Liens Metro.ca Vérifiés (Zéro 404)** : Liens officiels vers l'épicerie en ligne Metro.ca (`metro.ca/epicerie-en-ligne/recherche?filter=...`) garantissant l'accès direct et infaillible à la fiche produit en stock dans la région de l'utilisateur, avec photo, prix exact et bouton d'ajout au panier sans page introuvable ni erreur de catégorie.
- [x] **Design Haute Horlogerie & Interface Hybride (Architecture Scandinave + Pure Monochrome)** :
  - **Typographie éditoriale** : Titrage serif raffiné inspiré des revues culinaires scandinaves (*Newsreader serif*).
  - **Ergonomie sportive & financière Apple** : Jauges de progression, pillules de métabolisme denses, typographie monospace tubulaire pour les chiffres d'épicerie et les calories.
  - **Éradication Totale des Couleurs Flashy / Verts / Jaunes / Néons** : Palette purement architecturale monochrome & titane (graphite `#111827`, titanium `#18181B`, ardoise `#71717A`, albâtre `#F7F7F6` et blanc pur). Zéro vert, jaune, ambre ou néon artificiel.
  - **Mode Jour Parfait (Pristine Alabaster Gallery)** : Fond albâtre propre (`#F7F7F6`, suppression du ton lin chaud/jaunâtre), cartes blanches immaculées avec bordures ultra-fines (`#E5E5E5`), contrastes noirs profonds garantissant une lisibilité absolue.
  - **Liquid Glass & Glassmorphism Épuré** : Effets de verre dépoli haute définition (`backdrop-blur-2xl`, bordures spéculaires et ombres feutrées).
  - **Mode Jour / Nuit en 1 clic** : Bascule instantanée réactive avec persistance `localStorage` entre *Albâtre Galerie Scandinave* (`#F7F7F6`) et *Obsidienne Verre Liquide* (`#0B0C0E`).
- [x] **Ajout d'articles personnels avec statut de taxe** : Saisie d'articles hors-recettes (produits ménagers, café, essuie-tout) avec attribution de rayon, prix et case à cocher pour la taxation.
- [x] **Checklist interactive en magasin** : Cases à cocher avec filtres (*Tous*, *À acheter*, *Cochés*) et réinitialisation en un clic.

### C. Mode Couple & Répartition Équitable des Courses
- [x] **Prise en charge de deux personnes aux régimes distincts** : Ethan (sportif en prise de masse à 3 050 kcal / 165g prot) et sa copine (~1 950 kcal / 75g prot, alimentation plus légère).
- [x] **Calculateur de part exacte sur la facture d'épicerie** : Calcul au centime près du montant dû par chacun en pondérant la surconsommation sportive (Ethan prend en charge ~70% du budget boucherie et ~65% des produits laitiers protéinés).
- [x] **Visualisation graphique de répartition** : Jauge proportionnelle en pourcentage et montant en dollars CAD avec explication détaillée du partage.

### D. Calorie & Macro Tracker Intégré
- [x] **Suivi en temps réel de la journée** : Repas prévus cochables dès qu'ils sont consommés.
- [x] **Jauges de progression dynamiques** : Affichage visuel des calories et protéines consommées par rapport à la cible quotidienne (3 050 kcal / 165 g).
- [x] **Ajout d'extras et collations libres** : Possibilité de consigner des ajouts ponctuels (+kcal, +protéines).
- [x] **Indicateur de statut sportif** : Alertes motivantes selon l'atteinte du quota de protéines journalier.

### E. Intelligence de Prix, Programme Moi & Circulaires
- [x] **Comparateur multi-enseignes** : Comparaison instantanée de la facture du panier entre **Metro**, **Maxi**, **Super C** et **IGA** pour mesurer les écarts de prix.
- [x] **Mise en valeur des rabais circulaires du jeudi** : Identification des protéines et produits vedettes en solde (poitrine club, saumon, thon).
- [x] **Tableau de bord des économies Membre Moi** : Montant total épargné affiché en évidence sur le panier et le comparateur.

### F. Export Mobile Hors-Ligne (Self-Hosted / Réseau Local)
- [x] **Copie presse-papier formatée avec ticket complet** : Prêt pour coller en 1 clic dans Apple Notes ou Google Keep avec cases `[ ]`, prix aux 100g et total TTC.
- [x] **Téléchargement .txt autonome** : Fichier texte léger ouvrable sans connexion réseau au supermarché.
- [x] **Envoi par courriel en 1 clic** : Génération de lien `mailto:` pré-rempli avec ventilation fiscale.

### G. Base de Données Locale SQLite & Gestion des Préférences d'Achat (J'aime / Ne pas acheter)
- [x] **Moteur de Base de Données Embarqué SQLite (`node:sqlite`)** :
  - Utilisation du moteur natif haute performance `node:sqlite` (`DatabaseSync` de Node.js 24).
  - Stockage local et autonome dans `data/food_planner.sqlite` (zéro dépendance externe C++, zéro cloud requis, idéal pour hébergement local / serveur maison).
  - Structure relationnelle avec table `product_preferences` (ingrédient, statut `liked` | `disliked` | `neutral`, horodatage) et `custom_products`.
- [x] **Catalogue & Onglet Dédié « Préférences »** :
  - Visualisation de l'ensemble du catalogue d'ingrédients avec recherche textuelle instantanée et filtre par rayon physique.
  - Sélecteur 3 états ergonomique pour chaque produit : **« J'aime »** (Favori), **« Neutre »**, ou **« Exclure »** (Bannir des recettes et de l'épicerie).
  - Compteurs dynamiques en temps réel (Total, Produits aimés, Produits exclus, Non spécifiés).
  - Témoin visuel de synchronisation SQLite avec notification toast discrète à chaque sauvegarde.
- [x] **Contrôles Rapides Directs dans l'Épicerie et les Fiches Recettes** :
  - Boutons d'action rapides (Cœur / Interdit) directement sur chaque carte d'article de la liste d'épicerie pour marquer ou exclure un ingrédient en un clic.
  - Badges visuels élégants `★ Favori` et `🚫 Exclu`.
  - Contrôles de préférence intégrés dans le modal des détails de chaque recette.
- [x] **Moteur d'Algorithme & Planificateur Réactif** :
  - **Exclusion stricte** : Toute recette contenant ne serait-ce qu'un seul ingrédient marqué « Exclure / Ne pas acheter » est automatiquement éliminée des propositions et de la semaine.
  - **Priorisation des favoris** : Bonus de score algorithmique (+15 points par ingrédient aimé) pour composer les semaines avec les produits préférés de l'utilisateur.
  - **Régénération dynamique automatique** : Dès qu'un ingrédient est banni, le menu hebdomadaire et la liste de courses sont recalculés instantanément pour éliminer l'article indésirable sans rechargement.

### H. Personnalisation Totale des Variables Métaboliques, des Prix & du Budget Hebdomadaire
- [x] **Contrôle Intégral des Variables Métaboliques & Macro-Nutriments** :
  - Sliders interactifs et entrées numériques précises pour ajuster les calories quotidiennes (ex. 1 800 à 4 500 kcal), les protéines (50 à 250 g), les glucides et les lipides.
  - Sélection d'objectif sportif en 1 clic : *Prise de masse athlétique*, *Prise de masse propre*, *Maintien sportif & performance*, ou *Sèche & affûtage*.
  - Répercussion dynamique instantanée dans le bandeau d'en-tête (Header), le Planificateur Hebdomadaire et le Tracker de Calories.
- [x] **Personnalisation du Métabolisme Partenaire (Mode Couple Dynamique)** :
  - Ajustement des cibles caloriques et protéiques de la conjointe / du colocataire.
  - Recalcul dynamique du coefficient d'approvisionnement des courses et ventilation équitable de la boucherie et des produits laitiers basée sur les ratios protéiques réels.
- [x] **Budget Hebdomadaire Cible & Jauge de Dépassement** :
  - Fixation d'un plafond budgétaire hebdomadaire pour l'épicerie (ex. 135 $ CAD).
  - Barre de progression monochromatique scandinave intégrée au ticket de caisse officiel Metro : pourcentage engagé, reste disponible ou dépassement calculé en temps réel.
- [x] **Surcharge et Personnalisation des Prix d'Épicerie au Produit Près** :
  - Possibilité de remplacer le prix officiel Metro d'un article par son propre prix d'achat réel (ex. rabais flash en succursale, achat club ou boucher local).
  - Bouton de modification rapide `✏️` disponible dans le catalogue des préférences et directement sur chaque carte d'article de la liste d'épicerie.
  - Modal dédié permettant d'entrer son tarif au paquet et recalcul automatique immédiat du prix au 100g, des taxes et du total final.
  - Bouton « Rétablir prix Metro » en 1 clic pour réinitialiser le tarif officiel.
- [x] **Persistance 100% Locale en Base de Données SQLite** :
  - Création des tables `custom_prices` et `app_settings` dans `data/food_planner.sqlite`.
  - Sauvegarde immédiate lors de chaque modification et rechargement automatique transparent au démarrage sans aucune perte de données.

### I. Système Multi-Comptes & Liste d'Épicerie Commune (Partagée)
- [x] **Comptes et Profils Indépendants en 1 Clic** :
  - Profils par défaut créés pour **Ethan** et **Copine**, avec possibilité d'ajouter de nouveaux profils ou de les renommer en un clic (sans mot de passe ni friction).
  - Sélecteur de profil intégré au bandeau d'en-tête (Header) avec badge initiales et menu déroulant fluide.
- [x] **Objectifs Métaboliques et Préférences Dédiés par Profil** :
  - Chaque profil possède ses propres cibles de calories, protéines, glucides, lipides et budget hebdomadaire (ex. Ethan : 3 050 kcal / 165g P ; Copine : 1 950 kcal / 75g P).
  - Chaque profil a son propre catalogue de préférences produits (aliments aimés, neutres, ou exclus).
- [x] **Planification Hebdomadaire & Tracker Spécifiques à Chaque Compte** :
  - Menu de recettes composé selon les goûts et le gabarit de la personne sélectionnée.
  - Suivi calorique du jour synchronisé avec les repas du profil actif.
- [x] **Liste d'Épicerie Commune (Partagée) & Listes Individuelles** :
  - Sélecteur de vue instantané : **« Liste Commune (Partagée) »**, **« Liste d'Ethan »**, **« Liste de Copine »**.
  - **Fusion intelligente des emballages** : Les ingrédients communs sont consolidés en formats réels de vente sans acheter des paquets en double.
  - **Badges d'attribution sur les fiches produits** : Identification visuelle immédiate des articles `Commun (Ethan & Copine)` ou `Pour [Nom]`.
  - **Ventilation Équitable du Ticket Partagé** : Calcul au prorata exact des portions consommées par chacun, avec calcul fiscal (TPS/TVQ) et montant net à rembourser.
  - Ajout d'articles manuels avec attribution au choix : pour tout le monde ou pour un profil spécifique.
- [x] **Persistance Complète en Base SQLite** :
  - Tables relationnelles `accounts`, `account_preferences` et `account_settings` dans `food_planner.sqlite`.

---

## 🔮 2. Fonctionnalités Prévues pour la Version Finale (Roadmap)

### A. Synchronisation Données Réelles & Circulaires Live
- [ ] **Scraping / API des prix Metro en temps réel** : Récupération des prix exacts à la cenne près selon la succursale Metro sélectionnée (code postal québécois).
- [ ] **Connecteur Circulaires Flipp / Reebee** : Mise à jour automatique des rabais chaque jeudi matin pour réajuster le menu selon les meilleures affaires de la semaine.
- [ ] **Génération directe de panier en ligne** : Exportation de la liste d'épicerie directement dans le panier du compte client Metro.ca (via script d'automatisation ou extension de navigateur).

### B. Personnalisation Avancée & Multi-Profils
- [ ] **Gestionnaire de profils dynamique** : Interface permettant de créer, modifier et enregistrer n'importe quel profil (poids, taille, objectif calorique, intolérances comme lactose ou gluten).
- [ ] **Gestion fine des préférences culinaires de couple** : Définition des aliments exclus pour l'un ou l'autre (ex. repas commun où la viande est cuisinée à part, ou plats végétariens pour l'un et carnés pour l'autre).
- [ ] **Historique de dépenses partagées** : Suivi mensuel de la facture d'épicerie et historique des virements Interac recommandés entre partenaires.

### C. Gestion du Garde-Manger & Anti-Gaspillage
- [ ] **Inventaire du frigo / garde-manger (Pantry Tracker)** : Indiquer les ingrédients déjà en stock à la maison pour les déduire automatiquement de la liste d'épicerie.
- [ ] **Module DLC (Dates Limites de Consommation)** : Alertes pour consommer en priorité les viandes fraîches achetées en début de semaine.

### D. Importation de Recettes & Extension
- [ ] **Importateur Web de recettes** : Coller une URL (Ricardo, Trois Fois Par Jour, Marmiton) pour extraire automatiquement les ingrédients, calculer les macros et les intégrer au planificateur.
- [ ] **Application mobile native / PWA installable** : Notification de rappel pour sortir les portions du congélateur ou lancer la cuisson du soir.