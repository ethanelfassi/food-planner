'use client';

import React, { useState, useMemo, useDeferredValue } from 'react';
import { Recipe, MealType, ProductPreferencesMap } from '@/types';
import { INGREDIENTS } from '@/data/ingredients';
import { calculateRecipeScore } from '@/lib/planner';
import { 
  ChefHat, 
  Plus, 
  Search, 
  CalendarPlus, 
  Clock, 
  Flame, 
  Dumbbell, 
  Pencil, 
  Trash2, 
  Eye, 
  Check, 
  Sparkles, 
  UtensilsCrossed, 
  Database, 
  Coffee, 
  Sun, 
  Moon, 
  Zap, 
  X,
  Wheat,
  Droplet,
  Tag,
  ScanBarcode
} from 'lucide-react';

interface RecipeBookViewProps {
  allRecipes: Recipe[];
  customRecipes: Recipe[];
  preferences?: ProductPreferencesMap;
  isDark: boolean;
  onSelectRecipe: (recipe: Recipe) => void;
  onOpenRecipeCreator: () => void;
  onOpenBarcodeModal?: () => void;
  onEditRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipeId: string) => void;
  onPlanRecipeToDay: (dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', recipeId: string) => void;
}

const DAYS = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];

const RecipeBookViewComponent: React.FC<RecipeBookViewProps> = ({
  allRecipes,
  customRecipes,
  preferences = {},
  isDark,
  onSelectRecipe,
  onOpenRecipeCreator,
  onOpenBarcodeModal,
  onEditRecipe,
  onDeleteRecipe,
  onPlanRecipeToDay,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [mealTypeFilter, setMealTypeFilter] = useState<'all' | MealType>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'custom' | 'curated'>('all');
  const [planningRecipe, setPlanningRecipe] = useState<Recipe | null>(null);
  const [targetDayIndex, setTargetDayIndex] = useState(0);
  const [targetMealSlot, setTargetMealSlot] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('dinner');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const cardGlassClass = isDark
    ? 'liquid-glass text-stone-100 hover:border-white/20'
    : 'liquid-glass-light text-stone-900 hover:border-stone-400/80';

  // Filtrage des recettes
  const filteredRecipes = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return allRecipes.filter((recipe) => {
      // 1. Filtre par type de repas
      if (mealTypeFilter !== 'all') {
        if (mealTypeFilter === 'souper' && recipe.mealType !== 'souper' && recipe.mealType !== 'diner') {
          return false;
        } else if (mealTypeFilter === 'diner' && recipe.mealType !== 'diner' && recipe.mealType !== 'souper') {
          return false;
        } else if (mealTypeFilter !== 'souper' && mealTypeFilter !== 'diner' && recipe.mealType !== mealTypeFilter) {
          return false;
        }
      }

      // 2. Filtre par origine (custom vs curated)
      if (sourceFilter === 'custom' && !recipe.isCustom) return false;
      if (sourceFilter === 'curated' && recipe.isCustom) return false;

      // 3. Recherche textuelle
      if (q) {
        const matchesTitle = recipe.title.toLowerCase().includes(q);
        const matchesTag = recipe.tags?.some((t) => t.toLowerCase().includes(q));
        const matchesIngredient = recipe.ingredients?.some((item) => {
          const ing = INGREDIENTS[item.ingredientId];
          return ing && ing.name.toLowerCase().includes(q);
        });

        if (!matchesTitle && !matchesTag && !matchesIngredient) return false;
      }

      return true;
    });
  }, [allRecipes, mealTypeFilter, sourceFilter, deferredSearch]);

  // Estimation du coût par portion
  const getRecipeCostPerServing = (recipe: Recipe): number => {
    let totalCost = 0;
    for (const item of recipe.ingredients) {
      const ing = INGREDIENTS[item.ingredientId];
      if (ing) {
        const pkg = ing.packaging;
        const exactPrice = pkg.exactPriceMetro;
        const totalAmount = pkg.amount;
        if (totalAmount > 0) {
          const itemCost = (item.quantity / totalAmount) * exactPrice;
          totalCost += itemCost;
        }
      }
    }
    const servings = Math.max(1, recipe.servings || 1);
    return Math.round((totalCost / servings) * 100) / 100;
  };

  const handleOpenPlanning = (recipe: Recipe) => {
    setPlanningRecipe(recipe);
    // Déterminer le créneau suggéré par défaut
    if (recipe.mealType === 'dejeuner') {
      setTargetMealSlot('breakfast');
    } else if (recipe.mealType === 'collation') {
      setTargetMealSlot('snack');
    } else if (recipe.mealType === 'diner') {
      setTargetMealSlot('lunch');
    } else {
      setTargetMealSlot('dinner');
    }
  };

  const handleConfirmPlanning = () => {
    if (!planningRecipe) return;

    onPlanRecipeToDay(targetDayIndex, targetMealSlot, planningRecipe.id);
    const dayName = DAYS[targetDayIndex];
    const slotLabel =
      targetMealSlot === 'breakfast'
        ? 'Déjeuner'
        : targetMealSlot === 'lunch'
        ? 'Dîner'
        : targetMealSlot === 'dinner'
        ? 'Souper'
        : 'Collation';

    setToastMessage(`« ${planningRecipe.title} » planifié pour ${dayName} (${slotLabel})`);
    setPlanningRecipe(null);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-stone-900 text-stone-50 dark:bg-white dark:text-stone-950 shadow-2xl border border-stone-800 dark:border-white font-mono text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header Éditorial */}
      <div
        className={`rounded-2xl sm:rounded-3xl p-4 sm:p-8 transition-all ${
          isDark ? 'liquid-glass' : 'liquid-glass-light'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-stone-700 dark:text-stone-300 font-semibold flex items-center gap-1.5">
                <ChefHat className="w-3.5 h-3.5" /> Répertoire Culinaire
              </span>
              <span className="text-stone-400 text-xs">•</span>
              <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 font-sans">
                {allRecipes.length} plats indexés ({customRecipes.length} créés maison)
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-4xl font-normal tracking-tight text-stone-900 dark:text-white">
              Livre de Plats & <span className="italic font-light">Recettes Personnalisées</span>
            </h1>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-2 max-w-2xl font-sans leading-relaxed">
              Consultez, modifiez, supprimez et créez vos propres repas favoris à partir des produits exacts de Metro. Vous pouvez planifier n'importe quel plat directement dans votre semaine en un clic.
            </p>
          </div>

          {/* Boutons d'Action : Créer Repas & Ajouter Code-barres */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            {onOpenBarcodeModal && (
              <button
                onClick={onOpenBarcodeModal}
                className={`flex-1 lg:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-mono uppercase tracking-wider transition-all border font-semibold active:scale-95 shadow-md ${
                  isDark
                    ? 'bg-white/10 text-white hover:bg-white/15 border-white/15'
                    : 'bg-white text-stone-900 hover:bg-stone-50 border-stone-300 shadow-xs'
                }`}
                title="Scanner ou entrer un code-barres pour ajouter un produit à la base"
              >
                <ScanBarcode className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="truncate">+ Code-barres</span>
              </button>
            )}

            <button
              onClick={onOpenRecipeCreator}
              className={`flex-1 lg:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-mono uppercase tracking-wider transition-all border font-semibold active:scale-95 shadow-lg ${
                isDark
                  ? 'bg-white text-stone-950 hover:bg-stone-200 border-white shadow-black/40'
                  : 'bg-stone-900 text-stone-50 hover:bg-stone-800 border-stone-900 shadow-stone-900/10'
              }`}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="truncate">Créer un Repas</span>
            </button>
          </div>
        </div>

        {/* Barre de Recherche & Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-stone-200/60 dark:border-white/10">
          {/* Recherche */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Rechercher un plat, ingrédient (ex: poulet...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-mono border transition-all ${
                isDark
                  ? 'bg-black/30 border-white/10 text-white placeholder-stone-500 focus:border-white/30 focus:outline-hidden'
                  : 'bg-white border-stone-200 text-stone-900 placeholder-stone-400 focus:border-stone-400 focus:outline-hidden shadow-xs'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtre Type de Repas */}
          <div className="md:col-span-4 flex items-center p-1 rounded-xl sm:rounded-2xl border bg-stone-100/70 dark:bg-black/30 border-stone-200/80 dark:border-white/10 text-xs font-mono overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'dejeuner', label: 'Déjeuners' },
              { id: 'souper', label: 'Dîners/Soupers' },
              { id: 'collation', label: 'Collations' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMealTypeFilter(tab.id as 'all' | MealType)}
                className={`flex-1 shrink-0 py-1.5 px-2 rounded-lg sm:rounded-xl text-center text-[11px] sm:text-xs transition-all ${
                  mealTypeFilter === tab.id
                    ? isDark
                      ? 'bg-white text-stone-950 font-bold shadow-xs'
                      : 'bg-stone-900 text-stone-50 font-bold shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filtre Origine */}
          <div className="md:col-span-3 flex items-center p-1 rounded-xl sm:rounded-2xl border bg-stone-100/70 dark:bg-black/30 border-stone-200/80 dark:border-white/10 text-xs font-mono">
            {[
              { id: 'all', label: `Tous (${allRecipes.length})` },
              { id: 'custom', label: `Maison (${customRecipes.length})` },
              { id: 'curated', label: 'Chef' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSourceFilter(tab.id as 'all' | 'custom' | 'curated')}
                className={`flex-1 py-1.5 px-2 rounded-lg sm:rounded-xl text-center text-[11px] sm:text-xs transition-all ${
                  sourceFilter === tab.id
                    ? isDark
                      ? 'bg-white text-stone-950 font-bold shadow-xs'
                      : 'bg-stone-900 text-stone-50 font-bold shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grille de Recettes */}
      {filteredRecipes.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border ${cardGlassClass}`}>
          <UtensilsCrossed className="w-10 h-10 mx-auto text-stone-400 mb-3" />
          <h3 className="font-serif text-lg font-medium text-stone-900 dark:text-white">
            Aucun plat ne correspond à vos critères
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
            Modifiez votre recherche ou créez immédiatement une nouvelle recette personnalisée avec vos ingrédients.
          </p>
          <button
            onClick={onOpenRecipeCreator}
            className="mt-4 px-4 py-2 rounded-2xl bg-stone-900 text-stone-50 dark:bg-white dark:text-stone-950 text-xs font-mono font-semibold"
          >
            Créer ce repas maintenant
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecipes.map((recipe) => {
            const costPerServing = getRecipeCostPerServing(recipe);
            const { isExcluded } = calculateRecipeScore(recipe, preferences);

            return (
              <div
                key={recipe.id}
                className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 border transition-all flex flex-col justify-between group ${cardGlassClass} ${
                  isExcluded ? 'opacity-50 ring-1 ring-red-500/30' : ''
                }`}
              >
                <div>
                  {/* Header de la carte : Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold border border-stone-300/80 dark:border-stone-700">
                        {recipe.mealType === 'dejeuner' && <Coffee className="w-3 h-3 text-amber-500" />}
                        {recipe.mealType === 'diner' && <Sun className="w-3 h-3 text-amber-400" />}
                        {recipe.mealType === 'souper' && <Moon className="w-3 h-3 text-indigo-400" />}
                        {recipe.mealType === 'collation' && <Zap className="w-3 h-3 text-emerald-400" />}
                        <span>
                          {recipe.mealType === 'dejeuner'
                            ? 'Déjeuner'
                            : recipe.mealType === 'diner'
                            ? 'Dîner'
                            : recipe.mealType === 'souper'
                            ? 'Souper'
                            : 'Collation'}
                        </span>
                      </span>

                      {recipe.isCustom ? (
                        <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                          <Database className="w-2.5 h-2.5" /> Fait-Maison SQLite
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-white/10 font-semibold">
                          <ChefHat className="w-2.5 h-2.5" /> Chef Metro
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-stone-500 dark:text-stone-400">
                      <Clock className="w-3 h-3" />
                      <span>{recipe.prepTimeMinutes + recipe.cookTimeMinutes} min</span>
                    </div>
                  </div>

                  {/* Titre */}
                  <h3
                    onClick={() => onSelectRecipe(recipe)}
                    className="font-serif text-lg font-medium text-stone-900 dark:text-white group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors cursor-pointer line-clamp-2 leading-snug"
                  >
                    {recipe.title}
                  </h3>

                  {/* Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2 mb-4">
                    {recipe.tags?.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-md"
                      >
                        #{tag}
                      </span>
                    ))}
                    {costPerServing > 0 && (
                      <span className="text-[10px] font-mono text-stone-700 dark:text-stone-300 font-semibold bg-stone-200/70 dark:bg-white/10 px-2 py-0.5 rounded-md ml-auto">
                        ~{costPerServing.toFixed(2)} $ / part
                      </span>
                    )}
                  </div>

                  {/* 4 Piliers Macronutritionnels Apple Fitness */}
                  <div className="grid grid-cols-4 gap-1.5 p-2.5 rounded-2xl bg-stone-100/70 dark:bg-black/30 border border-stone-200/80 dark:border-white/5 text-center font-mono">
                    <div>
                      <span className="text-[9px] uppercase text-stone-400 block">Cals</span>
                      <span className="text-xs font-bold text-stone-900 dark:text-white tabular-nums">
                        {recipe.caloriesPerServing}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-stone-400 block">Prot</span>
                      <span className="text-xs font-bold text-stone-900 dark:text-white tabular-nums">
                        {recipe.proteinPerServing}g
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-stone-400 block">Gluc</span>
                      <span className="text-xs font-bold text-stone-900 dark:text-white tabular-nums">
                        {recipe.carbsPerServing}g
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-stone-400 block">Lip</span>
                      <span className="text-xs font-bold text-stone-900 dark:text-white tabular-nums">
                        {recipe.fatPerServing}g
                      </span>
                    </div>
                  </div>

                  {/* Aperçu des ingrédients */}
                  <div className="mt-3.5 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block font-semibold">
                      Ingrédients ({recipe.ingredients.length}) :
                    </span>
                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                      {recipe.ingredients
                        .map((item) => {
                          const ing = INGREDIENTS[item.ingredientId];
                          return ing ? `${item.quantity}${item.unit} ${ing.name}` : item.ingredientId;
                        })
                        .join(' • ')}
                    </p>
                  </div>
                </div>

                {/* Actions de la carte */}
                <div className="pt-4 mt-4 border-t border-stone-200/60 dark:border-white/10 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenPlanning(recipe)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 text-stone-50 dark:bg-white dark:text-stone-950 text-xs font-mono font-semibold transition-all active:scale-95 shadow-xs hover:opacity-90"
                    title="Planifier ce repas dans la semaine"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Planifier</span>
                  </button>

                  <button
                    onClick={() => onSelectRecipe(recipe)}
                    className="p-2 rounded-xl border border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-700 dark:text-stone-300 transition-colors"
                    title="Voir les instructions complètes"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onEditRecipe(recipe)}
                    className="p-2 rounded-xl border border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-700 dark:text-stone-300 transition-colors"
                    title={recipe.isCustom ? 'Modifier cette recette dans SQLite' : 'Personnaliser et enregistrer dans SQLite'}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {recipe.isCustom && (
                    <button
                      onClick={() => onDeleteRecipe(recipe.id)}
                      className="p-2 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Supprimer définitivement de SQLite"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PLANIFIER UN PLAT DANS LA SEMAINE */}
      {planningRecipe && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 animate-in fade-in duration-150 mb-safe sm:mb-0">
          <div
            className={`w-full max-w-md rounded-2xl sm:rounded-3xl p-5 sm:p-7 border shadow-2xl space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-stone-950 border-white/15 text-white' : 'bg-white border-stone-200 text-stone-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-white/10">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                <h3 className="font-serif text-lg font-medium">Planifier dans la Semaine</h3>
              </div>
              <button
                onClick={() => setPlanningRecipe(null)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                Plat sélectionné :
              </span>
              <p className="font-serif text-base font-medium mt-0.5">{planningRecipe.title}</p>
              <div className="flex items-center gap-3 text-xs font-mono text-stone-500 mt-1">
                <span>{planningRecipe.caloriesPerServing} kcal</span>
                <span>•</span>
                <span>{planningRecipe.proteinPerServing}g protéines</span>
                <span>•</span>
                <span>{planningRecipe.carbsPerServing}g glucides</span>
                <span>•</span>
                <span>{planningRecipe.fatPerServing}g lipides</span>
              </div>
            </div>

            {/* Choix du jour */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 mb-2 font-semibold">
                Choisir le jour :
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {DAYS.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setTargetDayIndex(idx)}
                    className={`py-2 px-1 rounded-xl text-xs font-mono transition-all border ${
                      targetDayIndex === idx
                        ? isDark
                          ? 'bg-white text-stone-950 font-bold border-white'
                          : 'bg-stone-900 text-stone-50 font-bold border-stone-900 shadow-xs'
                        : isDark
                        ? 'bg-white/[0.04] border-white/5 text-stone-400 hover:text-white'
                        : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Choix du moment */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 mb-2 font-semibold">
                Moment du repas :
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'breakfast', label: 'Déjeuner (Matin)', icon: Coffee },
                  { id: 'lunch', label: 'Dîner (Midi)', icon: Sun },
                  { id: 'dinner', label: 'Souper (Soir)', icon: Moon },
                  { id: 'snack', label: 'Collation', icon: Zap },
                ].map((slot) => {
                  const Icon = slot.icon;
                  const isSelected = targetMealSlot === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setTargetMealSlot(slot.id as any)}
                      className={`flex items-center gap-2 p-3 rounded-2xl text-xs font-mono transition-all border ${
                        isSelected
                          ? isDark
                            ? 'bg-white text-stone-950 font-bold border-white'
                            : 'bg-stone-900 text-stone-50 font-bold border-stone-900 shadow-xs'
                          : isDark
                          ? 'bg-white/[0.04] border-white/5 text-stone-400 hover:text-white'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{slot.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200/60 dark:border-white/10">
              <button
                type="button"
                onClick={() => setPlanningRecipe(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-stone-500 hover:text-stone-900 dark:hover:text-white"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmPlanning}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold active:scale-95 shadow-md ${
                  isDark ? 'bg-white text-stone-950 hover:bg-stone-200' : 'bg-stone-900 text-white hover:bg-stone-800'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirmer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const RecipeBookView = React.memo(RecipeBookViewComponent);
