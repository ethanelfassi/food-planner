'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ProductPreferencesMap,
  Recipe,
  WeeklyPlan,
  UserCustomizationSettings,
  Ingredient,
  DailyTrackerLog,
  TrackerCustomEntry,
  TrackerMealSlot,
  DEFAULT_USER_SETTINGS,
} from '@/types';
import { RECIPES } from '@/data/recipes';
import { INGREDIENTS } from '@/data/ingredients';
import { calculateRecipeScore, MIN_RECIPES_FOR_AUTO_GENERATION } from '@/lib/planner';
import { estimateTotalWeightGrams, resolveUnitWeightGrams } from '@/lib/nutrition';
import { 
  RefreshCw, 
  Sun, 
  Moon, 
  Coffee, 
  Zap, 
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Calendar, 
  Check, 
  Sparkles,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Heart,
  Plus,
  Minus,
  Search,
  ScanBarcode,
  Trash2,
  X,
  Target
} from 'lucide-react';

const TRACKER_MEAL_SLOTS: {
  key: TrackerMealSlot;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'breakfast', label: 'Petit-déjeuner', shortLabel: 'Petit-déj', icon: Coffee },
  { key: 'lunch', label: 'Déjeuner (Midi)', shortLabel: 'Déjeuner', icon: Sun },
  { key: 'dinner', label: 'Dîner (Soir)', shortLabel: 'Dîner', icon: Moon },
  { key: 'snack', label: 'Collations', shortLabel: 'Collation', icon: Zap },
];

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
  onUpdateCustomTrackerEntry?: (dayIndex: number, date: string | undefined, entryId: string, updates: Partial<TrackerCustomEntry>) => void;
  onDeleteCustomTrackerEntry?: (dayIndex: number, date: string | undefined, entryId: string) => void;
  onOpenBarcodeForTracker?: (slot: TrackerMealSlot) => void;
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
  onUpdateCustomTrackerEntry,
  onDeleteCustomTrackerEntry,
  onOpenBarcodeForTracker,
  onUpdateSettings,
}) => {
  const [internalDayIndex, setInternalDayIndex] = useState<number>(0);
  const [showCustomEntryForm, setShowCustomEntryForm] = useState(true);
  const [targetMealSlot, setTargetMealSlot] = useState<TrackerMealSlot>('snack');
  const [quickEntryMode, setQuickEntryMode] = useState<'search' | 'manual'>('search');
  const [justAddedLabel, setJustAddedLabel] = useState<string | null>(null);
  const justAddedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickSearchInputRef = useRef<HTMLInputElement | null>(null);

  const [customEntryName, setCustomEntryName] = useState('');
  const [customEntryCalories, setCustomEntryCalories] = useState('');
  const [customEntryProtein, setCustomEntryProtein] = useState('');
  const [customEntryCarbs, setCustomEntryCarbs] = useState('');
  const [customEntryFat, setCustomEntryFat] = useState('');
  const [quickFoodQuery, setQuickFoodQuery] = useState('');
  const [quickFoodQty, setQuickFoodQty] = useState('1');
  const [quickFoodUnit, setQuickFoodUnit] = useState('unite');

  const triggerJustAdded = useCallback((label: string) => {
    setJustAddedLabel(label);
    if (justAddedTimerRef.current) clearTimeout(justAddedTimerRef.current);
    justAddedTimerRef.current = setTimeout(() => {
      setJustAddedLabel(null);
    }, 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (justAddedTimerRef.current) clearTimeout(justAddedTimerRef.current);
    };
  }, []);

  const focusHubForSlot = useCallback((slot: TrackerMealSlot) => {
    setTargetMealSlot(slot);
    setShowCustomEntryForm(true);
    setShowTargetsEditor(false);
    setQuickEntryMode('search');
    requestAnimationFrame(() => {
      quickSearchInputRef.current?.focus();
    });
  }, []);

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

  const formatEntryLabel = useCallback(
    (baseName: string, qty: number, unit?: string, unitWeightGrams?: number) => {
      if (!unit) {
        return qty === 1 ? baseName : `${baseName} · ×${qty}`;
      }
      if (unit === 'g' || unit === 'ml') {
        return `${baseName} · ${qty}${unit}`;
      }
      if (unit === 'portion') {
        return `${baseName} · ${qty} portion${qty > 1 ? 's' : ''}`;
      }
      if (unit === 'c_a_soupe') {
        return `${baseName} · ${qty} c.à.s.`;
      }
      if (unit === 'unite') {
        const uLabel = qty > 1 ? 'unités' : 'unité';
        const gramsPart = unitWeightGrams ? ` (${Math.round(unitWeightGrams * qty)}g)` : '';
        return `${baseName} · ${qty} ${uLabel}${gramsPart}`;
      }
      return `${baseName} · ${qty} ${unit}`;
    },
    []
  );

  const customEntriesBySlot = useMemo(() => {
    const grouped: Record<TrackerMealSlot, TrackerCustomEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const entry of macroSummary.customEntries) {
      const slot: TrackerMealSlot = entry.mealSlot || 'snack';
      grouped[slot].push(entry);
    }
    return grouped;
  }, [macroSummary.customEntries]);

  const handleAdjustEntryQuantity = useCallback(
    (entry: TrackerCustomEntry, rawNewQty: number) => {
      if (!onUpdateCustomTrackerEntry || !activeMacroDay) return;
      const isWeightUnit = entry.unit === 'g' || entry.unit === 'ml';
      const minQty = isWeightUnit ? 5 : 0.5;
      const newQty = Math.max(minQty, Math.round(rawNewQty * 10) / 10);
      const oldQty = entry.quantity && entry.quantity > 0 ? entry.quantity : 1;
      const perUnit = entry.perUnitMacros || {
        calories: entry.calories / oldQty,
        protein: entry.protein / oldQty,
        carbs: (entry.carbs || 0) / oldQty,
        fat: (entry.fat || 0) / oldQty,
      };
      const baseName = entry.name.split(' · ')[0].trim() || entry.name;
      onUpdateCustomTrackerEntry(activeMacroDay.dayIndex, activeMacroDay.date, entry.id, {
        name: formatEntryLabel(baseName, newQty, entry.unit, entry.unitWeightGrams),
        quantity: newQty,
        calories: Math.max(0, Math.round(perUnit.calories * newQty)),
        protein: Math.max(0, Math.round(perUnit.protein * newQty)),
        carbs: Math.max(0, Math.round(perUnit.carbs * newQty)),
        fat: Math.max(0, Math.round(perUnit.fat * newQty)),
        perUnitMacros: perUnit,
      });
    },
    [onUpdateCustomTrackerEntry, activeMacroDay, formatEntryLabel]
  );

  const handleCreateCustomEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddCustomTrackerEntry || !activeMacroDay || !customEntryName.trim()) return;
    const cals = Math.max(0, Math.round(Number(customEntryCalories) || 0));
    const prot = Math.max(0, Math.round(Number(customEntryProtein) || 0));
    const carbs = Math.max(0, Math.round(Number(customEntryCarbs) || 0));
    const fat = Math.max(0, Math.round(Number(customEntryFat) || 0));
    const title = customEntryName.trim();

    onAddCustomTrackerEntry(activeMacroDay.dayIndex, activeMacroDay.date, {
      name: title,
      calories: cals,
      protein: prot,
      carbs,
      fat,
      mealSlot: targetMealSlot,
      quantity: 1,
      unit: 'portion',
      perUnitMacros: { calories: cals, protein: prot, carbs, fat },
    });
    setCustomEntryName('');
    setCustomEntryCalories('');
    setCustomEntryProtein('');
    setCustomEntryCarbs('');
    setCustomEntryFat('');
    triggerJustAdded(title);
  };

  const allQuickFoods = React.useMemo(() => {
    const merged: Ingredient[] = [];
    const seen = new Set<string>();
    for (const p of customProducts || []) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        merged.push(p);
      }
    }
    for (const ing of Object.values(INGREDIENTS as Record<string, Ingredient>)) {
      if (!seen.has(ing.id)) {
        seen.add(ing.id);
        merged.push(ing);
      }
    }
    return merged;
  }, [customProducts]);

  const allRecipesPool = React.useMemo(() => {
    return [...RECIPES, ...(customRecipes || [])];
  }, [customRecipes]);

  const quickFoodMatches = React.useMemo(() => {
    const q = quickFoodQuery
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (!q) {
      const customFirst = (customProducts || []).slice(0, 4);
      const customIds = new Set(customFirst.map((p) => p.id));
      const quickSnacks = Object.values(INGREDIENTS as Record<string, Ingredient>)
        .filter(
          (ing) =>
            !customIds.has(ing.id) &&
            /banane|pomme|yogourt|barre|oeuf|amande|whey|fromage|lait|avoine/i.test(ing.name)
        )
        .slice(0, 6);
      return [...customFirst, ...quickSnacks].slice(0, 8);
    }

    const terms = q.split(/\s+/).filter(Boolean);
    return allQuickFoods
      .filter((ing) => {
        const hay = `${ing.name} ${ing.aisle} ${ing.id}`
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        return terms.every((t) => hay.includes(t));
      })
      .slice(0, 10);
  }, [allQuickFoods, customProducts, quickFoodQuery]);

  const quickRecipeMatches = React.useMemo(() => {
    const q = quickFoodQuery
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (!q) {
      return (customRecipes || []).slice(0, 3);
    }

    const terms = q.split(/\s+/).filter(Boolean);
    return allRecipesPool
      .filter((rec) => {
        const hay = `${rec.title} ${(rec.tags || []).join(' ')} ${rec.mealType}`
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        return terms.every((t) => hay.includes(t));
      })
      .slice(0, 5);
  }, [allRecipesPool, customRecipes, quickFoodQuery]);

  const recentHabitualChips = React.useMemo(() => {
    type ShortcutItem = {
      key: string;
      baseName: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      quantity: number;
      unit: string;
      ingredientId?: string;
      recipeId?: string;
      unitWeightGrams?: number;
      perUnitMacros: { calories: number; protein: number; carbs: number; fat: number };
      count: number;
    };

    const byKey = new Map<string, ShortcutItem>();
    const logsForAccount = (trackerLogs || []).filter((l) => l.accountId === activeAccountId);

    for (const log of logsForAccount) {
      for (const entry of log.customEntries || []) {
        const baseName = entry.name.split(' · ')[0].trim() || entry.name;
        const key = entry.ingredientId || entry.recipeId || baseName.toLowerCase();
        const existing = byKey.get(key);
        if (existing) {
          existing.count += 1;
          continue;
        }
        const entryQty = entry.quantity && entry.quantity > 0 ? entry.quantity : 1;
        const perUnit = entry.perUnitMacros || {
          calories: entry.calories / entryQty,
          protein: entry.protein / entryQty,
          carbs: (entry.carbs || 0) / entryQty,
          fat: (entry.fat || 0) / entryQty,
        };
        const unit = entry.unit || 'portion';
        const defaultQty = unit === 'g' || unit === 'ml' ? 100 : 1;
        byKey.set(key, {
          key,
          baseName,
          calories: Math.max(0, Math.round(perUnit.calories * defaultQty)),
          protein: Math.max(0, Math.round(perUnit.protein * defaultQty)),
          carbs: Math.max(0, Math.round(perUnit.carbs * defaultQty)),
          fat: Math.max(0, Math.round(perUnit.fat * defaultQty)),
          quantity: defaultQty,
          unit,
          ingredientId: entry.ingredientId,
          recipeId: entry.recipeId,
          unitWeightGrams: entry.unitWeightGrams,
          perUnitMacros: perUnit,
          count: 1,
        });
      }
    }

    for (const prod of customProducts || []) {
      if (byKey.has(prod.id)) continue;
      const unitG = resolveUnitWeightGrams(prod.id, prod);
      const factor = unitG / 100;
      const cals = Math.max(0, Math.round(prod.macrosPer100g.calories * factor));
      const prot = Math.max(0, Math.round(prod.macrosPer100g.protein * factor));
      const carbs = Math.max(0, Math.round(prod.macrosPer100g.carbs * factor));
      const fat = Math.max(0, Math.round(prod.macrosPer100g.fat * factor));
      byKey.set(prod.id, {
        key: prod.id,
        baseName: prod.name,
        calories: cals,
        protein: prot,
        carbs,
        fat,
        quantity: 1,
        unit: 'unite',
        ingredientId: prod.id,
        unitWeightGrams: unitG,
        perUnitMacros: {
          calories: prod.macrosPer100g.calories * factor,
          protein: prod.macrosPer100g.protein * factor,
          carbs: prod.macrosPer100g.carbs * factor,
          fat: prod.macrosPer100g.fat * factor,
        },
        count: 0,
      });
    }

    return Array.from(byKey.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [trackerLogs, activeAccountId, customProducts]);

  const handleTapRecentShortcut = (shortcut: (typeof recentHabitualChips)[number]) => {
    if (!onAddCustomTrackerEntry || !activeMacroDay) return;
    const sameSlotMatch = customEntriesBySlot[targetMealSlot].find(
      (e) =>
        (shortcut.ingredientId && e.ingredientId === shortcut.ingredientId) ||
        (shortcut.recipeId && e.recipeId === shortcut.recipeId) ||
        e.name.split(' · ')[0].trim().toLowerCase() === shortcut.baseName.toLowerCase()
    );

    if (sameSlotMatch && onUpdateCustomTrackerEntry) {
      const step = shortcut.unit === 'g' || shortcut.unit === 'ml' ? 50 : 1;
      handleAdjustEntryQuantity(sameSlotMatch, (sameSlotMatch.quantity || 1) + step);
      triggerJustAdded(`+1 ${shortcut.baseName}`);
      return;
    }

    onAddCustomTrackerEntry(activeMacroDay.dayIndex, activeMacroDay.date, {
      name: formatEntryLabel(
        shortcut.baseName,
        shortcut.quantity,
        shortcut.unit,
        shortcut.unitWeightGrams
      ),
      calories: shortcut.calories,
      protein: shortcut.protein,
      carbs: shortcut.carbs,
      fat: shortcut.fat,
      mealSlot: targetMealSlot,
      quantity: shortcut.quantity,
      unit: shortcut.unit,
      ingredientId: shortcut.ingredientId,
      recipeId: shortcut.recipeId,
      unitWeightGrams: shortcut.unitWeightGrams,
      perUnitMacros: shortcut.perUnitMacros,
    });
    triggerJustAdded(shortcut.baseName);
  };

  const handleAddQuickCatalogFood = (food: Ingredient) => {
    if (!onAddCustomTrackerEntry || !activeMacroDay) return;
    const qty = Math.max(0.1, Number(quickFoodQty) || 1);
    const grams = estimateTotalWeightGrams(qty, quickFoodUnit, food.id, food);
    const oneUnitGrams = estimateTotalWeightGrams(1, quickFoodUnit, food.id, food);
    const factor = grams / 100;
    const unitFactor = oneUnitGrams / 100;
    const unitG = resolveUnitWeightGrams(food.id, food);

    onAddCustomTrackerEntry(activeMacroDay.dayIndex, activeMacroDay.date, {
      name: formatEntryLabel(food.name, qty, quickFoodUnit, quickFoodUnit === 'unite' ? unitG : undefined),
      calories: Math.max(0, Math.round(food.macrosPer100g.calories * factor)),
      protein: Math.max(0, Math.round(food.macrosPer100g.protein * factor)),
      carbs: Math.max(0, Math.round(food.macrosPer100g.carbs * factor)),
      fat: Math.max(0, Math.round(food.macrosPer100g.fat * factor)),
      mealSlot: targetMealSlot,
      quantity: qty,
      unit: quickFoodUnit,
      ingredientId: food.id,
      unitWeightGrams: quickFoodUnit === 'unite' ? unitG : undefined,
      perUnitMacros: {
        calories: food.macrosPer100g.calories * unitFactor,
        protein: food.macrosPer100g.protein * unitFactor,
        carbs: food.macrosPer100g.carbs * unitFactor,
        fat: food.macrosPer100g.fat * unitFactor,
      },
    });
    setQuickFoodQty('1');
    triggerJustAdded(food.name);
  };

  const handleAddQuickRecipe = (recipe: Recipe) => {
    if (!onAddCustomTrackerEntry || !activeMacroDay) return;
    const rawQty = Number(quickFoodQty) || 1;
    const qty = quickFoodUnit === 'g' || quickFoodUnit === 'ml' || rawQty <= 0 || rawQty > 20 ? 1 : rawQty;
    const perUnit = {
      calories: recipe.caloriesPerServing,
      protein: recipe.proteinPerServing,
      carbs: recipe.carbsPerServing,
      fat: recipe.fatPerServing,
    };

    onAddCustomTrackerEntry(activeMacroDay.dayIndex, activeMacroDay.date, {
      name: formatEntryLabel(recipe.title, qty, 'portion'),
      calories: Math.max(0, Math.round(perUnit.calories * qty)),
      protein: Math.max(0, Math.round(perUnit.protein * qty)),
      carbs: Math.max(0, Math.round(perUnit.carbs * qty)),
      fat: Math.max(0, Math.round(perUnit.fat * qty)),
      mealSlot: targetMealSlot,
      quantity: qty,
      unit: 'portion',
      recipeId: recipe.id,
      perUnitMacros: perUnit,
    });
    setQuickFoodQty('1');
    triggerJustAdded(recipe.title);
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
                  Journal &amp; Planning
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-stone-200/80 dark:bg-white/10 text-stone-800 dark:text-stone-200 font-semibold">
                  {activeMacroDay?.isToday ? "Aujourd'hui • " : ''}
                  {activeMacroDay?.formattedFullDate || activeMacroDay?.dayName}
                </span>
              </div>
              <p className="text-xs font-mono text-stone-500 dark:text-stone-400 mt-1">
                Ajoutez vos repas, collations et aliments mangés en direct ou planifiez votre semaine
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
                        ? 'bg-emerald-500 text-stone-950 border-emerald-400'
                        : 'bg-stone-900 text-white border-stone-900'
                      : isDark
                      ? 'bg-white/[0.04] border-white/10 text-stone-200 hover:bg-white/10'
                      : 'bg-white border-stone-200 text-stone-800 hover:bg-stone-50 shadow-xs'
                  }`}
                >
                  {showCustomEntryForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{showCustomEntryForm ? 'Masquer ajout' : '+ Ajout express'}</span>
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

          {/* Résumé compact si le Hub d'ajout express est replié */}
          {!showCustomEntryForm && macroSummary.customEntries.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-semibold">
                Journal du jour ({macroSummary.customEntries.length}) :
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
                </span>
              ))}
            </div>
          )}

          {/* HUB « AJOUT EXPRESS AU JOURNAL » AU 1ER PLAN */}
          {showCustomEntryForm && onAddCustomTrackerEntry && (
            <div
              className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border space-y-4 ${
                isDark
                  ? 'bg-white/[0.03] border-white/15 shadow-lg shadow-black/20'
                  : 'bg-white border-stone-200 shadow-sm'
              }`}
            >
              {/* En-tête du Hub + feedback fugace + rétractation */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider font-bold text-emerald-500">
                    <Sparkles className="w-3.5 h-3.5" />
                    Ajout express au journal
                  </span>
                  {justAddedLabel && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 animate-in fade-in duration-150">
                      <Check className="w-3 h-3 stroke-[3]" />
                      Ajouté : {justAddedLabel}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Switch Recherche vs Saisie libre */}
                  <div
                    className={`inline-flex items-center p-0.5 rounded-xl border text-[11px] font-mono ${
                      isDark ? 'bg-black/40 border-white/10' : 'bg-stone-100 border-stone-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setQuickEntryMode('search')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        quickEntryMode === 'search'
                          ? isDark
                            ? 'bg-white text-stone-950'
                            : 'bg-stone-900 text-white'
                          : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                      }`}
                    >
                      Catalogue &amp; Recettes
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickEntryMode('manual')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        quickEntryMode === 'manual'
                          ? isDark
                            ? 'bg-white text-stone-950'
                            : 'bg-stone-900 text-white'
                          : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                      }`}
                    >
                      Repas libre
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCustomEntryForm(false)}
                    className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer"
                    title="Réduire l'ajout express"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sélecteur du créneau cible */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {TRACKER_MEAL_SLOTS.map(({ key, shortLabel, icon: SlotIcon }) => {
                  const active = targetMealSlot === key;
                  const count = customEntriesBySlot[key].length;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTargetMealSlot(key)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-[11px] sm:text-xs font-mono font-semibold transition-all cursor-pointer ${
                        active
                          ? isDark
                            ? 'bg-emerald-500 text-stone-950 border-emerald-400 shadow-xs'
                            : 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : isDark
                          ? 'bg-white/[0.03] border-white/10 text-stone-300 hover:bg-white/[0.08]'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <SlotIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{shortLabel}</span>
                      {count > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            active
                              ? isDark
                                ? 'bg-stone-950/20 text-stone-950'
                                : 'bg-white/20 text-white'
                              : isDark
                              ? 'bg-white/10 text-stone-300'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Raccourcis « Récents & Habituels » en 1 tap */}
              {recentHabitualChips.length > 0 && (
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold">
                    Récents &amp; Habituels (1 tap → {TRACKER_MEAL_SLOTS.find((s) => s.key === targetMealSlot)?.shortLabel})
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {recentHabitualChips.map((chip) => (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={() => handleTapRecentShortcut(chip)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono shrink-0 transition-all active:scale-95 cursor-pointer ${
                          isDark
                            ? 'bg-white/[0.04] hover:bg-emerald-500/20 border-white/10 hover:border-emerald-500/40 text-stone-100'
                            : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
                        }`}
                        title={`Ajouter ${chip.baseName} (${chip.calories} kcal, ${chip.protein}g P)`}
                      >
                        <Plus className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="font-semibold max-w-[160px] truncate">{chip.baseName}</span>
                        <span className="text-[10px] text-stone-400 tabular-nums">{chip.calories}kcal</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode 1 : Recherche Unifiée (Aliments + Scannés + Recettes) + Bouton Scanner */}
              {quickEntryMode === 'search' ? (
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        ref={quickSearchInputRef}
                        type="text"
                        value={quickFoodQuery}
                        onChange={(e) => setQuickFoodQuery(e.target.value)}
                        placeholder="Rechercher un aliment, produit scanné ou recette..."
                        className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm border outline-none ${
                          isDark
                            ? 'bg-black/40 border-white/15 text-white placeholder:text-stone-500 focus:border-emerald-500/50'
                            : 'bg-stone-50 border-stone-200 text-stone-900 focus:border-stone-400'
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={quickFoodQty}
                        onChange={(e) => setQuickFoodQty(e.target.value)}
                        className={`w-16 sm:w-20 px-2.5 py-2 rounded-xl text-xs font-mono text-right border outline-none ${
                          isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                        }`}
                      />
                      <select
                        value={quickFoodUnit}
                        onChange={(e) => setQuickFoodUnit(e.target.value)}
                        className={`flex-1 sm:flex-initial px-2.5 py-2 rounded-xl text-xs font-mono border outline-none ${
                          isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                        }`}
                      >
                        <option value="unite">Unité</option>
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="c_a_soupe">c. à soupe</option>
                        <option value="tranche">Tranche</option>
                        <option value="canne">Canne</option>
                      </select>
                      {onOpenBarcodeForTracker && (
                        <button
                          type="button"
                          onClick={() => onOpenBarcodeForTracker(targetMealSlot)}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold border transition-all shrink-0 cursor-pointer active:scale-95 ${
                            isDark
                              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/35 text-emerald-300'
                              : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                          }`}
                          title="Scanner un code-barres et l'ajouter directement au journal"
                        >
                          <ScanBarcode className="w-4 h-4" />
                          <span>Scanner</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Résultats unifiés (Recettes + Produits scannés & Catalogue) */}
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
                    {quickRecipeMatches.map((rec) => {
                      const rawQty = Number(quickFoodQty) || 1;
                      const qty =
                        quickFoodUnit === 'g' || quickFoodUnit === 'ml' || rawQty <= 0 || rawQty > 20 ? 1 : rawQty;
                      const cals = Math.round(rec.caloriesPerServing * qty);
                      const prot = Math.round(rec.proteinPerServing * qty);
                      const carbs = Math.round(rec.carbsPerServing * qty);
                      const fat = Math.round(rec.fatPerServing * qty);
                      return (
                        <div
                          key={`rec_${rec.id}`}
                          className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-xs ${
                            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-stone-50 border-stone-200'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-stone-900 dark:text-stone-100 leading-snug break-words">
                                {rec.title}
                              </span>
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 font-semibold">
                                Recette
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400 mt-0.5">
                              {qty} portion{qty > 1 ? 's' : ''} · {cals} kcal · {prot}g P · {carbs}g G · {fat}g L
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddQuickRecipe(rec)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-semibold shrink-0 transition-all cursor-pointer active:scale-95 ${
                              isDark ? 'bg-white text-stone-950 hover:bg-stone-200' : 'bg-stone-900 text-white hover:bg-stone-800'
                            }`}
                          >
                            + Ajouter
                          </button>
                        </div>
                      );
                    })}

                    {quickFoodMatches.map((food) => {
                      const qty = Math.max(0.1, Number(quickFoodQty) || 1);
                      const grams = estimateTotalWeightGrams(qty, quickFoodUnit, food.id, food);
                      const unitG = resolveUnitWeightGrams(food.id, food);
                      const factor = grams / 100;
                      const cals = Math.round(food.macrosPer100g.calories * factor);
                      const prot = Math.round(food.macrosPer100g.protein * factor);
                      const carbs = Math.round(food.macrosPer100g.carbs * factor);
                      const fat = Math.round(food.macrosPer100g.fat * factor);
                      const isCustomFood = food.id.startsWith('barcode_') || food.id.startsWith('custom_prod_');
                      return (
                        <div
                          key={food.id}
                          className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-xs ${
                            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-stone-50 border-stone-200'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-stone-900 dark:text-stone-100 leading-snug break-words">
                                {food.name}
                              </span>
                              {isCustomFood && (
                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-semibold">
                                  Scanné
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400 mt-0.5">
                              {Math.round(grams)}g{quickFoodUnit === 'unite' ? ` (~${unitG}g/u)` : ''} · {cals} kcal · {prot}g P · {carbs}g G · {fat}g L
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddQuickCatalogFood(food)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-semibold shrink-0 transition-all cursor-pointer active:scale-95 ${
                              isDark ? 'bg-white text-stone-950 hover:bg-stone-200' : 'bg-stone-900 text-white hover:bg-stone-800'
                            }`}
                          >
                            + Ajouter
                          </button>
                        </div>
                      );
                    })}

                    {quickFoodMatches.length === 0 && quickRecipeMatches.length === 0 && (
                      <div className="text-[11px] font-mono text-stone-400 py-3 text-center">
                        Aucun résultat — passez en mode &laquo;&nbsp;Repas libre&nbsp;&raquo; ou scannez le code-barres.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Mode 2 : Saisie directe d'un repas complet / aliment libre sans créer de recette */
                <form
                  onSubmit={handleCreateCustomEntry}
                  className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end"
                >
                  <div className="col-span-2">
                    <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">
                      Repas / Aliment libre ({TRACKER_MEAL_SLOTS.find((s) => s.key === targetMealSlot)?.shortLabel})
                    </label>
                    <input
                      type="text"
                      required
                      value={customEntryName}
                      onChange={(e) => setCustomEntryName(e.target.value)}
                      placeholder="Ex: Poulet riz midi, Shaker whey, Resto..."
                      className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                        isDark
                          ? 'bg-black/40 border-white/15 text-white placeholder:text-stone-500'
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
                      placeholder="550"
                      className={`w-full px-2.5 py-2 rounded-xl text-xs font-mono border outline-none ${
                        isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
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
                      placeholder="40"
                      className={`w-full px-2.5 py-2 rounded-xl text-xs font-mono border outline-none ${
                        isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
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
                      placeholder="55"
                      className={`w-full px-2.5 py-2 rounded-xl text-xs font-mono border outline-none ${
                        isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                    />
                  </div>
                  <div className="flex items-end gap-1.5">
                    <div className="flex-1">
                      <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">Lip (g)</label>
                      <input
                        type="number"
                        min={0}
                        value={customEntryFat}
                        onChange={(e) => setCustomEntryFat(e.target.value)}
                        placeholder="15"
                        className={`w-full px-2.5 py-2 rounded-xl text-xs font-mono border outline-none ${
                          isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                        }`}
                      />
                    </div>
                    <button
                      type="submit"
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 ${
                        isDark ? 'bg-emerald-500 text-stone-950 hover:bg-emerald-400' : 'bg-stone-900 text-white hover:bg-stone-800'
                      }`}
                    >
                      Ajouter
                    </button>
                  </div>
                </form>
              )}
            </div>
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

      {/* Journal & Repas du Jour Sélectionné */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 sm:gap-3">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-serif text-xl sm:text-2xl font-normal text-stone-900 dark:text-white">
                Journal &amp; repas du <span className="italic">{currentDay.formattedFullDate || currentDay.dayName}</span>
              </h2>
              {currentDay.isToday && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                  Aujourd'hui
                </span>
              )}
            </div>
            <span className="font-mono text-xs text-stone-500 dark:text-stone-400 tabular-nums">
              Consommé : {macroSummary.consumed.calories} kcal • {macroSummary.consumed.protein}g P • {macroSummary.consumed.carbs}g G • {macroSummary.consumed.fat}g L
            </span>
          </div>
          <span className="text-xs text-stone-400 hidden md:block font-sans">
            Ajoutez vos aliments directement ou ajustez les quantités en direct
          </span>
        </div>

        {/* Grille Hybride des 4 Créneaux du Jour */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TRACKER_MEAL_SLOTS.map((slotInfo) => {
            const SlotIcon = slotInfo.icon;
            const plannedRecipe = currentDay[slotInfo.key];
            const hasPlannedRecipe = Boolean(plannedRecipe && !plannedRecipe.id.startsWith('empty_'));
            const isPlannedEaten = Boolean(currentDay.eatenMeals?.[slotInfo.key]);
            const slotEntries = customEntriesBySlot[slotInfo.key];

            const entriesCals = slotEntries.reduce((sum, e) => sum + (Number(e.calories) || 0), 0);
            const entriesProt = slotEntries.reduce((sum, e) => sum + (Number(e.protein) || 0), 0);
            const entriesCarbs = slotEntries.reduce((sum, e) => sum + (Number(e.carbs) || 0), 0);
            const entriesFat = slotEntries.reduce((sum, e) => sum + (Number(e.fat) || 0), 0);

            const plannedCals = hasPlannedRecipe && isPlannedEaten ? plannedRecipe.caloriesPerServing : 0;
            const plannedProt = hasPlannedRecipe && isPlannedEaten ? plannedRecipe.proteinPerServing : 0;
            const slotTotalCals = Math.round(entriesCals + plannedCals);
            const slotTotalProt = Math.round(entriesProt + plannedProt);

            return (
              <div
                key={slotInfo.key}
                className={`p-4 sm:p-5 rounded-3xl border transition-colors flex flex-col justify-between gap-3 ${
                  slotInfo.key === 'dinner' && isDark
                    ? 'liquid-glass border-white/15'
                    : cardGlassClass
                }`}
              >
                <div className="space-y-3">
                  {/* En-tête du créneau */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 font-semibold">
                        <SlotIcon className="w-3 h-3 text-stone-700 dark:text-stone-300" />
                        {slotInfo.label}
                      </span>
                      {(slotTotalCals > 0 || slotEntries.length > 0) && (
                        <div className="font-mono tabular-nums text-[11px] text-stone-500 dark:text-stone-400 mt-1.5 pl-0.5">
                          <span className="font-semibold text-stone-900 dark:text-stone-200">{slotTotalCals} kcal</span>
                          {' · '}
                          {slotTotalProt}g P
                          {entriesCarbs > 0 ? ` · ${Math.round(entriesCarbs)}g G` : ''}
                          {entriesFat > 0 ? ` · ${Math.round(entriesFat)}g L` : ''}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onAddCustomTrackerEntry && (
                        <button
                          type="button"
                          onClick={() => focusHubForSlot(slotInfo.key)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                            targetMealSlot === slotInfo.key && showCustomEntryForm
                              ? 'bg-emerald-500 text-stone-950'
                              : isDark
                              ? 'bg-white/10 hover:bg-white/15 text-white'
                              : 'bg-stone-900 hover:bg-stone-800 text-white'
                          }`}
                          title={`Ajouter un aliment ou repas dans ${slotInfo.label}`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Ajouter</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSwapMealState({ dayIndex: selectedDayIndex, mealType: slotInfo.key })}
                        className="text-[11px] text-stone-500 hover:text-stone-950 dark:hover:text-stone-200 transition-colors px-1.5 py-1 rounded-lg font-mono cursor-pointer"
                        title="Planifier ou remplacer une recette"
                      >
                        ▾
                      </button>
                    </div>
                  </div>

                  {/* Liste des éléments loggués dans ce créneau (avec édition de quantité live) */}
                  {slotEntries.length > 0 && (
                    <div className="space-y-2">
                      {slotEntries.map((entry) => {
                        const curQty = entry.quantity && entry.quantity > 0 ? entry.quantity : 1;
                        const isWeightUnit = entry.unit === 'g' || entry.unit === 'ml';
                        const decStep = isWeightUnit ? 25 : curQty <= 1 ? 0.5 : 1;
                        const incStep = isWeightUnit ? 25 : curQty < 1 ? 0.5 : 1;
                        return (
                          <div
                            key={entry.id}
                            className={`p-2.5 rounded-2xl border space-y-2 ${
                              isDark ? 'bg-black/35 border-white/10' : 'bg-stone-50 border-stone-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-stone-900 dark:text-stone-100 leading-snug break-words">
                                  {entry.name}
                                </div>
                                <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400 tabular-nums mt-0.5">
                                  {entry.calories} kcal · {entry.protein}g P · {entry.carbs ?? 0}g G · {entry.fat ?? 0}g L
                                </div>
                              </div>
                              {onDeleteCustomTrackerEntry && activeMacroDay && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onDeleteCustomTrackerEntry(activeMacroDay.dayIndex, activeMacroDay.date, entry.id)
                                  }
                                  className="p-1 rounded-lg text-stone-400 hover:text-rose-500 transition-colors shrink-0 cursor-pointer"
                                  title="Supprimer cet élément"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {onUpdateCustomTrackerEntry && activeMacroDay && (
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200/60 dark:border-white/5">
                                <span className="text-[10px] font-mono uppercase text-stone-400">
                                  Qté ({entry.unit === 'unite' ? 'unité' : entry.unit || 'portion'})
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustEntryQuantity(entry, curQty - decStep)}
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center border text-xs transition-colors cursor-pointer ${
                                      isDark
                                        ? 'bg-white/5 hover:bg-white/15 border-white/10 text-stone-200'
                                        : 'bg-white hover:bg-stone-100 border-stone-300 text-stone-800'
                                    }`}
                                    title="Diminuer la quantité"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min={isWeightUnit ? 5 : 0.5}
                                    step="any"
                                    value={curQty}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      if (v > 0) handleAdjustEntryQuantity(entry, v);
                                    }}
                                    className={`w-14 px-1.5 py-0.5 rounded-lg text-xs font-mono text-center border outline-none ${
                                      isDark
                                        ? 'bg-black/50 border-white/15 text-white'
                                        : 'bg-white border-stone-300 text-stone-900'
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustEntryQuantity(entry, curQty + incStep)}
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center border text-xs transition-colors cursor-pointer ${
                                      isDark
                                        ? 'bg-white/5 hover:bg-white/15 border-white/10 text-stone-200'
                                        : 'bg-white hover:bg-stone-100 border-stone-300 text-stone-800'
                                    }`}
                                    title="Augmenter la quantité"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Recette planifiée (uniquement si une vraie recette est assignée à ce créneau) */}
                  {hasPlannedRecipe && (
                    <div
                      onClick={() => onSelectRecipe(plannedRecipe)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-colors group ${
                        isDark
                          ? 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10'
                          : 'bg-white/70 hover:bg-white border-stone-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                          Recette prévue
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleMealEaten?.(selectedDayIndex, currentDay.date, slotInfo.key);
                          }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                            isPlannedEaten
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : isDark
                              ? 'bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                          }`}
                        >
                          <Check className={`w-3 h-3 ${isPlannedEaten ? 'stroke-[3]' : 'opacity-40'}`} />
                          <span>{isPlannedEaten ? 'Mangé' : 'Manger'}</span>
                        </button>
                      </div>
                      <h3 className="font-serif text-base font-medium tracking-tight text-stone-900 dark:text-white group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors">
                        {plannedRecipe.title}
                      </h3>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 line-clamp-2 font-sans">
                        {plannedRecipe.ingredients.length > 0
                          ? plannedRecipe.ingredients
                              .slice(0, 4)
                              .map((i) => getIngredientDisplayName(i.ingredientId))
                              .join(', ')
                          : 'Aucun ingrédient défini'}
                      </p>
                      <div className="mt-2 pt-2 border-t border-stone-200/60 dark:border-white/10 flex items-center justify-between text-[11px] font-mono tabular-nums">
                        <span className="text-stone-700 dark:text-stone-300">
                          {plannedRecipe.caloriesPerServing} kcal · {plannedRecipe.proteinPerServing}g P
                        </span>
                        <span className="text-stone-500 flex items-center gap-0.5">
                          Voir <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  )}

                  {/* État vide épuré quand rien n'est encore loggué ni planifié */}
                  {!hasPlannedRecipe && slotEntries.length === 0 && (
                    <div
                      className={`p-4 rounded-2xl border border-dashed text-center space-y-2.5 ${
                        isDark ? 'border-white/10 bg-black/20' : 'border-stone-300 bg-stone-50/70'
                      }`}
                    >
                      <p className="text-xs font-mono text-stone-400">
                        Rien de noté pour {slotInfo.shortLabel.toLowerCase()}
                      </p>
                      {onAddCustomTrackerEntry && (
                        <button
                          type="button"
                          onClick={() => focusHubForSlot(slotInfo.key)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            isDark
                              ? 'bg-white/10 hover:bg-emerald-500 hover:text-stone-950 text-stone-100'
                              : 'bg-stone-900 hover:bg-stone-800 text-white'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter au {slotInfo.shortLabel.toLowerCase()}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSwapMealState({ dayIndex: selectedDayIndex, mealType: slotInfo.key })}
                        className="text-[11px] font-mono text-stone-500 hover:text-stone-900 dark:hover:text-white underline cursor-pointer"
                      >
                        Planifier une recette ▾
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
