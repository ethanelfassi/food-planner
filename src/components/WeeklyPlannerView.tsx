'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProductPreferencesMap, Recipe, WeeklyPlan, UserCustomizationSettings, Ingredient } from '@/types';
import { RECIPES } from '@/data/recipes';
import { INGREDIENTS } from '@/data/ingredients';
import { calculateRecipeScore, MIN_RECIPES_FOR_AUTO_GENERATION } from '@/lib/planner';
import { 
  RefreshCw, 
  Sun, 
  Moon, 
  Coffee, 
  Zap, 
  ChevronRight,
  ChevronLeft,
  Calendar, 
  Check, 
  Sparkles,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Heart,
  Plus
} from 'lucide-react';

interface WeeklyPlannerViewProps {
  plan: WeeklyPlan;
  preferences?: ProductPreferencesMap;
  userSettings?: UserCustomizationSettings;
  customRecipes?: Recipe[];
  isDark: boolean;
  onRegenerateAll: () => void;
  onReplaceRecipe: (dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', newRecipeId: string) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onOpenRecipeCreator?: () => void;
  weekOffset?: number;
  onNavigateWeek?: (direction: -1 | 1 | 0) => void;
  onOpenCalendar?: () => void;
  selectedDayIndex?: number;
  onSelectDayIndex?: (idx: number) => void;
  customProducts?: Ingredient[];
  onToggleMealEaten?: (dayIndex: number, date: string | undefined, mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack') => void;
}

const WeeklyPlannerViewComponent: React.FC<WeeklyPlannerViewProps> = ({
  plan,
  preferences = {},
  userSettings,
  customRecipes = [],
  isDark,
  onRegenerateAll,
  onReplaceRecipe,
  onSelectRecipe,
  onOpenRecipeCreator,
  weekOffset = 0,
  onNavigateWeek,
  onOpenCalendar,
  selectedDayIndex: controlledDayIndex,
  onSelectDayIndex,
  customProducts = [],
  onToggleMealEaten,
}) => {
  const [internalDayIndex, setInternalDayIndex] = useState<number>(0);

  useEffect(() => {
    const d = new Date().getDay();
    const idx = d === 0 ? 6 : d - 1;
    setInternalDayIndex(idx);
  }, []);

  const selectedDayIndex = controlledDayIndex !== undefined ? controlledDayIndex : internalDayIndex;
  const handleSelectDay = onSelectDayIndex || setInternalDayIndex;

  const [swapMealState, setSwapMealState] = useState<{
    dayIndex: number;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  } | null>(null);

  const currentDay = plan.days[selectedDayIndex] || plan.days[0];

  const customProductsMap = React.useMemo(() => {
    const map = new Map<string, string>();
    if (customProducts) {
      for (const p of customProducts) {
        map.set(p.id, p.name);
      }
    }
    return map;
  }, [customProducts]);

  const getIngredientDisplayName = useCallback(
    (ingredientId: string) => {
      const customName = customProductsMap.get(ingredientId);
      if (customName) return customName;
      const std = (INGREDIENTS as Record<string, Ingredient>)[ingredientId];
      if (std) return std.name;
      if (ingredientId.startsWith('barcode_')) {
        return 'Produit personnalisé';
      }
      return ingredientId.replace(/_/g, ' ');
    },
    [customProductsMap]
  );

  const allRecipesPool = React.useMemo(() => {
    return [...RECIPES, ...(customRecipes || [])];
  }, [customRecipes]);

  const canAutoGenerate = allRecipesPool.length >= MIN_RECIPES_FOR_AUTO_GENERATION;

  const availableReplacements = swapMealState
    ? allRecipesPool.filter((r) => {
        // 1. Filtrer par type de repas
        if (swapMealState.mealType === 'breakfast' && r.mealType !== 'dejeuner') return false;
        if (swapMealState.mealType === 'lunch' && r.mealType !== 'diner' && r.mealType !== 'souper') return false;
        if (swapMealState.mealType === 'dinner' && r.mealType !== 'souper' && r.mealType !== 'diner') return false;
        if (swapMealState.mealType === 'snack' && r.mealType !== 'collation') return false;

        // 2. Bannir si la recette contient un ingrédient exclu
        const { isExcluded } = calculateRecipeScore(r, preferences);
        return !isExcluded;
      }).sort((a, b) => {
        // Prioriser les recettes avec des ingrédients aimés et des promos
        const scoreA = calculateRecipeScore(a, preferences).score + (a.isCustom ? 25 : 0);
        const scoreB = calculateRecipeScore(b, preferences).score + (b.isCustom ? 25 : 0);
        return scoreB - scoreA;
      })
    : [];

  const cardGlassClass = isDark
    ? 'liquid-glass text-stone-100 hover:border-white/20'
    : 'liquid-glass-light text-stone-900 hover:border-stone-400/80';

  return (
    <div className="space-y-8">
      {/* Hero Header Éditorial & Anneaux d'Objectif Apple Fitness */}
      <div
        className={`rounded-2xl sm:rounded-3xl p-4 sm:p-8 transition-all ${
          isDark ? 'liquid-glass' : 'liquid-glass-light'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-stone-900 dark:text-white">
              Planning de la semaine
            </h1>
          </div>

          {/* Synthèse Métabolique Minimaliste 4 Piliers */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div
              className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 p-3 sm:p-4 rounded-2xl border flex-1 ${
                isDark
                  ? 'bg-black/30 border-white/10'
                  : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1 font-semibold">
                  <Flame className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Énergie
                </div>
                <div className="font-mono tabular-nums text-base sm:text-xl font-medium mt-0.5 text-stone-950 dark:text-white">
                  {plan.avgDailyCalories} <span className="text-[10px] sm:text-[11px] text-stone-500 font-sans font-normal">kcal/j</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1 font-semibold">
                  <Dumbbell className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Protéines
                </div>
                <div className="font-mono tabular-nums text-base sm:text-xl font-medium mt-0.5 text-stone-950 dark:text-white">
                  {plan.avgDailyProtein}g <span className="text-[10px] sm:text-[11px] text-stone-500 font-sans font-normal">/j</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1 font-semibold">
                  <Wheat className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Glucides
                </div>
                <div className="font-mono tabular-nums text-base sm:text-xl font-medium mt-0.5 text-stone-950 dark:text-white">
                  {plan.avgDailyCarbs}g <span className="text-[10px] sm:text-[11px] text-stone-500 font-sans font-normal">/j</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1 font-semibold">
                  <Droplet className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Lipides
                </div>
                <div className="font-mono tabular-nums text-base sm:text-xl font-medium mt-0.5 text-stone-950 dark:text-white">
                  {plan.avgDailyFat}g <span className="text-[10px] sm:text-[11px] text-stone-500 font-sans font-normal">/j</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de Navigation Semaine & Actions (Dédiée et responsive, sans débordement) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-stone-200/60 dark:border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            {onNavigateWeek && (
              <div className="inline-flex items-center gap-1 p-1 rounded-2xl border border-stone-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] shadow-xs">
                <button
                  onClick={() => onNavigateWeek(-1)}
                  className="p-1.5 sm:p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-white/10 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                  title="Semaine précédente"
                  type="button"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={onOpenCalendar}
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl hover:bg-stone-100 dark:hover:bg-white/10 text-stone-800 dark:text-stone-200 font-mono text-xs font-semibold transition-colors cursor-pointer"
                  title="Cliquer pour ouvrir le calendrier et l'historique"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{plan.weekLabel || 'Semaine courante'}</span>
                </button>
                <button
                  onClick={() => onNavigateWeek(1)}
                  className="p-1.5 sm:p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-white/10 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                  title="Semaine suivante"
                  type="button"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {weekOffset !== 0 && onNavigateWeek && (
              <button
                onClick={() => onNavigateWeek(0)}
                className="text-[11px] font-mono uppercase px-2.5 py-1.5 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 font-bold transition-all shadow-xs cursor-pointer hover:opacity-90"
                title="Revenir à la semaine en cours"
                type="button"
              >
                Semaine actuelle
              </button>
            )}
            {onOpenCalendar && (
              <button
                onClick={onOpenCalendar}
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-stone-300 font-mono text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                title="Ouvrir le calendrier et l'historique"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Calendrier</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {onOpenRecipeCreator && (
              <button
                onClick={onOpenRecipeCreator}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl border text-xs font-mono uppercase tracking-wider transition-all font-semibold active:scale-95 border-stone-300 dark:border-white/20 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-900 dark:text-stone-100 shadow-xs cursor-pointer"
                title="Créer un nouveau repas personnalisé"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Repas</span>
              </button>
            )}

            <button
              onClick={canAutoGenerate ? onRegenerateAll : undefined}
              disabled={!canAutoGenerate}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${
                !canAutoGenerate
                  ? 'opacity-45 cursor-not-allowed border-stone-300 dark:border-white/10 text-stone-400 dark:text-stone-500'
                  : isDark
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white active:scale-95'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-50 border-stone-900 shadow-xs active:scale-95'
              }`}
              title={
                canAutoGenerate
                  ? 'Régénérer le menu de la semaine'
                  : `Génération auto désactivée : enregistrez au moins ${MIN_RECIPES_FOR_AUTO_GENERATION} repas (${allRecipesPool.length}/${MIN_RECIPES_FOR_AUTO_GENERATION})`
              }
            >
              <RefreshCw className="w-4 h-4 text-current" />
              {!canAutoGenerate && (
                <span className="text-[10px] font-mono uppercase tracking-wider">
                  {allRecipesPool.length}/{MIN_RECIPES_FOR_AUTO_GENERATION} repas
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Sélecteur des 7 Jours (Nordic Minimalist Pills) */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-4 sm:mt-6">
          {plan.days.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            const isToday = Boolean(day.isToday);
            return (
              <button
                key={day.date || day.dayName}
                onClick={() => handleSelectDay(idx)}
                className={`relative py-2 sm:py-3 px-0.5 sm:px-2 rounded-xl sm:rounded-2xl text-center transition-colors flex flex-col items-center gap-0.5 sm:gap-1 active:scale-95 touch-manipulation ${
                  isSelected
                    ? isDark
                      ? 'bg-white text-stone-950 font-bold shadow-xl shadow-black/30 ring-1 ring-white'
                      : 'bg-stone-900 text-stone-50 font-bold shadow-lg shadow-stone-900/10'
                    : isDark
                    ? 'bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-stone-400'
                    : 'bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700'
                }`}
              >
                {isToday && (
                  <span className="absolute -top-1.5 px-1.5 py-0.2 rounded-full text-[8px] font-mono uppercase font-bold tracking-wider bg-emerald-500 text-white shadow-xs">
                    Auj
                  </span>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-[9px] sm:text-xs uppercase tracking-wider font-semibold">
                    {day.dayName.slice(0, 3)}
                  </span>
                  {day.formattedDate && (
                    <span className={`font-mono text-[9px] ${isSelected ? (isDark ? 'text-stone-700' : 'text-stone-300') : 'text-stone-400'}`}>
                      {day.formattedDate.split(' ')[0]}
                    </span>
                  )}
                </div>
                <span
                  className={`font-mono tabular-nums text-[11px] sm:text-sm font-semibold ${
                    isSelected
                      ? isDark
                        ? 'text-stone-950'
                        : 'text-stone-50'
                      : 'text-stone-900 dark:text-stone-200'
                  }`}
                >
                  {day.dailyProtein}g
                </span>
                <span
                  className={`text-[9px] font-mono tabular-nums hidden sm:block ${
                    isSelected ? 'opacity-70' : 'text-stone-500'
                  }`}
                >
                  {day.dailyCalories}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Détails du Jour Sélectionné */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 sm:gap-3">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-serif text-xl sm:text-2xl font-normal text-stone-900 dark:text-white">
                Repas du <span className="italic">{currentDay.formattedFullDate || currentDay.dayName}</span>
              </h2>
              {currentDay.isToday && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                  Aujourd'hui
                </span>
              )}
            </div>
            <span className="font-mono text-xs text-stone-500 dark:text-stone-400 tabular-nums">
              {currentDay.dailyCalories} kcal • {currentDay.dailyProtein}g prot • {currentDay.dailyCarbs}g gluc • {currentDay.dailyFat}g lip
            </span>
          </div>
          <span className="text-xs text-stone-400 hidden md:block font-sans">
            Sélectionnez une carte pour consulter les instructions
          </span>
        </div>

        {/* Grille des 4 Repas Indépendants */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. PETIT-DÉJEUNER */}
          <div
            onClick={() => onSelectRecipe(currentDay.breakfast)}
            className={`p-5 rounded-3xl border transition-colors cursor-pointer flex flex-col justify-between group ${cardGlassClass}`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 font-semibold">
                    <Coffee className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Petit-déjeuner
                  </span>
                  {currentDay.eatenMeals?.breakfast && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                      Mangé
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMealEaten?.(selectedDayIndex, currentDay.date, 'breakfast');
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                      currentDay.eatenMeals?.breakfast
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : isDark
                        ? 'bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                    }`}
                    title={currentDay.eatenMeals?.breakfast ? 'Repas mangé ! Cliquez pour décocher' : 'Cocher ce repas comme mangé'}
                    type="button"
                  >
                    <Check className={`w-3.5 h-3.5 ${currentDay.eatenMeals?.breakfast ? 'stroke-[3]' : 'opacity-40'}`} />
                    <span>{currentDay.eatenMeals?.breakfast ? 'Mangé' : 'Manger'}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSwapMealState({ dayIndex: selectedDayIndex, mealType: 'breakfast' });
                    }}
                    className="text-xs text-stone-500 hover:text-stone-950 dark:hover:text-stone-200 transition-colors px-2 py-0.5 rounded-lg"
                  >
                    Changer ▾
                  </button>
                </div>
              </div>

              <h3 className="font-serif text-lg font-medium tracking-tight text-stone-900 dark:text-white group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors">
                {currentDay.breakfast.title}
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 line-clamp-2 font-sans">
                {currentDay.breakfast.ingredients.length > 0
                  ? `${currentDay.breakfast.ingredients.slice(0, 4).map((i) => getIngredientDisplayName(i.ingredientId)).join(', ')}...`
                  : 'Aucun ingrédient défini'}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-stone-200 dark:border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  {currentDay.breakfast.caloriesPerServing} kcal
                </span>
                <span className="font-semibold text-stone-950 dark:text-white">
                  {currentDay.breakfast.proteinPerServing}g prot
                </span>
              </div>
              <span className="text-stone-600 dark:text-stone-400 group-hover:text-stone-950 dark:group-hover:text-stone-200 flex items-center gap-0.5 transition-colors font-medium">
                Voir recette <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* 2. DÉJEUNER (MIDI) */}
          <div
            onClick={() => onSelectRecipe(currentDay.lunch)}
            className={`p-5 rounded-3xl border transition-colors cursor-pointer flex flex-col justify-between group ${cardGlassClass}`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 font-semibold">
                    <Sun className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Déjeuner (Midi)
                  </span>
                  {currentDay.eatenMeals?.lunch && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                      Mangé
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMealEaten?.(selectedDayIndex, currentDay.date, 'lunch');
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                      currentDay.eatenMeals?.lunch
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : isDark
                        ? 'bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                    }`}
                    title={currentDay.eatenMeals?.lunch ? 'Repas mangé ! Cliquez pour décocher' : 'Cocher ce repas comme mangé'}
                    type="button"
                  >
                    <Check className={`w-3.5 h-3.5 ${currentDay.eatenMeals?.lunch ? 'stroke-[3]' : 'opacity-40'}`} />
                    <span>{currentDay.eatenMeals?.lunch ? 'Mangé' : 'Manger'}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSwapMealState({ dayIndex: selectedDayIndex, mealType: 'lunch' });
                    }}
                    className="text-xs text-stone-500 hover:text-stone-950 dark:hover:text-stone-200 transition-colors px-2 py-0.5 rounded-lg"
                  >
                    Changer ▾
                  </button>
                </div>
              </div>

              <h3 className="font-serif text-lg font-medium tracking-tight text-stone-900 dark:text-white group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors">
                {currentDay.lunch.title}
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 line-clamp-2 font-sans">
                {currentDay.lunch.ingredients.length > 0
                  ? `${currentDay.lunch.ingredients.slice(0, 4).map((i) => getIngredientDisplayName(i.ingredientId)).join(', ')}...`
                  : 'Aucun ingrédient défini'}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-stone-200 dark:border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  {currentDay.lunch.caloriesPerServing} kcal
                </span>
                <span className="font-semibold text-stone-950 dark:text-white">
                  {currentDay.lunch.proteinPerServing}g prot
                </span>
              </div>
              <span className="text-stone-600 dark:text-stone-400 group-hover:text-stone-950 dark:group-hover:text-stone-200 flex items-center gap-0.5 transition-colors font-medium">
                Voir fiche <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* 3. DÎNER (SOIR) */}
          <div
            onClick={() => onSelectRecipe(currentDay.dinner)}
            className={`p-5 rounded-3xl border-2 transition-colors cursor-pointer flex flex-col justify-between group ${
              isDark
                ? 'liquid-glass border-white/20 hover:border-white/40'
                : 'liquid-glass-light border-stone-400 hover:border-stone-800 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-white/10 font-semibold">
                    <Moon className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Dîner (Soir)
                  </span>
                  {currentDay.eatenMeals?.dinner && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                      Mangé
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMealEaten?.(selectedDayIndex, currentDay.date, 'dinner');
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                      currentDay.eatenMeals?.dinner
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : isDark
                        ? 'bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                    }`}
                    title={currentDay.eatenMeals?.dinner ? 'Repas mangé ! Cliquez pour décocher' : 'Cocher ce repas comme mangé'}
                    type="button"
                  >
                    <Check className={`w-3.5 h-3.5 ${currentDay.eatenMeals?.dinner ? 'stroke-[3]' : 'opacity-40'}`} />
                    <span>{currentDay.eatenMeals?.dinner ? 'Mangé' : 'Manger'}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSwapMealState({ dayIndex: selectedDayIndex, mealType: 'dinner' });
                    }}
                    className="text-xs text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white transition-colors px-2 py-0.5 rounded-lg font-medium"
                  >
                    Changer ▾
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-stone-600 dark:text-stone-400 font-mono">
                  ~{currentDay.dinner.prepTimeMinutes + currentDay.dinner.cookTimeMinutes} min
                </span>
              </div>

              <h3 className="font-serif text-lg font-medium tracking-tight text-stone-900 dark:text-white group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors">
                {currentDay.dinner.title}
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 line-clamp-2 font-sans">
                {currentDay.dinner.ingredients.length > 0
                  ? `${currentDay.dinner.ingredients.slice(0, 4).map((i) => getIngredientDisplayName(i.ingredientId)).join(', ')}...`
                  : 'Aucun ingrédient défini'}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-stone-200 dark:border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  {currentDay.dinner.caloriesPerServing} kcal
                </span>
                <span className="font-semibold text-stone-950 dark:text-white">
                  {currentDay.dinner.proteinPerServing}g prot
                </span>
              </div>
              <span className="text-stone-600 dark:text-stone-400 group-hover:text-stone-950 dark:group-hover:text-stone-200 flex items-center gap-0.5 transition-colors font-medium">
                Voir recette <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* 4. COLLATION */}
          <div
            onClick={() => onSelectRecipe(currentDay.snack)}
            className={`p-5 rounded-3xl border transition-colors cursor-pointer flex flex-col justify-between group ${cardGlassClass}`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 font-semibold">
                    <Zap className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Collation
                  </span>
                  {currentDay.eatenMeals?.snack && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                      Mangé
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMealEaten?.(selectedDayIndex, currentDay.date, 'snack');
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                      currentDay.eatenMeals?.snack
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : isDark
                        ? 'bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                    }`}
                    title={currentDay.eatenMeals?.snack ? 'Collation mangée ! Cliquez pour décocher' : 'Cocher cette collation comme mangée'}
                    type="button"
                  >
                    <Check className={`w-3.5 h-3.5 ${currentDay.eatenMeals?.snack ? 'stroke-[3]' : 'opacity-40'}`} />
                    <span>{currentDay.eatenMeals?.snack ? 'Mangé' : 'Manger'}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSwapMealState({ dayIndex: selectedDayIndex, mealType: 'snack' });
                    }}
                    className="text-xs text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white transition-colors px-2 py-0.5 rounded-lg font-medium"
                  >
                    Changer ▾
                  </button>
                </div>
              </div>

              <h3 className="font-serif text-lg font-medium tracking-tight text-stone-900 dark:text-white group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors">
                {currentDay.snack.title}
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 font-sans">
                Aliments entiers denses : yogourt grec, cottage, fruits, noix, beurre d'arachide.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-stone-200 dark:border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  {currentDay.snack.caloriesPerServing} kcal
                </span>
                <span className="font-semibold text-stone-950 dark:text-white">
                  {currentDay.snack.proteinPerServing}g prot
                </span>
              </div>
              <span className="text-stone-600 dark:text-stone-400 group-hover:text-stone-950 dark:group-hover:text-stone-200 flex items-center gap-0.5 transition-colors font-medium">
                Voir détails <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal / Menu de Remplacement Liquid Glass */}
      {swapMealState && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/75 animate-in fade-in duration-150">
          <div
            className={`rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border max-h-[85vh] overflow-y-auto mb-safe sm:mb-0 ${
              isDark ? 'liquid-glass' : 'liquid-glass-light'
            }`}
          >
            <h3 className="font-serif text-xl font-normal text-stone-900 dark:text-white">
              Remplacer pour le <span className="italic">{plan.days[swapMealState.dayIndex].dayName}</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 font-sans">
              Sélectionnez une alternative au même profil macronutritionnel :
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {availableReplacements.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-500 dark:text-stone-400 font-mono">
                  Aucune alternative disponible. Créez des repas dans l&apos;onglet Recettes !
                </div>
              ) : (
                availableReplacements.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => {
                      onReplaceRecipe(swapMealState.dayIndex, swapMealState.mealType, rec.id);
                      setSwapMealState(null);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-colors flex items-center justify-between ${
                      isDark
                        ? 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5'
                        : 'bg-white/80 hover:bg-white border-stone-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif font-medium text-sm text-stone-900 dark:text-white">
                          {rec.title}
                        </span>
                        {rec.isCustom && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-950 font-bold">
                            Maison
                          </span>
                        )}
                        {calculateRecipeScore(rec, preferences).likedCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-950 font-semibold">
                            <Heart className="w-2.5 h-2.5 fill-current" /> Favori
                          </span>
                        )}
                      </div>
                      <div className="font-mono tabular-nums text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {rec.caloriesPerServing} kcal • {rec.proteinPerServing}g protéines
                      </div>
                    </div>
                    <Check className="w-4 h-4 text-stone-700 dark:text-stone-300 opacity-80" />
                  </button>
                ))
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-stone-200/60 dark:border-white/10 flex justify-end">
              <button
                onClick={() => setSwapMealState(null)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const WeeklyPlannerView = React.memo(WeeklyPlannerViewComponent);
