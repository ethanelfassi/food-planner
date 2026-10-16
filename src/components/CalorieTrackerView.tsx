'use client';

import React, { useState } from 'react';
import { DayPlan } from '@/types';
import { Flame, Dumbbell, Plus, CheckCircle2, Circle, Trophy, AlertCircle, Apple } from 'lucide-react';

interface CalorieTrackerViewProps {
  currentDayPlan: DayPlan;
}

interface CustomEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
}

export const CalorieTrackerView: React.FC<CalorieTrackerViewProps> = ({ currentDayPlan }) => {
  // État des repas cochés
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

  // Calculs actuels
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

  // Ajouter extras
  for (const extra of customEntries) {
    consumedCalories += extra.calories;
    consumedProtein += extra.protein;
  }

  const targetCalories = 3050;
  const targetProtein = 165;
  const calPercent = Math.min(100, Math.round((consumedCalories / targetCalories) * 100));
  const protPercent = Math.min(100, Math.round((consumedProtein / targetProtein) * 100));

  return (
    <div className="space-y-6">
      {/* En-tête Tracker */}
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Suivi Nutritionnel En Direct
              </span>
              <span className="text-xs text-slate-400">Prise de Masse • {currentDayPlan.dayName}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Calorie & Macro Tracker Intégré
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Cochez vos repas consommés aujourd'hui ou ajoutez vos extras pour suivre précisément vos calories et protéines vers votre cible de 3 050 kcal.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {protPercent >= 100 ? (
              <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-bold">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span>Objectif Protéines Atteint !</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-amber-500/10 text-amber-300 border border-amber-500/20 px-3.5 py-2 rounded-xl text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Encore {Math.max(0, targetProtein - consumedProtein)}g de protéines</span>
              </div>
            )}
          </div>
        </div>

        {/* Jauges Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-800">
          {/* Jauge Calories */}
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <Flame className="w-4 h-4 text-amber-400" /> Calories consommées
              </span>
              <span className="text-xs font-bold text-amber-300">
                {consumedCalories} / {targetCalories} kcal ({calPercent}%)
              </span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300"
                style={{ width: `${calPercent}%` }}
              />
            </div>
          </div>

          {/* Jauge Protéines */}
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <Dumbbell className="w-4 h-4 text-emerald-400" /> Protéines consommées
              </span>
              <span className="text-xs font-bold text-emerald-300">
                {consumedProtein} / {targetProtein} g ({protPercent}%)
              </span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
                style={{ width: `${protPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Repas du Jour à Cocher */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Apple className="w-4 h-4 text-emerald-400" />
          <span>Repas prévus aujourd'hui ({currentDayPlan.dayName})</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Déjeuner */}
          <div
            onClick={() => toggleMeal('breakfast')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              eatenMeals.breakfast
                ? 'bg-slate-950/60 border-emerald-500/50 shadow-sm'
                : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {eatenMeals.breakfast ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Circle className="w-5 h-5 text-slate-600" />
              )}
              <div>
                <div className="text-xs font-bold uppercase text-amber-400">Déjeuner</div>
                <div className={`text-sm font-semibold ${eatenMeals.breakfast ? 'text-white' : 'text-slate-400'}`}>
                  {currentDayPlan.breakfast.title}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 ml-2 text-xs">
              <div className="font-bold text-amber-300">{currentDayPlan.breakfast.caloriesPerServing} kcal</div>
              <div className="font-semibold text-emerald-400">{currentDayPlan.breakfast.proteinPerServing}g prot</div>
            </div>
          </div>

          {/* Dîner (Midi) */}
          <div
            onClick={() => toggleMeal('lunch')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              eatenMeals.lunch
                ? 'bg-slate-950/60 border-emerald-500/50 shadow-sm'
                : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {eatenMeals.lunch ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Circle className="w-5 h-5 text-slate-600" />
              )}
              <div>
                <div className="text-xs font-bold uppercase text-sky-400">Dîner (Midi)</div>
                <div className={`text-sm font-semibold ${eatenMeals.lunch ? 'text-white' : 'text-slate-400'}`}>
                  {currentDayPlan.lunch.title}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 ml-2 text-xs">
              <div className="font-bold text-amber-300">{currentDayPlan.lunch.caloriesPerServing} kcal</div>
              <div className="font-semibold text-emerald-400">{currentDayPlan.lunch.proteinPerServing}g prot</div>
            </div>
          </div>

          {/* Souper (Soir) */}
          <div
            onClick={() => toggleMeal('dinner')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              eatenMeals.dinner
                ? 'bg-slate-950/60 border-emerald-500/50 shadow-sm'
                : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {eatenMeals.dinner ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Circle className="w-5 h-5 text-slate-600" />
              )}
              <div>
                <div className="text-xs font-bold uppercase text-purple-400">Souper (Soir)</div>
                <div className={`text-sm font-semibold ${eatenMeals.dinner ? 'text-white' : 'text-slate-400'}`}>
                  {currentDayPlan.dinner.title}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 ml-2 text-xs">
              <div className="font-bold text-amber-300">{currentDayPlan.dinner.caloriesPerServing} kcal</div>
              <div className="font-semibold text-emerald-400">{currentDayPlan.dinner.proteinPerServing}g prot</div>
            </div>
          </div>

          {/* Collation */}
          <div
            onClick={() => toggleMeal('snack')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              eatenMeals.snack
                ? 'bg-slate-950/60 border-emerald-500/50 shadow-sm'
                : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {eatenMeals.snack ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Circle className="w-5 h-5 text-slate-600" />
              )}
              <div>
                <div className="text-xs font-bold uppercase text-rose-400">Collation</div>
                <div className={`text-sm font-semibold ${eatenMeals.snack ? 'text-white' : 'text-slate-400'}`}>
                  {currentDayPlan.snack.title}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 ml-2 text-xs">
              <div className="font-bold text-amber-300">{currentDayPlan.snack.caloriesPerServing} kcal</div>
              <div className="font-semibold text-emerald-400">{currentDayPlan.snack.proteinPerServing}g prot</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ajout d'un Extra / Aliment Libre */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Ajouter un aliment libre ou extra hors-menu</span>
        </h2>

        <form onSubmit={handleAddExtra} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <input
            type="text"
            placeholder="Nom (ex: 2 œufs durs, poignée d'amandes...)"
            value={extraName}
            onChange={(e) => setExtraName(e.target.value)}
            className="sm:col-span-2 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          <input
            type="number"
            placeholder="Calories (kcal)"
            value={extraCals}
            onChange={(e) => setExtraCals(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          <input
            type="number"
            placeholder="Protéines (g)"
            value={extraProt}
            onChange={(e) => setExtraProt(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          <div className="sm:col-span-4 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
            >
              Enregistrer l'extra
            </button>
          </div>
        </form>

        {customEntries.length > 0 && (
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <span className="text-xs text-slate-400 font-medium">Extras ajoutés :</span>
            {customEntries.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-xs bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-200">{item.name}</span>
                <span className="font-semibold text-emerald-400">
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
