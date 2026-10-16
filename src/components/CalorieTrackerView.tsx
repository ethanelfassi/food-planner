'use client';

import React, { useState } from 'react';
import { DayPlan } from '@/types';
import { Flame, Dumbbell, Plus, Check, Circle, Trophy, AlertCircle, Apple } from 'lucide-react';

interface CalorieTrackerViewProps {
  currentDayPlan: DayPlan;
  isDark: boolean;
}

interface CustomEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
}

export const CalorieTrackerView: React.FC<CalorieTrackerViewProps> = ({ currentDayPlan, isDark }) => {
  const [eatenMeals, setEatenMeals] = useState<Record<string, boolean>>({
    breakfast: true,
    lunch: true,
    dinner: false,
    snack: false,
  });

  const [customEntries, setCustomEntries] = useState<CustomEntry[]>([]);
  const [extraName, setExtraName] = useState('');
  const [extraCals, setExtraCals] = useState('');
  const [extraProt, setExtraProt] = useState('');

  const toggleMeal = (key: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    setEatenMeals((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddExtra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraName.trim()) return;
    const newEntry: CustomEntry = {
      id: `extra_${Date.now()}`,
      name: extraName.trim(),
      calories: parseInt(extraCals) || 0,
      protein: parseInt(extraProt) || 0,
    };
    setCustomEntries((prev) => [...prev, newEntry]);
    setExtraName('');
    setExtraCals('');
    setExtraProt('');
  };

  let consumedCalories = 0;
  let consumedProtein = 0;

  if (eatenMeals.breakfast) {
    consumedCalories += currentDayPlan.breakfast.caloriesPerServing;
    consumedProtein += currentDayPlan.breakfast.proteinPerServing;
  }
  if (eatenMeals.lunch) {
    consumedCalories += currentDayPlan.lunch.caloriesPerServing;
    consumedProtein += currentDayPlan.lunch.proteinPerServing;
  }
  if (eatenMeals.dinner) {
    consumedCalories += currentDayPlan.dinner.caloriesPerServing;
    consumedProtein += currentDayPlan.dinner.proteinPerServing;
  }
  if (eatenMeals.snack) {
    consumedCalories += currentDayPlan.snack.caloriesPerServing;
    consumedProtein += currentDayPlan.snack.proteinPerServing;
  }

  for (const extra of customEntries) {
    consumedCalories += extra.calories;
    consumedProtein += extra.protein;
  }

  const targetCalories = 3050;
  const targetProtein = 165;
  const calPercent = Math.min(100, Math.round((consumedCalories / targetCalories) * 100));
  const protPercent = Math.min(100, Math.round((consumedProtein / targetProtein) * 100));

  const cardGlassClass = isDark ? 'liquid-glass' : 'liquid-glass-light';

  return (
    <div className="space-y-8">
      {/* Anneaux Métaboliques Apple Fitness+ */}
      <div className={`rounded-3xl p-6 sm:p-8 transition-all border ${cardGlassClass}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Suivi Nutritionnel • {currentDayPlan.dayName}
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-stone-900 dark:text-white">
              Activité & <span className="italic">Métabolisme</span>
            </h1>

            <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 font-sans">
              Consignez vos repas consommés en direct pour maintenir votre progression de prise de masse.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {protPercent >= 100 ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-mono">
                <Trophy className="w-4 h-4 text-emerald-500" />
                <span>Objectif Protéines Atteint !</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-mono">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Reste {Math.max(0, targetProtein - consumedProtein)} g de protéines</span>
              </div>
            )}
          </div>
        </div>

        {/* Jauges Apple Activity Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-stone-200/60 dark:border-white/10">
          {/* Énergie */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-black/30 border-white/5' : 'bg-white/80 border-stone-200'
            }`}
          >
            <div className="flex justify-between items-center mb-2 font-mono text-xs">
              <span className="text-stone-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Calories
              </span>
              <span className="tabular-nums font-semibold text-stone-900 dark:text-white">
                {consumedCalories} / {targetCalories} kcal ({calPercent}%)
              </span>
            </div>
            <div className="h-2.5 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${calPercent}%` }}
              />
            </div>
          </div>

          {/* Protéines */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-black/30 border-white/5' : 'bg-white/80 border-stone-200'
            }`}
          >
            <div className="flex justify-between items-center mb-2 font-mono text-xs">
              <span className="text-stone-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Dumbbell className="w-3.5 h-3.5 text-emerald-500" /> Protéines
              </span>
              <span className="tabular-nums font-semibold text-stone-900 dark:text-white">
                {consumedProtein} / {targetProtein} g ({protPercent}%)
              </span>
            </div>
            <div className="h-2.5 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${protPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Repas du Jour */}
      <div className={`rounded-3xl p-6 sm:p-8 transition-all border ${cardGlassClass}`}>
        <h2 className="font-serif text-2xl font-normal text-stone-900 dark:text-white mb-4">
          Repas de la Journée <span className="italic">({currentDayPlan.dayName})</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Déjeuner */}
          <div
            onClick={() => toggleMeal('breakfast')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              eatenMeals.breakfast
                ? isDark
                  ? 'bg-white/[0.06] border-emerald-500/40'
                  : 'bg-white border-emerald-700/40 shadow-xs'
                : isDark
                ? 'bg-white/[0.01] border-white/5'
                : 'bg-stone-100/60 border-stone-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                  eatenMeals.breakfast ? 'bg-emerald-600 text-white' : 'border border-stone-400'
                }`}
              >
                {eatenMeals.breakfast && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Déjeuner
                </div>
                <div className="font-serif text-sm font-medium text-stone-900 dark:text-white">
                  {currentDayPlan.breakfast.title}
                </div>
              </div>
            </div>
            <div className="text-right font-mono tabular-nums text-xs">
              <div className="text-stone-900 dark:text-white">{currentDayPlan.breakfast.caloriesPerServing} kcal</div>
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold">{currentDayPlan.breakfast.proteinPerServing}g prot</div>
            </div>
          </div>

          {/* Dîner */}
          <div
            onClick={() => toggleMeal('lunch')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              eatenMeals.lunch
                ? isDark
                  ? 'bg-white/[0.06] border-emerald-500/40'
                  : 'bg-white border-emerald-700/40 shadow-xs'
                : isDark
                ? 'bg-white/[0.01] border-white/5'
                : 'bg-stone-100/60 border-stone-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                  eatenMeals.lunch ? 'bg-emerald-600 text-white' : 'border border-stone-400'
                }`}
              >
                {eatenMeals.lunch && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Dîner (Midi)
                </div>
                <div className="font-serif text-sm font-medium text-stone-900 dark:text-white">
                  {currentDayPlan.lunch.title}
                </div>
              </div>
            </div>
            <div className="text-right font-mono tabular-nums text-xs">
              <div className="text-stone-900 dark:text-white">{currentDayPlan.lunch.caloriesPerServing} kcal</div>
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold">{currentDayPlan.lunch.proteinPerServing}g prot</div>
            </div>
          </div>

          {/* Souper */}
          <div
            onClick={() => toggleMeal('dinner')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              eatenMeals.dinner
                ? isDark
                  ? 'bg-white/[0.06] border-emerald-500/40'
                  : 'bg-white border-emerald-700/40 shadow-xs'
                : isDark
                ? 'bg-white/[0.01] border-white/5'
                : 'bg-stone-100/60 border-stone-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                  eatenMeals.dinner ? 'bg-emerald-600 text-white' : 'border border-stone-400'
                }`}
              >
                {eatenMeals.dinner && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Souper (Soir)
                </div>
                <div className="font-serif text-sm font-medium text-stone-900 dark:text-white">
                  {currentDayPlan.dinner.title}
                </div>
              </div>
            </div>
            <div className="text-right font-mono tabular-nums text-xs">
              <div className="text-stone-900 dark:text-white">{currentDayPlan.dinner.caloriesPerServing} kcal</div>
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold">{currentDayPlan.dinner.proteinPerServing}g prot</div>
            </div>
          </div>

          {/* Collation */}
          <div
            onClick={() => toggleMeal('snack')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              eatenMeals.snack
                ? isDark
                  ? 'bg-white/[0.06] border-emerald-500/40'
                  : 'bg-white border-emerald-700/40 shadow-xs'
                : isDark
                ? 'bg-white/[0.01] border-white/5'
                : 'bg-stone-100/60 border-stone-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                  eatenMeals.snack ? 'bg-emerald-600 text-white' : 'border border-stone-400'
                }`}
              >
                {eatenMeals.snack && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Collation
                </div>
                <div className="font-serif text-sm font-medium text-stone-900 dark:text-white">
                  {currentDayPlan.snack.title}
                </div>
              </div>
            </div>
            <div className="text-right font-mono tabular-nums text-xs">
              <div className="text-stone-900 dark:text-white">{currentDayPlan.snack.caloriesPerServing} kcal</div>
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold">{currentDayPlan.snack.proteinPerServing}g prot</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ajout d'extras */}
      <div className={`rounded-3xl p-6 sm:p-8 transition-all border ${cardGlassClass}`}>
        <h3 className="font-serif text-xl font-normal text-stone-900 dark:text-white mb-3">
          Ajouter une collation libre ou extra
        </h3>

        <form onSubmit={handleAddExtra} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <input
            type="text"
            placeholder="Nom (ex: 2 œufs durs, poignée d'amandes...)"
            value={extraName}
            onChange={(e) => setExtraName(e.target.value)}
            className={`sm:col-span-2 px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
            }`}
          />
          <input
            type="number"
            placeholder="Calories (kcal)"
            value={extraCals}
            onChange={(e) => setExtraCals(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
            }`}
          />
          <input
            type="number"
            placeholder="Protéines (g)"
            value={extraProt}
            onChange={(e) => setExtraProt(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
            }`}
          />
          <div className="sm:col-span-4 flex justify-end">
            <button
              type="submit"
              className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold ${
                isDark ? 'bg-white text-stone-950 hover:bg-stone-200' : 'bg-stone-900 text-stone-50 hover:bg-stone-800'
              }`}
            >
              Enregistrer
            </button>
          </div>
        </form>

        {customEntries.length > 0 && (
          <div className="mt-4 pt-3 border-t border-stone-200/50 dark:border-white/10 space-y-2">
            <span className="text-xs font-mono text-stone-400">Extras enregistrés :</span>
            {customEntries.map((item) => (
              <div
                key={item.id}
                className={`flex justify-between items-center text-xs p-2.5 rounded-xl border font-mono ${
                  isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-stone-200'
                }`}
              >
                <span className="text-stone-900 dark:text-white">{item.name}</span>
                <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{item.calories} kcal • +{item.protein}g prot
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
