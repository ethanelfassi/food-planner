'use client';

import React, { useState } from 'react';
import { Recipe, WeeklyPlan } from '@/types';
import { RECIPES } from '@/data/recipes';
import { 
  RefreshCw, 
  Sun, 
  Moon, 
  Coffee, 
  Zap, 
  ChevronRight, 
  Check, 
  Sparkles,
  Flame,
  Dumbbell
} from 'lucide-react';

interface WeeklyPlannerViewProps {
  plan: WeeklyPlan;
  isDark: boolean;
  onRegenerateAll: () => void;
  onReplaceRecipe: (dayIndex: number, mealType: 'breakfast' | 'dinner' | 'snack', newRecipeId: string) => void;
  onSelectRecipe: (recipe: Recipe) => void;
}

export const WeeklyPlannerView: React.FC<WeeklyPlannerViewProps> = ({
  plan,
  isDark,
  onRegenerateAll,
  onReplaceRecipe,
  onSelectRecipe,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [swapMealState, setSwapMealState] = useState<{
    dayIndex: number;
    mealType: 'breakfast' | 'dinner' | 'snack';
  } | null>(null);

  const currentDay = plan.days[selectedDayIndex];

  const availableReplacements = swapMealState
    ? RECIPES.filter((r) => {
        if (swapMealState.mealType === 'breakfast') return r.mealType === 'dejeuner';
        if (swapMealState.mealType === 'dinner') return r.mealType === 'souper';
        if (swapMealState.mealType === 'snack') return r.mealType === 'collation';
        return false;
      })
    : [];

  const cardGlassClass = isDark
    ? 'liquid-glass text-stone-100 hover:border-white/20'
    : 'liquid-glass-light text-stone-900 hover:border-stone-400/80';

  return (
    <div className="space-y-8">
      {/* Hero Header Éditorial & Anneaux d'Objectif Apple Fitness */}
      <div
        className={`rounded-3xl p-6 sm:p-8 transition-all ${
          isDark ? 'liquid-glass' : 'liquid-glass-light'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Menu Personnalisé • Québec
              </span>
              <span className="text-stone-400 text-xs">•</span>
              <span className="text-xs text-stone-500 dark:text-stone-400 font-sans">
                Prise de masse 75 kg
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-stone-900 dark:text-white">
              Semaine Nutritionnelle <span className="italic font-light">Sur-Mesure</span>
            </h1>

            <p className="text-sm text-stone-600 dark:text-stone-300 mt-2 max-w-2xl font-sans leading-relaxed">
              Chaque souper est cuisiné frais le soir en portion double pour garnir automatiquement votre dîner du lendemain. Zéro perte de temps, 100 % d'aliments complets.
            </p>
          </div>

          {/* Synthèse Métabolique Apple Fitness style */}
          <div className="flex items-center gap-4 self-start lg:self-auto">
            <div
              className={`flex items-center gap-5 p-4 rounded-2xl border ${
                isDark
                  ? 'bg-black/30 border-white/10'
                  : 'bg-white/80 border-stone-200/80 shadow-sm'
              }`}
            >
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500" /> Énergie
                </div>
                <div className="font-mono tabular-nums text-xl sm:text-2xl font-light mt-0.5 text-stone-900 dark:text-white">
                  {plan.avgDailyCalories} <span className="text-xs text-stone-400 font-sans">kcal/j</span>
                </div>
              </div>

              <div className={`h-8 w-[1px] ${isDark ? 'bg-white/10' : 'bg-stone-200'}`} />

              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1">
                  <Dumbbell className="w-3 h-3 text-emerald-500" /> Protéines
                </div>
                <div className="font-mono tabular-nums text-xl sm:text-2xl font-light mt-0.5 text-stone-900 dark:text-white">
                  {plan.avgDailyProtein} <span className="text-xs text-stone-400 font-sans">g/j</span>
                </div>
              </div>
            </div>

            <button
              onClick={onRegenerateAll}
              className={`p-3.5 rounded-2xl border transition-all active:scale-95 ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-50 border-stone-900 shadow-sm'
              }`}
              title="Régénérer le menu de la semaine"
            >
              <RefreshCw className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
            </button>
          </div>
        </div>

        {/* Sélecteur des 7 Jours (Nordic Minimalist Pills) */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 mt-8 pt-6 border-t border-stone-200/60 dark:border-white/10">
          {plan.days.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            return (
              <button
                key={day.dayName}
                onClick={() => setSelectedDayIndex(idx)}
                className={`py-3 px-1 sm:px-2 rounded-2xl text-center transition-all flex flex-col items-center gap-1 ${
                  isSelected
                    ? isDark
                      ? 'bg-white text-stone-950 font-bold shadow-xl shadow-black/30 ring-1 ring-white'
                      : 'bg-stone-900 text-stone-50 font-bold shadow-lg shadow-stone-900/10'
                    : isDark
                    ? 'bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-stone-400'
                    : 'bg-stone-100/60 hover:bg-stone-200/70 border border-stone-200/60 text-stone-600'
                }`}
              >
                <span className="font-mono text-[10px] sm:text-xs uppercase tracking-wider">
                  {day.dayName.slice(0, 3)}
                </span>
                <span
                  className={`font-mono tabular-nums text-xs sm:text-sm font-semibold ${
                    isSelected
                      ? isDark
                        ? 'text-stone-950'
                        : 'text-stone-50'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {day.dailyProtein}g
                </span>
                <span
                  className={`text-[9px] font-mono tabular-nums hidden sm:block ${
                    isSelected ? 'opacity-70' : 'text-stone-400'
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
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h2 className="font-serif text-2xl font-normal text-stone-900 dark:text-white">
              Repas du <span className="italic">{currentDay.dayName}</span>
            </h2>
            <span className="font-mono text-xs text-stone-500 dark:text-stone-400 tabular-nums">
              {currentDay.dailyCalories} kcal • {currentDay.dailyProtein}g protéines
            </span>
          </div>
          <span className="text-xs text-stone-400 hidden sm:block font-sans">
            Sélectionnez une carte pour consulter les instructions
          </span>
        </div>

        {/* Grille des 4 Repas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. DÉJEUNER */}
          <div
            onClick={() => onSelectRecipe(currentDay.breakfast)}
            className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between group ${cardGlassClass}`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  <Coffee className="w-3 h-3 text-amber-500" /> Déjeuner (~750 kcal)
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSwapMealState({ dayIndex: selectedDayIndex, mealType: 'breakfast' });
                  }}
                  className="text-xs text-stone-400 hover:text-emerald-500 transition-colors px-2 py-0.5 rounded-lg"
                >
                  Changer ▾
                </button>
              </div>

              <h3 className="font-serif text-lg font-medium tracking-tight text-stone-900 dark:text-white group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors">
                {currentDay.breakfast.title}
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 line-clamp-2 font-sans">
                {currentDay.breakfast.ingredients.slice(0, 4).map((i) => i.ingredientId.replace(/_/g, ' ')).join(', ')}...
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-stone-200 dark:border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className="font-semibold text-amber-900 dark:text-amber-300">
                  {currentDay.breakfast.caloriesPerServing} kcal
                </span>
                <span className="font-semibold text-emerald-900 dark:text-emerald-400">
                  {currentDay.breakfast.proteinPerServing}g prot
                </span>
              </div>
              <span className="text-stone-600 dark:text-stone-400 group-hover:text-stone-950 dark:group-hover:text-stone-200 flex items-center gap-0.5 transition-colors font-medium">
                Voir recette <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* 2. DÎNER (MIDI) - Portion de la veille */}
          <div
            onClick={() => onSelectRecipe(currentDay.lunch)}
            className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between group ${cardGlassClass}`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 font-semibold">
                  <Sun className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Dîner (Midi)
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-semibold">
                  Portion de la veille
                </span>
              </div>

              <h3 className="font-serif text-lg font-medium tracking-tight text-stone-900 dark:text-white group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors">
                {currentDay.lunch.title}
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 font-sans">
                Cuisiné hier soir en portion double. Prêt à réchauffer au dîner.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-stone-200 dark:border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className="font-semibold text-amber-900 dark:text-amber-300">
                  {currentDay.lunch.caloriesPerServing} kcal
                </span>
                <span className="font-semibold text-emerald-900 dark:text-emerald-400">
                  {currentDay.lunch.proteinPerServing}g prot
                </span>
              </div>
              <span className="text-stone-600 dark:text-stone-400 group-hover:text-stone-950 dark:group-hover:text-stone-200 flex items-center gap-0.5 transition-colors font-medium">
                Voir fiche <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* 3. SOUPER (SOIR) - Cuisiné en 2 portions */}
          <div
            onClick={() => onSelectRecipe(currentDay.dinner)}
            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between group ${
              isDark
                ? 'liquid-glass border-white/20 hover:border-white/40'
                : 'liquid-glass-light border-stone-400 hover:border-stone-800 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-white/10 font-semibold">
                  <Moon className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Souper du Soir (Cuisiné frais)
                </span>
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

              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-950 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded-md font-semibold">
                  2 portions à préparer
                </span>
                <span className="text-xs text-stone-600 dark:text-stone-400 font-mono">
                  ~{currentDay.dinner.prepTimeMinutes + currentDay.dinner.cookTimeMinutes} min
                </span>
              </div>

              <h3 className="font-serif text-lg font-medium tracking-tight text-stone-900 dark:text-white group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors">
                {currentDay.dinner.title}
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 line-clamp-2 font-sans">
                {currentDay.dinner.ingredients.slice(0, 4).map((i) => i.ingredientId.replace(/_/g, ' ')).join(', ')}...
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-stone-200 dark:border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className="font-semibold text-amber-900 dark:text-amber-300">
                  {currentDay.dinner.caloriesPerServing} kcal
                </span>
                <span className="font-semibold text-emerald-900 dark:text-emerald-400">
                  {currentDay.dinner.proteinPerServing}g prot
                </span>
              </div>
              <span className="text-stone-600 dark:text-stone-400 group-hover:text-stone-950 dark:group-hover:text-stone-200 flex items-center gap-0.5 transition-colors font-medium">
                Voir recette <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* 4. COLLATION SPORTIVE */}
          <div
            onClick={() => onSelectRecipe(currentDay.snack)}
            className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between group ${cardGlassClass}`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 font-semibold">
                  <Zap className="w-3 h-3 text-amber-700 dark:text-amber-400" /> Collation Sportive (~450 kcal)
                </span>
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

              <h3 className="font-serif text-lg font-medium tracking-tight text-stone-900 dark:text-white group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors">
                {currentDay.snack.title}
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 font-sans">
                Aliments entiers denses : yogourt grec, cottage, fruits, noix, beurre d'arachide.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-stone-200 dark:border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className="font-semibold text-amber-900 dark:text-amber-300">
                  {currentDay.snack.caloriesPerServing} kcal
                </span>
                <span className="font-semibold text-emerald-900 dark:text-emerald-400">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
          <div
            className={`rounded-3xl max-w-lg w-full p-6 shadow-2xl border ${
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
              {availableReplacements.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => {
                    onReplaceRecipe(swapMealState.dayIndex, swapMealState.mealType, rec.id);
                    setSwapMealState(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                    isDark
                      ? 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5'
                      : 'bg-white/80 hover:bg-white border-stone-200'
                  }`}
                >
                  <div>
                    <div className="font-serif font-medium text-sm text-stone-900 dark:text-white">
                      {rec.title}
                    </div>
                    <div className="font-mono tabular-nums text-xs text-stone-400 mt-0.5">
                      {rec.caloriesPerServing} kcal • {rec.proteinPerServing}g protéines
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-emerald-500 opacity-60" />
                </button>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-stone-200/60 dark:border-white/10 flex justify-end">
              <button
                onClick={() => setSwapMealState(null)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
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
