'use client';

import React, { useState } from 'react';
import { Recipe, WeeklyPlan } from '@/types';
import { RECIPES } from '@/data/recipes';
import { RefreshCw, Flame, Dumbbell, Sun, Moon, Coffee, Zap, ChevronRight, CheckCircle2 } from 'lucide-react';

interface WeeklyPlannerViewProps {
  plan: WeeklyPlan;
  onRegenerateAll: () => void;
  onReplaceRecipe: (dayIndex: number, mealType: 'breakfast' | 'dinner' | 'snack', newRecipeId: string) => void;
  onSelectRecipe: (recipe: Recipe) => void;
}

export const WeeklyPlannerView: React.FC<WeeklyPlannerViewProps> = ({
  plan,
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

  return (
    <div className="space-y-6">
      {/* Bannière Synthèse Semaine */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Programme Hebdomadaire Sur-Mesure
              </span>
              <span className="text-xs text-slate-400">1 Personne • Metro Québec</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Menu Prise de Masse Active (~3 050 kcal)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              💡 <span className="font-semibold text-emerald-300">Règle d'or :</span> Vous cuisinez un bon plat chaque soir. Une portion double est automatiquement mise de côté pour votre dîner du lendemain.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="flex items-center gap-4 bg-slate-950/70 border border-slate-700/50 rounded-xl px-4 py-2.5">
              <div className="text-center">
                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" /> Moyenne
                </div>
                <div className="text-base font-bold text-amber-300">
                  {plan.avgDailyCalories} <span className="text-[10px] font-normal text-slate-400">kcal/j</span>
                </div>
              </div>
              <div className="h-7 w-[1px] bg-slate-800" />
              <div className="text-center">
                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <Dumbbell className="w-3 h-3 text-emerald-400" /> Protéines
                </div>
                <div className="text-base font-bold text-emerald-300">
                  {plan.avgDailyProtein} <span className="text-[10px] font-normal text-slate-400">g/j</span>
                </div>
              </div>
            </div>

            <button
              onClick={onRegenerateAll}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs sm:text-sm font-semibold transition-all border border-slate-700 active:scale-95 shadow-sm"
              title="Générer une nouvelle proposition pour la semaine"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Régénérer</span>
            </button>
          </div>
        </div>

        {/* Sélecteur de jour (Lundi -> Dimanche) */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mt-6 pt-4 border-t border-slate-800">
          {plan.days.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            return (
              <button
                key={day.dayName}
                onClick={() => setSelectedDayIndex(idx)}
                className={`py-2 px-1 sm:p-2.5 rounded-xl text-center transition-all flex flex-col items-center gap-0.5 sm:gap-1 ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/40'
                }`}
              >
                <span className="text-[11px] sm:text-xs uppercase tracking-tight">
                  {day.dayName.slice(0, 3)}
                </span>
                <span className={`text-[10px] sm:text-xs font-semibold ${isSelected ? 'text-slate-900' : 'text-emerald-400'}`}>
                  {day.dailyProtein}g
                </span>
                <span className={`text-[9px] hidden sm:block ${isSelected ? 'text-slate-800' : 'text-slate-400'}`}>
                  {day.dailyCalories} kcal
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Détails du Jour Sélectionné */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Repas du {currentDay.dayName}</span>
            </h2>
            <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded-full font-medium">
              Total : {currentDay.dailyCalories} kcal • {currentDay.dailyProtein}g prot
            </span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:block">
            Cliquez sur un repas pour voir la recette et les instructions
          </span>
        </div>

        {/* Grille des 4 Repas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. DÉJEUNER */}
          <div 
            onClick={() => onSelectRecipe(currentDay.breakfast)}
            className="group relative bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 sm:p-5 transition-all hover:shadow-xl cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                  <Coffee className="w-3.5 h-3.5" /> Déjeuner (~750 kcal)
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSwapMealState({ dayIndex: selectedDayIndex, mealType: 'breakfast' });
                  }}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-colors px-2 py-0.5 rounded-md hover:bg-slate-800"
                >
                  Changer ▾
                </button>
              </div>

              <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-emerald-300 transition-colors">
                {currentDay.breakfast.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                {currentDay.breakfast.ingredients.slice(0, 4).map((i) => i.ingredientId.replace(/_/g, ' ')).join(', ')}...
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-amber-300">{currentDay.breakfast.caloriesPerServing} kcal</span>
                <span className="font-bold text-emerald-400">{currentDay.breakfast.proteinPerServing}g prot</span>
              </div>
              <span className="text-slate-400 flex items-center gap-0.5 group-hover:text-emerald-400 transition-colors">
                Voir recette <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* 2. DÎNER (MIDI) - Portion de la veille */}
          <div 
            onClick={() => onSelectRecipe(currentDay.lunch)}
            className="group relative bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 sm:p-5 transition-all hover:shadow-xl cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-400/10 px-2.5 py-0.5 rounded-full border border-sky-400/20">
                  <Sun className="w-3.5 h-3.5" /> Dîner (Midi)
                </span>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Prêt au frigo (veille)
                </span>
              </div>

              <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-emerald-300 transition-colors">
                {currentDay.lunch.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Portion double cuisinée la veille au soir. Il ne reste plus qu'à réchauffer au dîner !
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-amber-300">{currentDay.lunch.caloriesPerServing} kcal</span>
                <span className="font-bold text-emerald-400">{currentDay.lunch.proteinPerServing}g prot</span>
              </div>
              <span className="text-slate-400 flex items-center gap-0.5 group-hover:text-emerald-400 transition-colors">
                Voir fiche <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* 3. SOUPER (SOIR) - Cuisiné en 2 portions */}
          <div 
            onClick={() => onSelectRecipe(currentDay.dinner)}
            className="group relative bg-slate-900/90 border-2 border-emerald-500/40 hover:border-emerald-500 rounded-2xl p-4 sm:p-5 transition-all hover:shadow-xl cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                  <Moon className="w-3.5 h-3.5" /> Souper du Soir (Cuisiné frais)
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSwapMealState({ dayIndex: selectedDayIndex, mealType: 'dinner' });
                  }}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-colors px-2 py-0.5 rounded-md hover:bg-slate-800"
                >
                  Changer ▾
                </button>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                  2 portions à préparer
                </span>
                <span className="text-[11px] text-slate-400">
                  ~{currentDay.dinner.prepTimeMinutes + currentDay.dinner.cookTimeMinutes} min de cuisson
                </span>
              </div>

              <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-emerald-300 transition-colors">
                {currentDay.dinner.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                {currentDay.dinner.ingredients.slice(0, 4).map((i) => i.ingredientId.replace(/_/g, ' ')).join(', ')}...
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-amber-300">{currentDay.dinner.caloriesPerServing} kcal</span>
                <span className="font-bold text-emerald-400">{currentDay.dinner.proteinPerServing}g prot</span>
              </div>
              <span className="text-slate-400 flex items-center gap-0.5 group-hover:text-emerald-400 transition-colors">
                Voir recette <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* 4. COLLATION SPORTIVE */}
          <div 
            onClick={() => onSelectRecipe(currentDay.snack)}
            className="group relative bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 sm:p-5 transition-all hover:shadow-xl cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-400/10 px-2.5 py-0.5 rounded-full border border-rose-400/20">
                  <Zap className="w-3.5 h-3.5" /> Collation Sportive (~450 kcal)
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSwapMealState({ dayIndex: selectedDayIndex, mealType: 'snack' });
                  }}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-colors px-2 py-0.5 rounded-md hover:bg-slate-800"
                >
                  Changer ▾
                </button>
              </div>

              <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-emerald-300 transition-colors">
                {currentDay.snack.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                Aliments entiers denses : yogourt grec, cottage, fruits, noix, beurre d'arachide.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-amber-300">{currentDay.snack.caloriesPerServing} kcal</span>
                <span className="font-bold text-emerald-400">{currentDay.snack.proteinPerServing}g prot</span>
              </div>
              <span className="text-slate-400 flex items-center gap-0.5 group-hover:text-emerald-400 transition-colors">
                Voir détails <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Remplacement / Swap Popover */}
      {swapMealState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl text-slate-100">
            <h3 className="font-bold text-lg mb-1">
              Remplacer pour le {plan.days[swapMealState.dayIndex].dayName}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Choisissez une recette alternative du catalogue :
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {availableReplacements.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => {
                    onReplaceRecipe(swapMealState.dayIndex, swapMealState.mealType, rec.id);
                    setSwapMealState(null);
                  }}
                  className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/50 transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-sm text-white">{rec.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {rec.caloriesPerServing} kcal • {rec.proteinPerServing}g protéines
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-60" />
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSwapMealState(null)}
                className="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
