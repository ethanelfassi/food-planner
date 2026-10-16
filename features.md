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
- [x] **Photos de produits & Liens directs canoniques Metro.ca** : Chaque article affiche sa photo de référence et un lien direct vers la fiche produit officielle Metro.ca (ex. `metro.ca/epicerie-en-ligne/allees/.../p/[sku]`) pour vérifier en temps réel le prix, le format et les disponibilités en magasin sans passer par une recherche intermédiaire.
- [x] **Design Haute Horlogerie & Interface Hybride (Éditorial Nordic + Apple Fitness)** :
  - **Typographie éditoriale** : Titrage serif raffiné inspiré des revues culinaires scandinaves (*Newsreader serif*).
  - **Ergonomie sportive Apple Fitness+** : Anneaux de progression, pillules de macros denses, typographie monospace tubulaire pour les chiffres d'épicerie et les calories.
  - **Liquid Glass & Glassmorphism** : Effets de verre dépoli ultra-fin (`backdrop-blur-2xl`, bordures spéculaires et ombres subtiles).
  - **Mode Jour / Nuit en 1 clic** : Bascule instantanée entre *Linge naturel écru & papier chaud* (#FAF8F5) et *Noir obsidienne velouté* (#0B0C0E).
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