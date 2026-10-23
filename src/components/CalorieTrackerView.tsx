'use client';

import React, { useState } from 'react';
import { DayPlan, UserCustomizationSettings } from '@/types';
import { Flame, Dumbbell, Wheat, Droplet, Plus, Check, Circle, Trophy, AlertCircle, Apple } from 'lucide-react';

interface CalorieTrackerViewProps {
  currentDayPlan: DayPlan;
  userSettings?: UserCustomizationSettings;
  isDark: boolean;
}

interface CustomEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
}

export const CalorieTrackerView: React.FC<CalorieTrackerViewProps> = ({ currentDayPlan, userSettings, isDark }) => {
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
  const [extraCarbs, setExtraCarbs] = useState('');
  const [extraFat, setExtraFat] = useState('');

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
      carbs: parseInt(extraCarbs) || 0,
      fat: parseInt(extraFat) || 0,
    };
    setCustomEntries((prev) => [...prev, newEntry]);
    setExtraName('');
    setExtraCals('');
    setExtraProt('');
    setExtraCarbs('');
    setExtraFat('');
  };

  let consumedCalories = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;

  if (eatenMeals.breakfast) {
    consumedCalories += currentDayPlan.breakfast.caloriesPerServing;
    consumedProtein += currentDayPlan.breakfast.proteinPerServing;
    consumedCarbs += currentDayPlan.breakfast.carbsPerServing;
    consumedFat += currentDayPlan.breakfast.fatPerServing;
  }
  if (eatenMeals.lunch) {
    consumedCalories += currentDayPlan.lunch.caloriesPerServing;
    consumedProtein += currentDayPlan.lunch.proteinPerServing;
    consumedCarbs += currentDayPlan.lunch.carbsPerServing;
    consumedFat += currentDayPlan.lunch.fatPerServing;
  }
  if (eatenMeals.dinner) {
    consumedCalories += currentDayPlan.dinner.caloriesPerServing;
    consumedProtein += currentDayPlan.dinner.proteinPerServing;
    consumedCarbs += currentDayPlan.dinner.carbsPerServing;
    consumedFat += currentDayPlan.dinner.fatPerServing;
  }
  if (eatenMeals.snack) {
    consumedCalories += currentDayPlan.snack.caloriesPerServing;
    consumedProtein += currentDayPlan.snack.proteinPerServing;
    consumedCarbs += currentDayPlan.snack.carbsPerServing;
    consumedFat += currentDayPlan.snack.fatPerServing;
  }

  for (const extra of customEntries) {
    consumedCalories += extra.calories;
    consumedProtein += extra.protein;
    consumedCarbs += extra.carbs || 0;
    consumedFat += extra.fat || 0;
  }

  const targetCalories = userSettings?.targetCalories ?? 3050;
  const targetProtein = userSettings?.targetProtein ?? 165;
  const targetCarbs = userSettings?.targetCarbs ?? 390;
  const targetFat = userSettings?.targetFat ?? 90;

  const calPercent = Math.min(100, Math.round((consumedCalories / targetCalories) * 100));
  const protPercent = Math.min(100, Math.round((consumedProtein / targetProtein) * 100));
  const carbsPercent = Math.min(100, Math.round((consumedCarbs / targetCarbs) * 100));
  const fatPercent = Math.min(100, Math.round((consumedFat / targetFat) * 100));

  const cardGlassClass = isDark ? 'liquid-glass' : 'liquid-glass-light';

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Anneaux Métaboliques Apple Fitness+ */}
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-8 transition-all border ${cardGlassClass}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-700 dark:text-stone-300 font-semibold">
                Suivi Nutritionnel • {currentDayPlan.dayName}
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-4xl font-normal tracking-tight text-stone-900 dark:text-white">
              Activité & <span className="italic">Métabolisme</span>
            </h1>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-2 font-sans">
              Consignez vos repas consommés en direct pour maintenir votre progression de prise de masse.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {protPercent >= 100 ? (
              <div className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-2xl bg-stone-900 text-stone-50 dark:bg-white dark:text-stone-950 border border-stone-800 dark:border-white text-xs font-mono font-semibold shadow-xs">
                <Trophy className="w-4 h-4 text-stone-300 dark:text-stone-700 shrink-0" />
                <span>Objectif Protéines Atteint !</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 text-xs font-mono font-semibold">
                <AlertCircle className="w-4 h-4 text-stone-600 dark:text-stone-400 shrink-0" />
                <span>Reste {Math.max(0, targetProtein - consumedProtein)} g de protéines</span>
              </div>
            )}
          </div>
        </div>

        {/* Jauges Apple Activity Style (Monochrome & Graphite - 4 Piliers) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-stone-200/60 dark:border-white/10">
          {/* 1. Énergie / Calories */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-black/30 border-white/5' : 'bg-white border-stone-200 shadow-xs'
            }`}
          >
            <div className="flex justify-between items-center mb-2 font-mono text-xs">
              <span className="text-stone-700 dark:text-stone-300 flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                <Flame className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300" /> Calories
              </span>
              <span className="tabular-nums font-semibold text-stone-950 dark:text-white">
                {consumedCalories} / {targetCalories} ({calPercent}%)
              </span>
            </div>
            <div className="h-2 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className="bg-stone-800 dark:bg-stone-200 h-full transition-all duration-300 rounded-full"
                style={{ width: `${calPercent}%` }}
              />
            </div>
          </div>

          {/* 2. Protéines */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-black/30 border-white/5' : 'bg-white border-stone-200 shadow-xs'
            }`}
          >
            <div className="flex justify-between items-center mb-2 font-mono text-xs">
              <span className="text-stone-700 dark:text-stone-300 flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                <Dumbbell className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300" /> Protéines
              </span>
              <span className="tabular-nums font-semibold text-stone-950 dark:text-white">
                {consumedProtein} / {targetProtein}g ({protPercent}%)
              </span>
            </div>
            <div className="h-2 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className="bg-stone-950 dark:bg-white h-full transition-all duration-300 rounded-full"
                style={{ width: `${protPercent}%` }}
              />
            </div>
          </div>

          {/* 3. Glucides */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-black/30 border-white/5' : 'bg-white border-stone-200 shadow-xs'
            }`}
          >
            <div className="flex justify-between items-center mb-2 font-mono text-xs">
              <span className="text-stone-700 dark:text-stone-300 flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                <Wheat className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300" /> Glucides
              </span>
              <span className="tabular-nums font-semibold text-stone-950 dark:text-white">
                {consumedCarbs} / {targetCarbs}g ({carbsPercent}%)
              </span>
            </div>
            <div className="h-2 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className="bg-stone-600 dark:bg-stone-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${carbsPercent}%` }}
              />
            </div>
          </div>

          {/* 4. Lipides */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-black/30 border-white/5' : 'bg-white border-stone-200 shadow-xs'
            }`}
          >
            <div className="flex justify-between items-center mb-2 font-mono text-xs">
              <span className="text-stone-700 dark:text-stone-300 flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                <Droplet className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300" /> Lipides
              </span>
              <span className="tabular-nums font-semibold text-stone-950 dark:text-white">
                {consumedFat} / {targetFat}g ({fatPercent}%)
              </span>
            </div>
            <div className="h-2 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className="bg-stone-500 dark:bg-stone-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${fatPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Repas du Jour */}
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-8 transition-all border ${cardGlassClass}`}>
        <h2 className="font-serif text-xl sm:text-2xl font-normal text-stone-900 dark:text-white mb-4">
          Repas de la Journée <span className="italic">({currentDayPlan.dayName})</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
          {/* Déjeuner */}
          <div
            onClick={() => toggleMeal('breakfast')}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 ${
              eatenMeals.breakfast
                ? isDark
                  ? 'bg-white/[0.08] border-white/30 ring-1 ring-white/20'
                  : 'bg-white border-stone-800 ring-1 ring-stone-800 shadow-xs'
                : isDark
                ? 'bg-white/[0.01] border-white/5 hover:border-white/15'
                : 'bg-stone-50 border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
                  eatenMeals.breakfast ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs' : 'border-2 border-stone-400'
                }`}
              >
                {eatenMeals.breakfast && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-wider text-stone-600 dark:text-stone-400 font-medium">
                  Déjeuner
                </div>
                <div className="font-serif text-sm font-medium text-stone-900 dark:text-white truncate">
                  {currentDayPlan.breakfast.title}
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60 dark:border-white/5 font-mono tabular-nums text-xs shrink-0">
              <div className="text-stone-700 dark:text-stone-300">{currentDayPlan.breakfast.caloriesPerServing} kcal</div>
              <div className="text-stone-950 dark:text-white font-semibold">
                {currentDayPlan.breakfast.proteinPerServing}g P • {currentDayPlan.breakfast.carbsPerServing}g G • {currentDayPlan.breakfast.fatPerServing}g L
              </div>
            </div>
          </div>

          {/* Dîner */}
          <div
            onClick={() => toggleMeal('lunch')}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 ${
              eatenMeals.lunch
                ? isDark
                  ? 'bg-white/[0.08] border-white/30 ring-1 ring-white/20'
                  : 'bg-white border-stone-800 ring-1 ring-stone-800 shadow-xs'
                : isDark
                ? 'bg-white/[0.01] border-white/5 hover:border-white/15'
                : 'bg-stone-50 border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
                  eatenMeals.lunch ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs' : 'border-2 border-stone-400'
                }`}
              >
                {eatenMeals.lunch && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-wider text-stone-600 dark:text-stone-400 font-medium">
                  Dîner (Midi)
                </div>
                <div className="font-serif text-sm font-medium text-stone-900 dark:text-white truncate">
                  {currentDayPlan.lunch.title}
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60 dark:border-white/5 font-mono tabular-nums text-xs shrink-0">
              <div className="text-stone-700 dark:text-stone-300">{currentDayPlan.lunch.caloriesPerServing} kcal</div>
              <div className="text-stone-950 dark:text-white font-semibold">
                {currentDayPlan.lunch.proteinPerServing}g P • {currentDayPlan.lunch.carbsPerServing}g G • {currentDayPlan.lunch.fatPerServing}g L
              </div>
            </div>
          </div>

          {/* Souper */}
          <div
            onClick={() => toggleMeal('dinner')}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 ${
              eatenMeals.dinner
                ? isDark
                  ? 'bg-white/[0.08] border-white/30 ring-1 ring-white/20'
                  : 'bg-white border-stone-800 ring-1 ring-stone-800 shadow-xs'
                : isDark
                ? 'bg-white/[0.01] border-white/5 hover:border-white/15'
                : 'bg-stone-50 border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
                  eatenMeals.dinner ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs' : 'border-2 border-stone-400'
                }`}
              >
                {eatenMeals.dinner && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-wider text-stone-600 dark:text-stone-400 font-medium">
                  Souper (Soir)
                </div>
                <div className="font-serif text-sm font-medium text-stone-900 dark:text-white truncate">
                  {currentDayPlan.dinner.title}
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60 dark:border-white/5 font-mono tabular-nums text-xs shrink-0">
              <div className="text-stone-700 dark:text-stone-300 font-medium">{currentDayPlan.dinner.caloriesPerServing} kcal</div>
              <div className="text-stone-950 dark:text-white font-semibold">
                {currentDayPlan.dinner.proteinPerServing}g P • {currentDayPlan.dinner.carbsPerServing}g G • {currentDayPlan.dinner.fatPerServing}g L
              </div>
            </div>
          </div>

          {/* Collation */}
          <div
            onClick={() => toggleMeal('snack')}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 ${
              eatenMeals.snack
                ? isDark
                  ? 'bg-white/[0.08] border-white/30 ring-1 ring-white/20'
                  : 'bg-white border-stone-800 ring-1 ring-stone-800 shadow-xs'
                : isDark
                ? 'bg-white/[0.01] border-white/5 hover:border-white/15'
                : 'bg-stone-50 border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
                  eatenMeals.snack ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs' : 'border-2 border-stone-400'
                }`}
              >
                {eatenMeals.snack && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-wider text-stone-600 dark:text-stone-400 font-medium">
                  Collation
                </div>
                <div className="font-serif text-sm font-medium text-stone-900 dark:text-white truncate">
                  {currentDayPlan.snack.title}
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60 dark:border-white/5 font-mono tabular-nums text-xs shrink-0">
              <div className="text-stone-700 dark:text-stone-300">{currentDayPlan.snack.caloriesPerServing} kcal</div>
              <div className="text-stone-950 dark:text-white font-semibold">
                {currentDayPlan.snack.proteinPerServing}g P • {currentDayPlan.snack.carbsPerServing}g G • {currentDayPlan.snack.fatPerServing}g L
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ajout d'extras */}
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-8 transition-all border ${cardGlassClass}`}>
        <h3 className="font-serif text-xl font-normal text-stone-900 dark:text-white mb-3">
          Ajouter une collation libre ou extra
        </h3>

        <form onSubmit={handleAddExtra} className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
          <input
            type="text"
            placeholder="Nom (ex: 2 œufs durs, poignée d'amandes...)"
            value={extraName}
            onChange={(e) => setExtraName(e.target.value)}
            className={`sm:col-span-2 px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
              isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
            }`}
          />
          <input
            type="number"
            placeholder="Calories (kcal)"
            value={extraCals}
            onChange={(e) => setExtraCals(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
              isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
            }`}
          />
          <input
            type="number"
            placeholder="Prot (g)"
            value={extraProt}
            onChange={(e) => setExtraProt(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
              isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
            }`}
          />
          <input
            type="number"
            placeholder="Gluc (g)"
            value={extraCarbs}
            onChange={(e) => setExtraCarbs(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
              isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
            }`}
          />
          <input
            type="number"
            placeholder="Lip (g)"
            value={extraFat}
            onChange={(e) => setExtraFat(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
              isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
            }`}
          />
          <div className="sm:col-span-6 flex justify-end">
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
            <span className="text-xs font-mono text-stone-500 dark:text-stone-400">Extras enregistrés :</span>
            {customEntries.map((item) => (
              <div
                key={item.id}
                className={`flex justify-between items-center text-xs p-2.5 rounded-xl border font-mono ${
                  isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-stone-200 shadow-xs'
                }`}
              >
                <span className="text-stone-900 dark:text-white">{item.name}</span>
                <span className="text-stone-700 dark:text-stone-300 tabular-nums font-semibold">
                  +{item.calories} kcal • +{item.protein}g P • +{item.carbs || 0}g G • +{item.fat || 0}g L
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
