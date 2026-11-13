'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ProductPreferencesMap,
  Recipe,
  WeeklyPlan,
  UserCustomizationSettings,
  Ingredient,
  DailyTrackerLog,
  TrackerCustomEntry,
  DEFAULT_USER_SETTINGS,
} from '@/types';
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
  Plus,
  Trash2,
  X,
  Target
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
  trackerLogs?: DailyTrackerLog[];
  activeAccountId?: string;
  onAddCustomTrackerEntry?: (dayIndex: number, date: string | undefined, entry: Omit<TrackerCustomEntry, 'id'>) => void;
  onDeleteCustomTrackerEntry?: (dayIndex: number, date: string | undefined, entryId: string) => void;
  onUpdateSettings?: (newSettings: Partial<UserCustomizationSettings>) => void;
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
  trackerLogs = [],
  activeAccountId = 'ethan',
  onAddCustomTrackerEntry,
  onDeleteCustomTrackerEntry,
  onUpdateSettings,
}) => {
  const [internalDayIndex, setInternalDayIndex] = useState<number>(0);
  const [showCustomEntryForm, setShowCustomEntryForm] = useState(false);
  const [customEntryName, setCustomEntryName] = useState('');
  const [customEntryCalories, setCustomEntryCalories] = useState('');
  const [customEntryProtein, setCustomEntryProtein] = useState('');
  const [customEntryCarbs, setCustomEntryCarbs] = useState('');
  const [customEntryFat, setCustomEntryFat] = useState('');

  const [showTargetsEditor, setShowTargetsEditor] = useState(false);
  const [draftTargets, setDraftTargets] = useState({
    calories: userSettings?.targetCalories ?? DEFAULT_USER_SETTINGS.targetCalories,
    protein: userSettings?.targetProtein ?? DEFAULT_USER_SETTINGS.targetProtein,
    carbs: userSettings?.targetCarbs ?? DEFAULT_USER_SETTINGS.targetCarbs,
    fat: userSettings?.targetFat ?? DEFAULT_USER_SETTINGS.targetFat,
  });

  useEffect(() => {
    setDraftTargets({
      calories: userSettings?.targetCalories ?? DEFAULT_USER_SETTINGS.targetCalories,
      protein: userSettings?.targetProtein ?? DEFAULT_USER_SETTINGS.targetProtein,
      carbs: userSettings?.targetCarbs ?? DEFAULT_USER_SETTINGS.targetCarbs,
      fat: userSettings?.targetFat ?? DEFAULT_USER_SETTINGS.targetFat,
    });
  }, [userSettings]);

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

  const todayOrCurrentDay = useMemo(() => {
    return plan.days.find((d) => d.isToday) || currentDay;
  }, [plan.days, currentDay]);

  const activeMacroDay = currentDay || todayOrCurrentDay;

  const activeDayLog = useMemo(() => {
    if (!activeMacroDay) return undefined;
    return trackerLogs.find(
      (l) =>
        l.accountId === activeAccountId &&
        (activeMacroDay.date ? l.date === activeMacroDay.date : l.dayIndex === activeMacroDay.dayIndex)
    );
  }, [trackerLogs, activeAccountId, activeMacroDay]);

  const macroSummary = useMemo(() => {
    const targetCalories = userSettings?.targetCalories ?? DEFAULT_USER_SETTINGS.targetCalories;
    const targetProtein = userSettings?.targetProtein ?? DEFAULT_USER_SETTINGS.targetProtein;
    const targetCarbs = userSettings?.targetCarbs ?? DEFAULT_USER_SETTINGS.targetCarbs;
    const targetFat = userSettings?.targetFat ?? DEFAULT_USER_SETTINGS.targetFat;

    const customEntries = activeDayLog?.customEntries || [];
    const customTotals = customEntries.reduce(
      (acc, entry) => ({
        calories: acc.calories + (Number(entry.calories) || 0),
        protein: acc.protein + (Number(entry.protein) || 0),
        carbs: acc.carbs + (Number(entry.carbs) || 0),
        fat: acc.fat + (Number(entry.fat) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const slots: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = ['breakfast', 'lunch', 'dinner', 'snack'];
    let eatenMealCalories = 0;
    let eatenMealProtein = 0;
    let eatenMealCarbs = 0;
    let eatenMealFat = 0;

    for (const slot of slots) {
      if (activeMacroDay?.eatenMeals?.[slot]) {
        const meal = activeMacroDay[slot];
        eatenMealCalories += meal?.caloriesPerServing || 0;
        eatenMealProtein += meal?.proteinPerServing || 0;
        eatenMealCarbs += meal?.carbsPerServing || 0;
        eatenMealFat += meal?.fatPerServing || 0;
      }
    }

    return {
      customEntries,
      consumed: {
        calories: Math.round(eatenMealCalories + customTotals.calories),
        protein: Math.round(eatenMealProtein + customTotals.protein),
        carbs: Math.round(eatenMealCarbs + customTotals.carbs),
        fat: Math.round(eatenMealFat + customTotals.fat),
      },
      planned: {
        calories: Math.round((activeMacroDay?.dailyCalories || 0) + customTotals.calories),
        protein: Math.round((activeMacroDay?.dailyProtein || 0) + customTotals.protein),
        carbs: Math.round((activeMacroDay?.dailyCarbs || 0) + customTotals.carbs),
        fat: Math.round((activeMacroDay?.dailyFat || 0) + customTotals.fat),
      },
      targets: {
        calories: targetCalories,
        protein: targetProtein,
        carbs: targetCarbs,
        fat: targetFat,
      },
    };
  }, [activeMacroDay, activeDayLog, userSettings]);

  const handleCreateCustomEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddCustomTrackerEntry || !activeMacroDay || !customEntryName.trim()) return;
    onAddCustomTrackerEntry(activeMacroDay.dayIndex, activeMacroDay.date, {
      name: customEntryName.trim(),
      calories: Math.max(0, Math.round(Number(customEntryCalories) || 0)),
      protein: Math.max(0, Math.round(Number(customEntryProtein) || 0)),
      carbs: Math.max(0, Math.round(Number(customEntryCarbs) || 0)),
      fat: Math.max(0, Math.round(Number(customEntryFat) || 0)),
    });
    setCustomEntryName('');
    setCustomEntryCalories('');
    setCustomEntryProtein('');
    setCustomEntryCarbs('');
    setCustomEntryFat('');
    setShowCustomEntryForm(false);
  };

  const handleSaveTargets = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateSettings) return;
    onUpdateSettings({
      targetCalories: Math.max(500, Math.round(Number(draftTargets.calories) || DEFAULT_USER_SETTINGS.targetCalories)),
      targetProtein: Math.max(20, Math.round(Number(draftTargets.protein) || DEFAULT_USER_SETTINGS.targetProtein)),
      targetCarbs: Math.max(20, Math.round(Number(draftTargets.carbs) || DEFAULT_USER_SETTINGS.targetCarbs)),
      targetFat: Math.max(10, Math.round(Number(draftTargets.fat) || DEFAULT_USER_SETTINGS.targetFat)),
    });
    setShowTargetsEditor(false);
  };

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
        <div className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-stone-900 dark:text-white">
                  Planning
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-stone-200/80 dark:bg-white/10 text-stone-800 dark:text-stone-200 font-semibold">
                  {activeMacroDay?.isToday ? "Aujourd'hui • " : ''}
                  {activeMacroDay?.formattedFullDate || activeMacroDay?.dayName}
                </span>
              </div>
              <p className="text-xs font-mono text-stone-500 dark:text-stone-400 mt-1">
                Consommé (repas cochés + hors-plan) et prévu du jour vs vos objectifs
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onAddCustomTrackerEntry && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomEntryForm((v) => !v);
                    setShowTargetsEditor(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer ${
                    showCustomEntryForm
                      ? isDark
                        ? 'bg-white text-stone-950 border-white'
                        : 'bg-stone-900 text-white border-stone-900'
                      : isDark
                      ? 'bg-white/[0.04] border-white/10 text-stone-200 hover:bg-white/10'
                      : 'bg-white border-stone-200 text-stone-800 hover:bg-stone-50 shadow-xs'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Hors-plan</span>
                </button>
              )}
              {onUpdateSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setShowTargetsEditor((v) => !v);
                    setShowCustomEntryForm(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer ${
                    showTargetsEditor
                      ? isDark
                        ? 'bg-white text-stone-950 border-white'
                        : 'bg-stone-900 text-white border-stone-900'
                      : isDark
                      ? 'bg-white/[0.04] border-white/10 text-stone-200 hover:bg-white/10'
                      : 'bg-white border-stone-200 text-stone-800 hover:bg-stone-50 shadow-xs'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Objectifs</span>
                </button>
              )}
            </div>
          </div>

          {/* 4 Piliers Macros du Jour vs Objectifs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {[
              {
                key: 'calories' as const,
                label: 'Énergie',
                unit: 'kcal',
                icon: Flame,
                consumed: macroSummary.consumed.calories,
                planned: macroSummary.planned.calories,
                target: macroSummary.targets.calories,
                barColor: 'bg-emerald-500',
              },
              {
                key: 'protein' as const,
                label: 'Protéines',
                unit: 'g',
                icon: Dumbbell,
                consumed: macroSummary.consumed.protein,
                planned: macroSummary.planned.protein,
                target: macroSummary.targets.protein,
                barColor: 'bg-sky-500',
              },
              {
                key: 'carbs' as const,
                label: 'Glucides',
                unit: 'g',
                icon: Wheat,
                consumed: macroSummary.consumed.carbs,
                planned: macroSummary.planned.carbs,
                target: macroSummary.targets.carbs,
                barColor: 'bg-amber-500',
              },
              {
                key: 'fat' as const,
                label: 'Lipides',
                unit: 'g',
                icon: Droplet,
                consumed: macroSummary.consumed.fat,
                planned: macroSummary.planned.fat,
                target: macroSummary.targets.fat,
                barColor: 'bg-rose-500',
              },
            ].map((item) => {
              const Icon = item.icon;
              const safeTarget = Math.max(1, item.target);
              const consumedPct = Math.min(100, Math.round((item.consumed / safeTarget) * 100));
              const plannedPct = Math.min(100, Math.round((item.planned / safeTarget) * 100));
              const isOver = item.consumed > item.target * 1.05;
              const remaining = item.target - item.consumed;
              return (
                <div
                  key={item.key}
                  className={`p-3 sm:p-4 rounded-2xl border ${
                    isDark
                      ? 'bg-black/30 border-white/10'
                      : 'bg-white border-stone-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1 font-semibold">
                      <Icon className="w-3 h-3 text-stone-700 dark:text-stone-300" /> {item.label}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold tabular-nums ${
                        isOver
                          ? 'text-amber-500'
                          : consumedPct >= 85
                          ? 'text-emerald-500'
                          : 'text-stone-400'
                      }`}
                    >
                      {consumedPct}%
                    </span>
                  </div>

                  <div className="font-mono tabular-nums text-base sm:text-xl font-semibold mt-1 text-stone-950 dark:text-white">
                    {item.consumed}
                    <span className="text-xs text-stone-400 font-normal">
                      {' '}/ {item.target} {item.unit}
                    </span>
                  </div>

                  <div className="relative h-1.5 w-full rounded-full bg-stone-200 dark:bg-white/10 overflow-hidden mt-2">
                    {plannedPct > consumedPct && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-stone-400/40 dark:bg-white/25 transition-all"
                        style={{ width: `${plannedPct}%` }}
                      />
                    )}
                    <div
                      className={`relative h-full rounded-full transition-all ${
                        isOver ? 'bg-amber-500' : item.barColor
                      }`}
                      style={{ width: `${consumedPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 dark:text-stone-400 mt-1.5 tabular-nums">
                    <span>Prévu : {item.planned}{item.unit}</span>
                    <span>
                      {remaining >= 0 ? `Reste : ${remaining}${item.unit}` : `+${Math.abs(remaining)}${item.unit}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pills des ajouts hors-plan du jour sélectionné */}
          {macroSummary.customEntries.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-semibold">
                Hors-plan :
              </span>
              {macroSummary.customEntries.map((entry) => (
                <span
                  key={entry.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                    isDark
                      ? 'bg-white/[0.04] border-white/10 text-stone-200'
                      : 'bg-stone-100 border-stone-200 text-stone-800'
                  }`}
                >
                  <span className="font-semibold">{entry.name}</span>
                  <span className="text-stone-400">
                    {entry.calories}kcal · {entry.protein}gP
                  </span>
                  {onDeleteCustomTrackerEntry && activeMacroDay && (
                    <button
                      type="button"
                      onClick={() => onDeleteCustomTrackerEntry(activeMacroDay.dayIndex, activeMacroDay.date, entry.id)}
                      className="text-stone-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Supprimer cet ajout"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Formulaire rapide d'ajout hors-plan */}
          {showCustomEntryForm && (
            <form
              onSubmit={handleCreateCustomEntry}
              className={`p-3.5 sm:p-4 rounded-2xl border grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end ${
                isDark ? 'bg-black/40 border-white/10' : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div className="col-span-2">
                <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">
                  Aliment / Repas hors-plan
                </label>
                <input
                  type="text"
                  required
                  value={customEntryName}
                  onChange={(e) => setCustomEntryName(e.target.value)}
                  placeholder="Ex: Shaker whey, Banane..."
                  className={`w-full px-3 py-1.5 rounded-xl text-xs border outline-none ${
                    isDark
                      ? 'bg-white/[0.04] border-white/10 text-white placeholder:text-stone-500'
                      : 'bg-stone-50 border-stone-200 text-stone-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">kcal</label>
                <input
                  type="number"
                  min={0}
                  value={customEntryCalories}
                  onChange={(e) => setCustomEntryCalories(e.target.value)}
                  placeholder="250"
                  className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-mono border outline-none ${
                    isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Prot (g)</label>
                <input
                  type="number"
                  min={0}
                  value={customEntryProtein}
                  onChange={(e) => setCustomEntryProtein(e.target.value)}
                  placeholder="25"
                  className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-mono border outline-none ${
                    isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Gluc (g)</label>
                <input
                  type="number"
                  min={0}
                  value={customEntryCarbs}
                  onChange={(e) => setCustomEntryCarbs(e.target.value)}
                  placeholder="15"
                  className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-mono border outline-none ${
                    isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                  }`}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex-1">
                  <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Lip (g)</label>
                  <input
                    type="number"
                    min={0}
                    value={customEntryFat}
                    onChange={(e) => setCustomEntryFat(e.target.value)}
                    placeholder="5"
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-mono border outline-none ${
                      isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                    }`}
                  />
                </div>
                <button
                  type="submit"
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    isDark ? 'bg-white text-stone-950 hover:bg-stone-200' : 'bg-stone-900 text-white hover:bg-stone-800'
                  }`}
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomEntryForm(false)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Éditeur rapide des objectifs nutritionnels */}
          {showTargetsEditor && (
            <form
              onSubmit={handleSaveTargets}
              className={`p-3.5 sm:p-4 rounded-2xl border grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-end ${
                isDark ? 'bg-black/40 border-white/10' : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Objectif kcal</label>
                <input
                  type="number"
                  min={500}
                  value={draftTargets.calories}
                  onChange={(e) => setDraftTargets((prev) => ({ ...prev, calories: Number(e.target.value) }))}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-mono border outline-none ${
                    isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Protéines (g)</label>
                <input
                  type="number"
                  min={20}
                  value={draftTargets.protein}
                  onChange={(e) => setDraftTargets((prev) => ({ ...prev, protein: Number(e.target.value) }))}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-mono border outline-none ${
                    isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Glucides (g)</label>
                <input
                  type="number"
                  min={20}
                  value={draftTargets.carbs}
                  onChange={(e) => setDraftTargets((prev) => ({ ...prev, carbs: Number(e.target.value) }))}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-mono border outline-none ${
                    isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Lipides (g)</label>
                <input
                  type="number"
                  min={10}
                  value={draftTargets.fat}
                  onChange={(e) => setDraftTargets((prev) => ({ ...prev, fat: Number(e.target.value) }))}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-mono border outline-none ${
                    isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                  }`}
                />
              </div>
              <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                <button
                  type="submit"
                  className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    isDark ? 'bg-white text-stone-950 hover:bg-stone-200' : 'bg-stone-900 text-white hover:bg-stone-800'
                  }`}
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setShowTargetsEditor(false)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
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
              {!plan.days[swapMealState.dayIndex][swapMealState.mealType].id.startsWith('empty_') && (
                <button
                  onClick={() => {
                    onReplaceRecipe(swapMealState.dayIndex, swapMealState.mealType, 'empty');
                    setSwapMealState(null);
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition-colors flex items-center justify-between text-xs font-mono uppercase tracking-wider font-semibold cursor-pointer ${
                    isDark
                      ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-300'
                      : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700'
                  }`}
                >
                  <span>Retirer le plat de ce créneau</span>
                </button>
              )}
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
